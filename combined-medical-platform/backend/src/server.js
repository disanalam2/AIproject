import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';
import http from 'http';
import { WebSocketServer } from 'ws';

// Prisma Client
import prisma from './prismaClient.js';

// AI Scriber Services
import { transcribeAudio } from './modules/scriber/services/sttService.js';
import { summarizeTranscript } from './modules/scriber/services/llmService.js';
import { extractICD10Codes } from './modules/scriber/services/nlpFactory.js';
import { synthesizeSpeech as synthesizeSpeechScriber } from './modules/core/services/ttsFactory.js';

// AI Receptionist Services
import * as builderFactory from './modules/receptionist/services/builderFactory.js';
import * as sheetsIntegration from './modules/receptionist/services/sheetsIntegration.js';
import * as outboundService from './modules/receptionist/services/outboundService.js';
import * as configService from './modules/core/services/configService.js';
import * as audioService from './modules/receptionist/services/audioService.js';
import doctorRoutes from './modules/receptionist/routes/doctorRoutes.js';

// Middleware
import authMiddleware from './modules/core/middleware/authMiddleware.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { ChimeSDKMeetingsClient, CreateMeetingCommand, CreateAttendeeCommand } from '@aws-sdk/client-chime-sdk-meetings';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(helmet());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again after 15 minutes' }
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// ==========================================
// AI Scriber Routes
// ==========================================

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = os.tmpdir();
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, `upload-${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage: storage });

app.get('/api/admin/tenants', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'master_admin') return res.status(403).json({ error: "Access denied" });
        const tenants = await prisma.tenant.findMany({
            include: { users: true, phoneNumbers: true, patients: true }
        });
        res.json(tenants);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch tenants" });
    }
});

app.post('/api/scribe', authMiddleware, upload.single('audio'), async (req, res) => {
  try {
    console.log("Scribe API hit");
    if (!req.file) return res.status(400).json({ error: 'No audio provided' });

    const transcript = await transcribeAudio(req.file.path);
    const billingCodes = await extractICD10Codes(transcript);
    
    let searchKeywords = null;
    if (billingCodes && billingCodes.length > 0) {
      searchKeywords = billingCodes.map(bc => bc.condition).join(" ");
    }

    const summaryJson = await summarizeTranscript(transcript, searchKeywords);

    try {
      const note = await prisma.note.create({
        data: {
          tenantId: req.user.tenantId,
          transcript: transcript,
          subjective: summaryJson.subjective_complaints || null,
          objective: summaryJson.objective_symptoms || null,
          assessment: summaryJson.assessment || null,
          lifestyle_advice: summaryJson.lifestyle_advice || null,
          medications: summaryJson.medications ? JSON.stringify(summaryJson.medications) : null,
          billing_codes: billingCodes && billingCodes.length > 0 ? JSON.stringify(billingCodes) : null,
        }
      });
      
      await prisma.auditLog.create({
        data: {
          tenantId: req.user.tenantId,
          action: "NOTE_GENERATED",
          entityType: "Note",
          entityId: note.id,
          details: JSON.stringify({ action: "Generated from audio upload" })
        }
      });
    } catch (dbError) {
      console.error("Prisma Database Error:", dbError);
    }
  
    res.json({ transcript, summary: summaryJson, billing_codes: billingCodes });
  } catch (error) {
    console.error("API ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tts', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required for TTS' });

    const audioBase64 = await synthesizeSpeechScriber(text);
    res.json({ audioBase64 });
  } catch (error) {
    console.error("TTS API ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/notes/save', authMiddleware, async (req, res) => {
  try {
    const { patientId, transcript, summary, billing_codes } = req.body;
    if (!patientId) return res.status(400).json({ error: 'Patient ID is required' });

    const note = await prisma.note.create({
      data: {
        tenantId: req.user.tenantId,
        patientId: parseInt(patientId),
        transcript: transcript,
        subjective: summary.subjective_complaints || null,
        objective: summary.objective_symptoms || null,
        assessment: summary.assessment || null,
        lifestyle_advice: summary.lifestyle_advice || null,
        medications: summary.medications ? JSON.stringify(summary.medications) : null,
        billing_codes: billing_codes ? JSON.stringify(billing_codes) : null,
      }
    });

    await prisma.auditLog.create({
      data: { 
        tenantId: req.user.tenantId,
        action: "NOTE_SAVED", 
        entityType: "Note", 
        entityId: note.id, 
        details: JSON.stringify({ patientId }) 
      }
    });

    res.json({ success: true, noteId: note.id });
  } catch (error) {
    console.error("Save Note Error:", error);
    res.status(500).json({ error: error.message });
  }
});


// ==========================================
// AI Receptionist Routes
// ==========================================

app.post('/api/receptionist/call', async (req, res) => {
    // Legacy generic call trigger
    const response = await builderFactory.processUserUtterance('legacy-session', req.body.message);
    res.json(response);
});
app.use('/api/receptionist/doctors', doctorRoutes);

app.post('/api/webhook/:tenantId/lex', async (req, res) => {
    try {
        const tenantId = parseInt(req.params.tenantId);
        const inputTranscript = req.body.inputTranscript || "";
        const sessionState = req.body.sessionState || {};
        const intentName = sessionState.intent?.name || "Unknown";
        const sessionId = req.body.sessionId || "Unknown";

        const llmResponse = await builderFactory.processUserUtterance(sessionId, inputTranscript, intentName, tenantId);

        const logEntry = await prisma.callLog.create({
            data: { tenantId, phoneNumber: sessionId, transcript: inputTranscript, intent: intentName }
        });

        await sheetsIntegration.appendToGoogleSheet(logEntry);

        res.json({
            sessionState: {
                sessionAttributes: sessionState.sessionAttributes || {},
                dialogAction: { type: 'ElicitIntent' }
            },
            messages: [{ contentType: 'PlainText', content: llmResponse || "I have processed your request." }]
        });
    } catch (error) {
        console.error("Webhook Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.post('/api/webhook/:tenantId/dialogflow', async (req, res) => {
    try {
        const tenantId = parseInt(req.params.tenantId);
        const inputTranscript = req.body.queryResult?.queryText || "";
        const intentName = req.body.queryResult?.intent?.displayName || "Unknown";
        const sessionId = req.body.session || "Unknown";

        const llmResponse = await builderFactory.processUserUtterance(sessionId, inputTranscript, intentName, tenantId);

        const logEntry = await prisma.callLog.create({
            data: { tenantId, phoneNumber: sessionId, transcript: inputTranscript, intent: intentName }
        });

        await sheetsIntegration.appendToGoogleSheet(logEntry);

        res.json({ fulfillmentMessages: [{ text: { text: [llmResponse || "I have processed your request."] } }] });
    } catch (error) {
        console.error("Dialogflow Webhook Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.post('/api/webhook/:tenantId/missed-call', async (req, res) => {
    try {
        const tenantId = parseInt(req.params.tenantId);
        const { phoneNumber } = req.body;
        if (!phoneNumber) return res.status(400).json({ error: "Phone number required" });
        const result = await outboundService.handleMissedCall(phoneNumber, tenantId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: "Failed to process missed call webhook" });
    }
});

app.get('/api/logs', authMiddleware, async (req, res) => {
    try {
        const logs = await prisma.callLog.findMany({ 
            where: { tenantId: req.user.tenantId },
            orderBy: { createdAt: 'desc' } 
        });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch logs" });
    }
});

app.get('/api/appointments', authMiddleware, async (req, res) => {
    try {
        const count = await prisma.appointment.count({
            where: { tenantId: req.user.tenantId }
        });
        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch appointments count" });
    }
});

app.post('/api/auth/login', authLimiter, (req, res) => {
    const { username, password } = req.body;
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        const payload = { username, role: 'master_admin' };
        jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.json({ token });
        });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

app.post('/api/auth/client-login', authLimiter, async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await prisma.clientUser.findUnique({ where: { username }, include: { tenant: true } });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

        const payload = { username: user.username, tenantId: user.tenantId, role: 'client' };
        jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '12h' }, (err, token) => {
            if (err) throw err;
            res.json({ token, tenantId: user.tenantId, tenantName: user.tenant.name });
        });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/auth/patient-login', authLimiter, async (req, res) => {
    const { phone, tenantId, otp } = req.body;
    try {
        // Mock OTP check
        if (otp !== '1234') {
            return res.status(401).json({ error: 'Invalid OTP. Use 1234 for testing.' });
        }

        const patient = await prisma.patient.findFirst({
            where: { tenantId: parseInt(tenantId), phone: phone }
        });

        if (!patient) return res.status(404).json({ error: 'Patient not found in this hospital' });

        const payload = { patientId: patient.id, tenantId: patient.tenantId, role: 'patient' };
        jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '12h' }, (err, token) => {
            if (err) throw err;
            res.json({ token, patientId: patient.id });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

app.get('/api/tenant/resolve', async (req, res) => {
    try {
        const { domain } = req.query;
        if (!domain) return res.status(400).json({ error: "Domain is required" });

        const tenant = await prisma.tenant.findUnique({
            where: { domain }
        });

        if (!tenant) return res.status(404).json({ error: "Tenant not found for this domain" });

        res.json({ tenantId: tenant.id, name: tenant.name });
    } catch (error) {
        res.status(500).json({ error: "Failed to resolve tenant" });
    }
});

app.get('/api/patient/appointments', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'patient') return res.status(403).json({ error: "Access denied" });
        
        const patient = await prisma.patient.findUnique({ where: { id: req.user.patientId } });
        if (!patient || !patient.phone) return res.json([]);

        // Appointments are matched by phone currently
        const appointments = await prisma.appointment.findMany({
            where: { tenantId: req.user.tenantId, patientPhone: patient.phone },
            orderBy: { appointmentDate: 'desc' }
        });
        res.json(appointments);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch appointments" });
    }
});

app.get('/api/patient/notes', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'patient') return res.status(403).json({ error: "Access denied" });
        
        const notes = await prisma.note.findMany({
            where: { tenantId: req.user.tenantId, patientId: req.user.patientId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(notes);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch notes" });
    }
});

app.get('/api/settings', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'master_admin') return res.status(403).json({ error: "Access denied" });
        const config = await configService.getConfiguration();
        res.json(config);
    } catch (error) {
        res.status(500).json({ error: "Server Error" });
    }
});

app.post('/api/settings', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'master_admin') return res.status(403).json({ error: "Access denied" });
        const { config, secrets } = req.body;
        if (config) await configService.setConfiguration(config);
        if (secrets) await configService.setSecrets(secrets);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Server Error" });
    }
});

const chimeClient = new ChimeSDKMeetingsClient({ region: process.env.AWS_REGION || 'us-east-1' });

app.post('/api/chime/meeting', authMiddleware, async (req, res) => {
    try {
        const meetingResponse = await chimeClient.send(new CreateMeetingCommand({
            ClientRequestToken: Math.random().toString(36).substring(2),
            MediaRegion: process.env.AWS_REGION || 'us-east-1',
            ExternalMeetingId: `CityCare-${Date.now()}`
        }));
        
        const attendeeResponse = await chimeClient.send(new CreateAttendeeCommand({
            MeetingId: meetingResponse.Meeting.MeetingId,
            ExternalUserId: `Patient-${Date.now()}`
        }));

        res.json({ Meeting: meetingResponse.Meeting, Attendee: attendeeResponse.Attendee });
    } catch (error) {
        res.status(500).json({ error: "Failed to create meeting" });
    }
});

wss.on('connection', (ws) => {
    console.log('Client connected for audio streaming');
    audioService.processAudioStream(ws);
    ws.on('close', () => console.log('Client disconnected'));
});

// Auto-sync database on startup
try {
  console.log("Checking and syncing database (Prisma)...");
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
  console.log("Database synced successfully!");
} catch (error) {
  console.error("Failed to sync database automatically.", error.message);
}

server.listen(PORT, () => {
  console.log(`Unified Backend server is running on http://localhost:${PORT}`);
});
