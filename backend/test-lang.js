import { TranscribeStreamingClient, StartStreamTranscriptionCommand } from "@aws-sdk/client-transcribe-streaming";
const client = new TranscribeStreamingClient({ region: 'us-east-1' });

async function test() {
  try {
    const cmd = new StartStreamTranscriptionCommand({
      IdentifyLanguage: true,
      LanguageOptions: "hi-IN,en-IN,ta-IN,te-IN",
      PreferredLanguage: "hi-IN",
      MediaEncoding: "pcm",
      MediaSampleRateHertz: 16000,
      // Pass a dummy stream
      AudioStream: (async function* () {
         yield { AudioEvent: { AudioChunk: Buffer.from([0, 0, 0, 0]) } };
      })()
    });
    await client.send(cmd);
    console.log("SUCCESS");
  } catch(e) {
    console.log("ERROR:", e.message);
  }
}
test();
