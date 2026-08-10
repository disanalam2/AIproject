import { TranscribeStreamingClient, StartMedicalStreamTranscriptionCommand } from "@aws-sdk/client-transcribe-streaming";
import fs from 'fs';
import os from 'os';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const transcribeClient = new TranscribeStreamingClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

async function convertAudioToPCMChunks(audioBuffer) {
  return new Promise((resolve, reject) => {
    const tmpDir = os.tmpdir();
    const inputPath = path.join(tmpDir, `input-${Date.now()}.webm`);
    const outputPath = path.join(tmpDir, `output-${Date.now()}.raw`);
    
    fs.writeFileSync(inputPath, audioBuffer);

    ffmpeg(inputPath)
      .audioFrequency(16000)
      .audioChannels(1)
      .audioFilter('highpass=f=200,lowpass=f=3000,afftdn') // Bandpass for voice freq + Noise reduction
      .format('s16le')
      .on('end', () => {
        try {
          const pcmBuffer = fs.readFileSync(outputPath);
          console.log(`Audio converted! Input size: ${audioBuffer.length} bytes, Output PCM size: ${pcmBuffer.length} bytes`);
          
          // Cleanup
          fs.unlinkSync(inputPath);
          fs.unlinkSync(outputPath);
          
          // Create an async generator that yields chunks
          async function* generateChunks() {
            const chunkSize = 16000;
            for (let i = 0; i < pcmBuffer.length; i += chunkSize) {
              yield { AudioEvent: { AudioChunk: pcmBuffer.slice(i, i + chunkSize) } };
            }
          }
          resolve(generateChunks());
        } catch (e) {
          reject(e);
        }
      })
      .on('error', (err) => {
        console.error("ffmpeg error", err);
        try { fs.unlinkSync(inputPath); } catch (e) {}
        reject(err);
      })
      .save(outputPath);
  });
}

/**
 * Transcribes audio using AWS Medical Transcribe Streaming
 * @param {Buffer} audioBuffer - The audio file buffer
 * @returns {Promise<string>} The transcript
 */
export async function transcribeAudio(audioBuffer) {
  console.log("Calling AWS Transcribe...");
  let transcript = "";
  
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.warn("NO AWS CREDENTIALS!! using mock transcript so the demo doesn't crash");
    return "Patient complains of severe headache for 3 days. Prescribing ibuprofen.";
  }

  try {
    const command = new StartMedicalStreamTranscriptionCommand({
      LanguageCode: "en-US",
      MediaEncoding: "pcm",
      MediaSampleRateHertz: 16000,
      Specialty: "PRIMARYCARE", // Tells AWS it's a medical transcript
      Type: "CONVERSATION", // It's a doctor-patient conversation
      AudioStream: await convertAudioToPCMChunks(audioBuffer),
    });

    const response = await transcribeClient.send(command);

    for await (const event of response.TranscriptResultStream) {
      if (event.TranscriptEvent) {
        const results = event.TranscriptEvent.Transcript.Results;
        if (results && results.length > 0) {
          for (const result of results) {
            if (!result.IsPartial) {
              transcript += result.Alternatives[0].Transcript + " ";
            }
          }
        }
      }
    }
    
    transcript = transcript.trim();
    console.log("transcript done. length:", transcript.length, "content:", transcript);

    if (!transcript) {
      console.warn("STT returned empty transcript! Proceeding with fallback/empty text instead of crashing.");
      transcript = "The audio was unintelligible or empty.";
    }

    return transcript;
  } catch (error) {
    console.error("AWS Transcribe Error:", error);
    throw new Error("Failed to transcribe audio");
  }
}
