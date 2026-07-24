import { NextResponse } from 'next/server';
import textToSpeech from '@google-cloud/text-to-speech';

// Create a client
const client = new textToSpeech.TextToSpeechClient();

export async function POST(req) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required for TTS' }, { status: 400 });
    }

    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.warn("NO CREDENTIALS!! Returning empty TTS response.");
      return NextResponse.json({ audioBase64: "" });
    }

    const request = {
      input: { text: text },
      // Select the language and SSML voice gender (optional)
      voice: { languageCode: 'en-US', name: 'en-US-Journey-F' },
      // select the type of audio encoding
      audioConfig: { audioEncoding: 'MP3' },
    };

    // Performs the text-to-speech request
    const [response] = await client.synthesizeSpeech(request);
    
    // Return as base64 string
    const audioBase64 = response.audioContent.toString('base64');

    return NextResponse.json({
      audioBase64: audioBase64
    });

  } catch (error) {
    console.error("TTS API ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
