import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import textToSpeech from '@google-cloud/text-to-speech';
import OpenAI from 'openai';
import axios from 'axios';
import { getSecret, getConfiguration } from './configService.js';

/**
 * Synthesizes speech from text using the configured TTS provider
 * @param {string} text - The text to synthesize
 * @returns {Promise<string>} Base64 encoded audio string
 */
export async function synthesizeSpeech(text) {
  if (!text || text.trim() === "") {
    return "";
  }

  const config = await getConfiguration();
  const activeTTS = config.active_tts || 'aws_polly';

  console.log(`[TTS Factory] Using ${activeTTS} for speech synthesis...`);

  if (activeTTS === 'google_tts') {
    return await synthesizeViaGoogle(text);
  } else if (activeTTS === 'elevenlabs') {
    return await synthesizeViaElevenLabs(text);
  } else if (activeTTS === 'openai_tts') {
    return await synthesizeViaOpenAI(text);
  } else {
    // Default to AWS Polly
    return await synthesizeViaAWSPolly(text);
  }
}

async function synthesizeViaAWSPolly(text) {
  const region = await getSecret('TTS_AWS_REGION') || process.env.AWS_REGION || 'us-east-1';
  const accessKeyId = await getSecret('TTS_AWS_ACCESS_KEY_ID') || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = await getSecret('TTS_AWS_SECRET_ACCESS_KEY') || process.env.AWS_SECRET_ACCESS_KEY;
  
  if (!accessKeyId || !secretAccessKey) {
    console.warn("[TTS Factory] NO AWS CREDENTIALS!! Returning empty TTS response.");
    return "";
  }

  const pollyClient = new PollyClient({
    region,
    credentials: { accessKeyId, secretAccessKey }
  });

  const params = {
    Text: text,
    OutputFormat: 'mp3',
    VoiceId: 'Joanna', // or 'Matthew', etc.
    Engine: 'neural' // use neural for better quality
  };

  try {
    const command = new SynthesizeSpeechCommand(params);
    const response = await pollyClient.send(command);

    const chunks = [];
    for await (const chunk of response.AudioStream) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);
    return audioBuffer.toString('base64');
  } catch (error) {
    console.error("[TTS Factory] AWS Polly Error:", error);
    return "";
  }
}

async function synthesizeViaGoogle(text) {
  try {
    const client = new textToSpeech.TextToSpeechClient(); // Automatically picks up GOOGLE_APPLICATION_CREDENTIALS

    const request = {
      input: { text: text },
      voice: { languageCode: 'en-US', name: 'en-US-Journey-F' },
      audioConfig: { audioEncoding: 'MP3' },
    };

    const [response] = await client.synthesizeSpeech(request);
    return response.audioContent.toString('base64');
  } catch (error) {
    console.error("[TTS Factory] Google TTS Error:", error);
    return "";
  }
}

async function synthesizeViaElevenLabs(text) {
  try {
    const apiKey = await getSecret('TTS_API_KEY') || process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.warn("[TTS Factory] No ElevenLabs API Key.");
      return "";
    }
    const voiceId = "EXAVITQu4vr4xnSDxMaL"; // default Sarah voice
    
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text: text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      },
      {
        headers: {
          'Accept': 'audio/mpeg',
          'xi-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );
    
    return Buffer.from(response.data).toString('base64');
  } catch (error) {
    console.error("[TTS Factory] ElevenLabs Error:", error);
    return "";
  }
}

async function synthesizeViaOpenAI(text) {
  try {
    const apiKey = await getSecret('TTS_API_KEY') || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn("[TTS Factory] No OpenAI API Key.");
      return "";
    }

    const openai = new OpenAI({ apiKey });
    
    const mp3 = await openai.audio.speech.create({
      model: "tts-1-hd",
      voice: "alloy",
      input: text,
    });
    
    const buffer = Buffer.from(await mp3.arrayBuffer());
    return buffer.toString('base64');
  } catch (error) {
    console.error("[TTS Factory] OpenAI TTS Error:", error);
    return "";
  }
}
