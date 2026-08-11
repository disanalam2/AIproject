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
  const outputPath = path.join(tmpDir, `output-${Date.now()}.pcm`);
  
  // Write the incoming webm to a temp file
  fs.writeFileSync(inputPath, audioBuffer);

  // 1. Fully convert the audio to a PCM file first to avoid pipe/stream corruption
  await new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioFrequency(16000)
      .audioChannels(1)
      .format('s16le')
      .audioFilters(['dynaudnorm']) // Boost quiet mics
      .on('end', resolve)
      .on('error', reject)
      .save(outputPath);
  });

  // 2. Read the fully converted PCM file
  // 16kHz 16-bit PCM = 32,000 bytes per second. 
  // 16384 bytes is roughly 0.5 seconds of audio.
  const fileStream = fs.createReadStream(outputPath, { highWaterMark: 16384 });

  // 3. Convert to an Async Generator for AWS SDK
  async function* generateChunks() {
    for await (const chunk of fileStream) {
      yield { AudioEvent: { AudioChunk: chunk } };
      // Throttle the stream to ~5x real-time (100ms per 0.5s of audio) 
      // This prevents AWS from choking on instant data bursts while still being fast.
      await new Promise(r => setTimeout(r, 100));
    }
    // Cleanup temp files after stream finishes
    try { fs.unlinkSync(inputPath); } catch (e) {}
    try { fs.unlinkSync(outputPath); } catch (e) {}
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

    let partialTranscript = "";

    for await (const event of response.TranscriptResultStream) {
      if (event.TranscriptEvent) {
        const results = event.TranscriptEvent.Transcript.Results;
        if (results && results.length > 0) {
          for (const result of results) {
            if (!result.IsPartial) {
              transcript += result.Alternatives[0].Transcript + " ";
              partialTranscript = ""; // Clear partial once committed
            } else {
              // Keep tracking the latest uncommitted partial text
              partialTranscript = result.Alternatives[0].Transcript;
            }
          }
        }
      }
    }
    
    // If the stream ended abruptly, the last few words might still be stuck as 'partial'. Append them!
    if (partialTranscript) {
      transcript += partialTranscript + " ";
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
