import { NextResponse } from 'next/server';
import { TranscribeStreamingClient, StartMedicalStreamTranscriptionCommand } from "@aws-sdk/client-transcribe-streaming";
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PromptTemplate } from '@langchain/core/prompts';
import { PassThrough } from 'stream';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const transcribeClient = new TranscribeStreamingClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

import fs from 'fs';
import os from 'os';
import path from 'path';

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


export async function POST(req) {
  try {
    console.log("api hit"); // test log
    
    const formData = await req.formData();
    const audioFile = formData.get('audio');

    if (!audioFile) {
      console.log("no audio wtf");
      return NextResponse.json({ error: 'No audio bro' }, { status: 400 });
    }

    // Convert audio to buffer for AWS Transcribe
    // Got this snippet from stackoverflow lol
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    console.log("Calling AWS Transcribe...");
    let transcript = "";
    
    // fallback just in case
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.warn("NO CREDENTIALS!! using mock transcript so the demo doesn't crash");
      transcript = "Patient complains of severe headache for 3 days. Prescribing ibuprofen.";
    } else {
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
    }

    console.log("transcript done. length:", transcript.length, "content:", transcript);

    if (!transcript) {
      console.warn("STT returned empty transcript! Proceeding with fallback/empty text instead of crashing.");
      transcript = "The audio was unintelligible or empty.";
    }

    // Native Google Gemini Fetch (Bypassing Langchain to avoid AQ. key bug)
    console.log("Calling Google Gemini via fetch...");
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
    
    let summaryJson;
    if (!apiKey) {
      console.warn("no GEMINI API credentials. mocking response.");
      summaryJson = {
        subjective_complaints: "Severe headache.",
        objective_symptoms: "Patient looks tired.",
        assessment: "Tension headache.",
        lifestyle_advice: "Sleep.",
        medications: ["Ibuprofen"]
      };
    } else {
      const prompt = `
        You are an expert medical AI scribe. Read this clinical conversation transcript and strictly format it into a professional JSON SOAP note.
        Crucial Requirements:
        - Use standard clinical format and terminology.
        - Accurately capture all relative medical terms, diagnoses, dosages, frequencies, and anatomical locations.
        - Keys MUST be exactly: "subjective_complaints", "objective_symptoms", "assessment", "lifestyle_advice", "medications".
        - "medications" must be an array of strings (e.g., ["Ibuprofen 400mg PO TID"]).
        DO NOT USE MARKDOWN. OUTPUT ONLY RAW JSON.

        Transcript: ${transcript}
      `;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0, responseMimeType: "application/json" }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API Error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

      try {
        summaryJson = JSON.parse(rawContent);
      } catch (e) {
        console.error("failed to parse json. LLM hallucinated maybe?", rawContent);
        summaryJson = { error: "Failed to parse AI output" };
      }
    }

    console.log("Saving to Prisma MySQL database...");
    try {
      await prisma.note.create({
        data: {
          transcript: transcript,
          subjective: summaryJson.subjective_complaints || null,
          objective: summaryJson.objective_symptoms || null,
          assessment: summaryJson.assessment || null,
          lifestyle_advice: summaryJson.lifestyle_advice || null,
          medications: summaryJson.medications || null, // Prisma handles JSON natively
        }
      });
      console.log("Saved to database successfully via Prisma.");
    } catch (dbError) {
      console.error("Prisma Database Error:", dbError);
    }

    console.log("all done, sending response");
    
  
    return NextResponse.json({
      transcript: transcript,
      summary: summaryJson
    });

  } catch (error) {
    console.error("API ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
