import { NextResponse } from 'next/server';
import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';

// Create an AWS Polly client
// Region and credentials are automatically picked up from process.env.AWS_REGION, etc. if available
const pollyClient = new PollyClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

export async function POST(req) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required for TTS' }, { status: 400 });
    }

    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.warn("NO AWS CREDENTIALS!! Returning empty TTS response.");
      return NextResponse.json({ audioBase64: "" });
    }

    const params = {
      Text: text,
      OutputFormat: 'mp3',
      VoiceId: 'Joanna', // or 'Matthew', etc.
      Engine: 'neural' // use neural for better quality
    };

    const command = new SynthesizeSpeechCommand(params);
    const response = await pollyClient.send(command);

    // Convert the AudioStream to a base64 string
    const chunks = [];
    for await (const chunk of response.AudioStream) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);
    const audioBase64 = audioBuffer.toString('base64');

    return NextResponse.json({
      audioBase64: audioBase64
    });

  } catch (error) {
    console.error("TTS API ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
