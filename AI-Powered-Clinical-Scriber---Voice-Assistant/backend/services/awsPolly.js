import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';

const pollyClient = new PollyClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

/**
 * Synthesizes speech from text using AWS Polly
 * @param {string} text - The text to synthesize
 * @returns {Promise<string>} Base64 encoded audio string
 */
export async function synthesizeSpeech(text) {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.warn("NO AWS CREDENTIALS!! Returning empty TTS response.");
    return "";
  }

  const params = {
    Text: text,
    OutputFormat: 'mp3',
    VoiceId: 'Joanna', // or 'Matthew', etc.
    Engine: 'neural' // use neural for better quality
  };

  try {
    const command = new SynthesizeSpeechCommand(params);
    const response = await pollyClient.send(command);

    // Convert the AudioStream to a base64 string
    const chunks = [];
    for await (const chunk of response.AudioStream) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);
    return audioBuffer.toString('base64');
  } catch (error) {
    console.error("AWS Polly TTS API ERROR:", error);
    throw new Error("Failed to synthesize speech");
  }
}
