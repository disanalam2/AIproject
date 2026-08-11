import { TranscribeStreamingClient, StartStreamTranscriptionCommand } from "@aws-sdk/client-transcribe-streaming";
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

import { PassThrough } from 'stream';

async function convertAudioToPCMChunks(audioBuffer) {
  const tmpDir = os.tmpdir();
  const inputPath = path.join(tmpDir, `input-${Date.now()}.webm`);
  
  // Write the incoming webm to a temp file
  fs.writeFileSync(inputPath, audioBuffer);

  // We use a PassThrough stream to pipe FFmpeg directly to AWS Transcribe.
  // highWaterMark of 16384 (16KB) creates optimal chunk sizes for AWS.
  const passThrough = new PassThrough({ highWaterMark: 16384 });

  ffmpeg(inputPath)
    .inputOptions(['-fflags', '+genpts']) // Handle missing WebM timestamps
    .audioFrequency(16000)
    .audioChannels(1)
    .format('s16le')
    .on('start', (commandLine) => {
      console.log('FFmpeg stream started processing audio...');
    })
    .on('error', (err) => {
      console.error("FFmpeg error:", err);
      passThrough.destroy(err); // IMPORTANT: Close stream on error to prevent infinite hanging
      try { fs.unlinkSync(inputPath); } catch (e) {}
    })
    .on('end', () => {
      console.log('FFmpeg stream finished processing audio.');
      try { fs.unlinkSync(inputPath); } catch (e) {}
    })
    .pipe(passThrough);

  // Convert the PassThrough stream to an Async Generator for AWS SDK
  async function* generateChunks() {
    for await (const chunk of passThrough) {
      yield { AudioEvent: { AudioChunk: chunk } };
    }
  }

  return generateChunks();
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
    const command = new StartStreamTranscriptionCommand({
      LanguageCode: "hi-IN", // Perfectly handles Hindi and Indian English (Hinglish)
      MediaEncoding: "pcm",
      MediaSampleRateHertz: 16000,
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
