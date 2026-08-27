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
        const llmResponse = await llmService.processIntent(sessionId, inputTranscript, intentName);

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

// Webhook for Google Dialogflow CX/ES
app.post('/api/dialogflow-webhook', async (req, res) => {
    try {
        console.log("Received event from Dialogflow:", JSON.stringify(req.body, null, 2));
        
        // Dialogflow formats its requests differently.
        const inputTranscript = req.body.queryResult?.queryText || "";
        const intentName = req.body.queryResult?.intent?.displayName || "Unknown";
        const sessionId = req.body.session || "Unknown";

        // 1. Process transcript dynamically via LangChain Agent
        const llmResponse = await llmService.processIntent(sessionId, inputTranscript, intentName);

        // 2. Log the call
        const logEntry = await prisma.callLog.create({
            data: {
                phoneNumber: sessionId,
                transcript: inputTranscript,
                intent: intentName,
            }
        });

        // 3. Sync to Google Sheets for Human Review
        const sheetsIntegration = require('./services/sheetsIntegration');
        await sheetsIntegration.appendToGoogleSheet(logEntry);

        // 4. Return Dialogflow formatted response
        res.json({
            fulfillmentMessages: [
                {
                    text: {
                        text: [llmResponse || "I have processed your request."]
                    }
                }
            ]
        });
    } catch (error) {
        console.error("Dialogflow Webhook Error:", error);
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

// Telephony Branching Routing
app.post('/api/telephony/connect', async (req, res) => {
    try {
        const config = await configService.getConfiguration();
        const activeTelephony = config.active_telephony || 'chime';

        if (activeTelephony === 'twilio') {
            const VoiceResponse = require('twilio').twiml.VoiceResponse;
            const twiml = new VoiceResponse();
            twiml.say({ voice: 'Polly.Joanna', language: 'en-US' }, 'Welcome to City Care. Please wait while we connect you to our medical AI assistant.');
            twiml.connect().stream({ url: 'wss://' + req.headers.host + '/api/telephony/stream' });
            res.type('text/xml');
            res.send(twiml.toString());
        } else if (activeTelephony === 'vapi') {
            // Vapi.ai expects a specific JSON payload for webhooks to route calls
            res.json({ 
                message: "Vapi connection instructions",
                assistantId: process.env.VAPI_ASSISTANT_ID || "mock-vapi-assistant",
                destination: { type: "sip", sipUri: "sip:vapi@sip.vapi.ai" }
            });
        } else if (activeTelephony === 'retell') {
            res.json({ 
                message: "Retell AI connection instructions", 
                agentId: process.env.RETELL_AGENT_ID || "mock-retell-agent",
                action: "connect"
            });
        } else if (activeTelephony === 'bland') {
            res.json({ 
                message: "Bland AI connection instructions", 
                voice_id: process.env.BLAND_VOICE_ID || "mock-bland-voice",
                transfer_to: "+1234567890"
            });
        } else if (activeTelephony === 'google') {
            // Google Voice via Dialogflow Phone Gateway typically routes automatically 
            // once connected, but here is a mock payload for custom SIP trunks:
            res.json({ 
                message: "Google Voice Gateway connection",
                sipUri: "sip:google@voice.google.com"
            });
        } else {
            // Default Chime behavior would normally redirect to the /api/chime/meeting route
            res.json({ message: "Chime SDK connection should use /api/chime/meeting" });
        }
    } catch (error) {
        console.error("Telephony routing error:", error);
        res.status(500).json({ error: "Failed to route telephony" });
    }
});

// Chime Meeting implementation
const { ChimeSDKMeetingsClient, CreateMeetingCommand, CreateAttendeeCommand } = require('@aws-sdk/client-chime-sdk-meetings');
const chimeClient = new ChimeSDKMeetingsClient({ region: process.env.AWS_REGION || 'us-east-1' });

app.post('/api/chime/meeting', async (req, res) => {
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

        res.json({
            Meeting: meetingResponse.Meeting,
            Attendee: attendeeResponse.Attendee
        });
    } catch (error) {
        console.error("Failed to create Chime meeting:", error);
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
