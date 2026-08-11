import Groq from 'groq-sdk';
import fs from 'fs';
import os from 'os';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Transcribes audio using Groq's blazing fast Whisper Large V3 API
 * This replaces AWS Transcribe Streaming because AWS Streaming is not designed 
 * for fast synchronous file uploads and fails on long (1-hour) conversations.
 * @param {Buffer} audioBuffer - The audio file buffer
 * @returns {Promise<string>} The transcript
 */
export async function transcribeAudio(audioBuffer) {
  console.log("Calling Groq Whisper API for transcription...");
  
  if (!process.env.GROQ_API_KEY) {
    console.warn("NO GROQ API KEY!! using mock transcript.");
    return "Patient complains of severe headache for 3 days. Prescribing ibuprofen.";
  }

  const tmpDir = os.tmpdir();
  const inputPath = path.join(tmpDir, `input-${Date.now()}.webm`);
  const outputPath = path.join(tmpDir, `output-${Date.now()}.mp3`); // Whisper loves mp3
  
  try {
    // 1. Write the incoming webm to a temp file
    fs.writeFileSync(inputPath, audioBuffer);

    // 2. Compress and convert audio to mp3 (solves 25MB limits for 1hr audio)
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioChannels(1)
        .audioBitrate('32k') // Highly compressed for long conversations
        .format('mp3')
        .on('end', resolve)
        .on('error', reject)
        .save(outputPath);
    });

    // 3. Send to Groq Whisper
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(outputPath),
      model: "whisper-large-v3-turbo", // turbo is faster and highly accurate for Indian English/Hindi
      response_format: "verbose_json",
      language: "hi", // Specify Hindi for Hinglish support
    });

    const transcriptText = transcription.text.trim();
    console.log("Groq Transcription done. Length:", transcriptText.length);

    // 4. Cleanup
    try { fs.unlinkSync(inputPath); } catch (e) {}
    try { fs.unlinkSync(outputPath); } catch (e) {}

    if (!transcriptText) {
      console.warn("Groq returned empty transcript.");
      return "The audio was unintelligible or empty.";
    }

    return transcriptText;

  } catch (error) {
    console.error("Groq Whisper Error:", error);
    try { fs.unlinkSync(inputPath); } catch (e) {}
    try { fs.unlinkSync(outputPath); } catch (e) {}
    throw new Error("Failed to transcribe audio with Groq");
  }
}
