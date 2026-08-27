const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const prisma = require('./prismaClient');
const llmService = require('./services/llmService');
const awsService = require('./services/awsService');
const http = require('http');
const WebSocket = require('ws');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());


const PORT = process.env.PORT || 5001;

// Webhook for Amazon Lex
app.post('/api/lex-webhook', async (req, res) => {
    try {
        console.log("Received event from Lex:", JSON.stringify(req.body, null, 2));
        const inputTranscript = req.body.inputTranscript || "";
        const sessionState = req.body.sessionState || {};
        const intent = sessionState.intent || {};
        const intentName = intent.name || "Unknown";

        // 1. Process transcript dynamically via LangChain Agent
        const llmResponse = await llmService.processIntent(inputTranscript, intentName);

        // 2. Log the call
        const logEntry = await prisma.callLog.create({
            data: {
                phoneNumber: req.body.sessionId || "Unknown",
                transcript: inputTranscript,
                intent: intentName,
            }
        });

        // 3. Sync to Google Sheets for Human Review (Feature 16)
        const sheetsIntegration = require('./services/sheetsIntegration');
        await sheetsIntegration.appendToGoogleSheet(logEntry);

        // 4. Return Lex V2 formatted response
        res.json({
            sessionState: {
                sessionAttributes: sessionState.sessionAttributes || {},
                dialogAction: {
                    type: 'ElicitIntent'
                }
            },
            messages: [
                {
                    contentType: 'PlainText',
                    content: llmResponse || "I have processed your request."
                }
            ]
        });
    } catch (error) {
        console.error("Webhook Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

const outboundService = require('./services/outboundService');

// API for Outbound Features (Webhooks)
app.post('/api/webhook/missed-call', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber) return res.status(400).json({ error: "Phone number required" });
        const result = await outboundService.handleMissedCall(phoneNumber);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: "Failed to process missed call webhook" });
    }
});

app.post('/api/trigger/reminders', async (req, res) => {
    try {
        const result = await outboundService.runDailyReminders();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: "Failed to trigger reminders" });
    }
});

app.post('/api/trigger/re-engage', async (req, res) => {
    try {
        const result = await outboundService.reEngageInactivePatients();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: "Failed to trigger re-engagement" });
    }
});

// API for Dashboard to fetch call logs
app.get('/api/logs', async (req, res) => {
    try {
        const logs = await prisma.callLog.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch logs" });
    }
});

app.get('/api/appointments', async (req, res) => {
    try {
        const count = await prisma.appointment.count();
        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch appointments count" });
    }
});

const jwt = require('jsonwebtoken');
const authMiddleware = require('./middleware/authMiddleware');
const configService = require('./services/configService');

// Auth Route
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        const payload = { user: { username } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.json({ token });
        });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Settings Routes (Protected)
app.get('/api/settings', authMiddleware, async (req, res) => {
    try {
        const config = await configService.getConfiguration();
        // Do not return secrets to the frontend unless absolutely necessary, but since it's an admin panel we might return masked versions or just not return them and only allow overwriting.
        // For simplicity, we just return the active configurations.
        res.json(config);
    } catch (error) {
        res.status(500).json({ error: "Server Error" });
    }
});

app.post('/api/settings', authMiddleware, async (req, res) => {
    try {
        const { config, secrets } = req.body;
        if (config) await configService.setConfiguration(config);
        if (secrets) await configService.setSecrets(secrets);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server Error" });
    }
});

// Chime Meeting stub
app.post('/api/chime/meeting', async (req, res) => {
    try {
        // Normally, you would use AWS SDK Chime client to create a meeting and attendee:
        // const meeting = await chime.createMeeting(...).promise();
        // const attendee = await chime.createAttendee(...).promise();
        
        // Returning a mock response for now to allow UI to flow without crashing
        res.json({
            Meeting: { MeetingId: "mock-meeting-id" },
            Attendee: { AttendeeId: "mock-attendee-id", JoinToken: "mock-token" }
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to create meeting" });
    }
});

const server = http.createServer(app);
const audioService = require('./services/audioService');

// WebSocket for Chime audio streaming (simulated Lex bypass)
const wss = new WebSocket.Server({ server });
wss.on('connection', (ws) => {
    console.log('Client connected for audio streaming');
    
    // Pipe the WebSocket stream to AWS Transcribe Medical via our audioService
    audioService.processAudioStream(ws);

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
