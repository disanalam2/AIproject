import googleTextToSpeech from '@google-cloud/text-to-speech';
import { DeepgramClient }  from '@deepgram/sdk';
import speech  from '@google-cloud/speech';
import { PollyClient, SynthesizeSpeechCommand }  from '@aws-sdk/client-polly';
import { TranscribeStreamingClient, StartMedicalStreamTranscriptionCommand }  from '@aws-sdk/client-transcribe-streaming';
import * as configService from '../../core/services/configService.js';
import dotenv from 'dotenv';
dotenv.config();

// Default AWS Clients
const pollyClient = new PollyClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'mock',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'mock'
    }
});

function getTranscribeMedicalClient() {
    return new TranscribeStreamingClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'mock',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'mock'
        }
    });
}

// ---------------- TTS Branching ----------------
async function textToSpeech(text) {
    const config = await configService.getConfiguration();
    const activeTTS = config.active_tts || 'polly';

    try {
        if (activeTTS === 'google_tts') {
            console.log("[TTS: Google Cloud] Synthesizing speech...");
            const client = new googleTextToSpeech.TextToSpeechClient();
            
            const request = {
                input: { text: text },
                voice: { languageCode: 'en-US', name: 'en-US-Standard-C' },
                audioConfig: { audioEncoding: 'MP3' },
            };
            
            const [response] = await client.synthesizeSpeech(request);
            // Return buffer
            return response.audioContent;
        } else {
            console.log("[TTS: AWS Polly] Synthesizing speech...");
            const command = new SynthesizeSpeechCommand({
                Engine: "neural",
                LanguageCode: "en-US",
                OutputFormat: "mp3",
                Text: text,
                VoiceId: "Joanna"
            });
            const response = await pollyClient.send(command);
            return response.AudioStream;
        }
    } catch (error) {
        console.error("TTS Error:", error);
        throw error;
    }
}

// ---------------- STT Branching ----------------
async function processAudioStream(ws) {
    const config = await configService.getConfiguration();
    const activeSTT = config.active_stt || 'transcribe';

    console.log(`Initializing ${activeSTT} Audio Stream...`);

    if (activeSTT === 'deepgram') {
        const deepgramApiKey = await configService.getSecret('DEEPGRAM_API_KEY') || process.env.DEEPGRAM_API_KEY;
        const deepgram = new DeepgramClient(deepgramApiKey);

        const connection = deepgram.listen.live({
            model: "nova-2-medical",
            language: "en",
            encoding: "linear16",
            sample_rate: 16000,
        });

        connection.on('open', () => {
            console.log("Deepgram connection opened");
            ws.on('message', (chunk) => connection.send(chunk));
        });

        connection.on('Results', (data) => {
            if (data.is_final) {
                const transcript = data.channel.alternatives[0].transcript;
                if (transcript) console.log("[Deepgram Medical]:", transcript);
            }
        });

        ws.on('close', () => {
            connection.finish();
            console.log("Deepgram Stream Closed");
        });
        return;
    }

    if (activeSTT === 'google_stt') {
        const client = new speech.SpeechClient();

        const request = {
            config: {
                encoding: 'LINEAR16',
                sampleRateHertz: 16000,
                languageCode: 'en-US',
                model: 'medical_conversation'
            },
            interimResults: false,
        };

        const recognizeStream = client
            .streamingRecognize(request)
            .on('error', console.error)
            .on('data', data => {
                if (data.results[0] && data.results[0].alternatives[0]) {
                    console.log("[Google Medical STT]:", data.results[0].alternatives[0].transcript);
                }
            });

        ws.on('message', chunk => recognizeStream.write(chunk));
        ws.on('close', () => {
            recognizeStream.end();
            console.log("Google STT Stream Closed");
        });
        return;
    }

    // Default: AWS Transcribe Medical
    const client = getTranscribeMedicalClient();
    const audioStream = (async function* () {
        for await (const chunk of ws) {
            yield { AudioEvent: { AudioChunk: chunk } };
        }
    })();

    try {
        const command = new StartMedicalStreamTranscriptionCommand({
            LanguageCode: "en-US",
            MediaEncoding: "pcm",
            MediaSampleRateHertz: 16000,
            Specialty: "PRIMARYCARE",
            Type: "CONVERSATION",
            AudioStream: audioStream
        });

        const response = await client.send(command);

        for await (const event of response.TranscriptResultStream) {
            if (event.TranscriptEvent) {
                const results = event.TranscriptEvent.Transcript.Results;
                if (results && results.length > 0 && !results[0].IsPartial) {
                    const transcript = results[0].Alternatives[0].Transcript;
                    console.log("[Transcribe Medical]:", transcript);
                }
            }
        }
    } catch (error) {
        console.error("Transcribe Medical Error:", error);
    }

    ws.on('close', () => {
        console.log("AWS Transcribe Medical Stream Closed");
    });
}

export {
    textToSpeech,
    getTranscribeMedicalClient,
    processAudioStream
};
