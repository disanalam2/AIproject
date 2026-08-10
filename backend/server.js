import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { transcribeAudio } from './services/awsTranscribe.js';
import { synthesizeSpeech } from './services/awsPolly.js';
import { summarizeTranscript } from './services/geminiSummarizer.js';
import prisma from './db/prismaClient.js';
import { execSync } from 'child_process';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Set up multer for audio upload in memory
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post('/api/scribe', upload.single('audio'), async (req, res) => {
  try {
    console.log("Scribe API hit");
    
    if (!req.file) {
      return res.status(400).json({ error: 'No audio provided' });
    }

    // 1. STT with AWS Transcribe
    const transcript = await transcribeAudio(req.file.buffer);

    // 2. Summarize with Google Gemini
    const summaryJson = await summarizeTranscript(transcript);

    // 3. Save to database using Prisma
    console.log("Saving to database...");
    try {
      await prisma.note.create({
        data: {
          transcript: transcript,
          subjective: summaryJson.subjective_complaints || null,
          objective: summaryJson.objective_symptoms || null,
          assessment: summaryJson.assessment || null,
          lifestyle_advice: summaryJson.lifestyle_advice || null,
          medications: summaryJson.medications ? JSON.stringify(summaryJson.medications) : null,
        }
      });
      console.log("Saved to database successfully via Prisma.");
    } catch (dbError) {
      console.error("Prisma Database Error:", dbError);
    }
  
    res.json({
      transcript: transcript,
      summary: summaryJson
    });

  } catch (error) {
    console.error("API ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tts', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }

    const audioBase64 = await synthesizeSpeech(text);

    res.json({
      audioBase64: audioBase64
    });

  } catch (error) {
    console.error("TTS API ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/notes/save', async (req, res) => {
  try {
    const { patientId, transcript, summary } = req.body;
    
    if (!patientId) {
      return res.status(400).json({ error: 'Patient ID is required' });
    }

    // Example implementation for saving an approved note
    // Usually you'd update an existing note or create a new one linked to the patient
    const note = await prisma.note.create({
      data: {
        patientId: parseInt(patientId), // assuming Patient ID is an integer in the schema
        transcript: transcript,
        subjective: summary.subjective_complaints || null,
        objective: summary.objective_symptoms || null,
        assessment: summary.assessment || null,
        lifestyle_advice: summary.lifestyle_advice || null,
        medications: summary.medications ? JSON.stringify(summary.medications) : null,
      }
    });

    res.json({ success: true, noteId: note.id });
  } catch (error) {
    console.error("Save Note Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Auto-sync database on startup
try {
  console.log("Checking and syncing database (Prisma)...");
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
  console.log("Database synced successfully!");
} catch (error) {
  console.error("Failed to sync database automatically. Make sure MySQL is running and DATABASE_URL in .env is correct.");
}

app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});
