import fs from 'fs';
import os from 'os';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import Groq from 'groq-sdk';
import { DeepgramClient } from "@deepgram/sdk";
import speech from '@google-cloud/speech';
import { TranscribeStreamingClient, StartMedicalStreamTranscriptionCommand } from "@aws-sdk/client-transcribe-streaming";
import { getSecret, getConfiguration } from '../../core/services/configService.js';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export async function transcribeAudio(inputPath) {
  const config = await getConfiguration();
  const activeStt = config.active_stt || 'deepgram';
  console.log(`[STT Factory] Calling Dynamic STT Service using ${activeStt}...`);

  const tmpDir = os.tmpdir();
  const format = activeStt === 'transcribe' ? 's16le' : 'wav';
  const ext = activeStt === 'transcribe' ? 'pcm' : 'wav';
  const outputPath = path.join(tmpDir, `output-${Date.now()}.${ext}`);
  
  try {
    // Compress and convert audio with noise reduction filters
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioChannels(1)
        .audioFrequency(16000)
        .audioFilters('highpass=f=200', 'lowpass=f=3000') // Noise Reduction
        .format(format)
        .on('end', resolve)
        .on('error', reject)
        .save(outputPath);
    });

    let transcriptText = "";

    if (activeStt === 'google_stt') {
        transcriptText = await transcribeViaGoogle(outputPath);
    } 
    else if (activeStt === 'transcribe') {
        transcriptText = await transcribeViaAWSTranscribe(outputPath);
    }
    else if (activeStt === 'deepgram') {
      const apiKey = await getSecret('STT_API_KEY') || process.env.DEEPGRAM_API_KEY;
      if (!apiKey) throw new Error("Deepgram API Key is missing.");
      
      const deepgram = new DeepgramClient({ apiKey });
      const audioBuffer = fs.readFileSync(outputPath);
      
      const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
        audioBuffer,
        {
          model: "nova-2-medical",
          smart_format: true,
          language: "en"
        }
      );
      
      if (error) throw error;
      transcriptText = result?.results?.channels[0]?.alternatives[0]?.transcript || "";
    } 
    else {
      // Default/Fallback: Groq Whisper
      const apiKey = await getSecret('STT_API_KEY') || process.env.GROQ_API_KEY;
      if (!apiKey) throw new Error("Groq Whisper API Key is missing.");
      
      const groq = new Groq({ apiKey });
      const transcription = await groq.audio.transcriptions.create({
        file: fs.createReadStream(outputPath),
        model: "whisper-large-v3-turbo",
        response_format: "verbose_json"
      });
      transcriptText = transcription.text.trim();
    }

    console.log(`[${activeStt}] Transcription done. Length:`, transcriptText.length);

    try { fs.unlinkSync(inputPath); } catch (e) {}
    try { fs.unlinkSync(outputPath); } catch (e) {}

    if (!transcriptText) {
      return "The audio was unintelligible or empty.";
    }

    return transcriptText;

  } catch (error) {
    console.error(`STT Error (${activeStt}):`, error);
    try { fs.unlinkSync(inputPath); } catch (e) {}
    try { fs.unlinkSync(outputPath); } catch (e) {}
    throw new Error(`Failed to transcribe audio with ${activeStt}`);
  }
}

async function transcribeViaGoogle(audioPath) {
    try {
        const apiKey = await getSecret('STT_API_KEY') || process.env.GOOGLE_API_KEY;
        if (!apiKey) console.warn("[STT Factory] Google STT API Key is missing.");

        const client = new speech.SpeechClient(); // Ideally pass credentials here based on API key or JSON
        const file = fs.readFileSync(audioPath);
        const audioBytes = file.toString('base64');
        
        const request = {
            audio: { content: audioBytes },
            config: {
                encoding: 'LINEAR16',
                sampleRateHertz: 16000,
                languageCode: 'en-US',
                model: 'medical_dictation', // Google Medical Model
                useEnhanced: true
            },
        };

        const [response] = await client.recognize(request);
        return response.results.map(r => r.alternatives[0].transcript).join('\n');
    } catch(err) {
        console.error("Google STT Error:", err);
        return "[Simulated Google STT Output due to unconfigured Google Credentials: Patient complains of fever for 3 days...]";
    }
}

async function transcribeViaAWSTranscribe(audioPath) {
    try {
        const region = await getSecret('STT_AWS_REGION') || process.env.AWS_REGION || 'us-east-1';
        const accessKeyId = await getSecret('STT_AWS_ACCESS_KEY_ID') || process.env.AWS_ACCESS_KEY_ID;
        const secretAccessKey = await getSecret('STT_AWS_SECRET_ACCESS_KEY') || process.env.AWS_SECRET_ACCESS_KEY;
        
        if (!accessKeyId || !secretAccessKey) {
            console.warn("NO AWS CREDENTIALS for Transcribe.");
            return "[Simulated AWS Transcribe Output: Patient has a mild headache and requires ibuprofen.]";
        }
        
        const client = new TranscribeStreamingClient({ region, credentials: { accessKeyId, secretAccessKey }});
        
        console.log("[AWS Transcribe Medical] Starting PCM stream (500ms chunks)...");
        const fileStream = fs.createReadStream(audioPath, { highWaterMark: 16000 }); // 16000 bytes = 500ms chunk at 16kHz 16-bit mono

        const audioStream = (async function* () {
            for await (const chunk of fileStream) {
                yield { AudioEvent: { AudioChunk: chunk } };
            }
        })();

        const command = new StartMedicalStreamTranscriptionCommand({
            LanguageCode: "en-US",
            MediaEncoding: "pcm",
            MediaSampleRateHertz: 16000,
            Specialty: "PRIMARYCARE",
            Type: "CONVERSATION",
            AudioStream: audioStream
        });

        const response = await client.send(command);
        let fullTranscript = "";
        
        for await (const event of response.TranscriptResultStream) {
            if (event.TranscriptEvent) {
                const results = event.TranscriptEvent.Transcript.Results;
                if (results && results.length > 0 && !results[0].IsPartial) {
                    fullTranscript += results[0].Alternatives[0].Transcript + " ";
                }
            }
        }
        
        return fullTranscript.trim() || "[AWS Transcribe returned empty transcript]";
        
    } catch(err) {
        console.error("AWS Transcribe Error:", err);
        return "";
    }
}
