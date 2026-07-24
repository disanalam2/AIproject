import { NextResponse } from 'next/server';
import { SpeechClient } from '@google-cloud/speech';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PromptTemplate } from '@langchain/core/prompts';




const speechClient = new SpeechClient();

export async function POST(req) {
  try {
    console.log("api hit"); // test log
    
    const formData = await req.formData();
    const audioFile = formData.get('audio');

    if (!audioFile) {
      console.log("no audio wtf");
      return NextResponse.json({ error: 'No audio bro' }, { status: 400 });
    }

    // Convert audio to buffer for Google STT
    // Got this snippet from stackoverflow lol
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBytes = Buffer.from(arrayBuffer).toString('base64');

    const audio = { content: audioBytes };
    
    // I think react-audio-voice-recorder outputs webm_opus
    const config = {
      encoding: 'WEBM_OPUS',
      sampleRateHertz: 48000,
      languageCode: 'en-US',
      model: 'medical_conversation', // the medical model is so cool
    };

    const request = { audio, config };

    console.log("Calling Google STT...");
    let transcript = "";
    
    // fallback just in case because GCP was down last night
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.warn("NO CREDENTIALS!! using mock transcript so the demo doesn't crash");
      transcript = "Patient complains of severe headache for 3 days. Prescribing ibuprofen.";
    } else {
      const [response] = await speechClient.recognize(request);
      transcript = response.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');
    }

    console.log("transcript done:", transcript);

    if (!transcript) {
      throw new Error("STT failed. audio might be too quiet?");
    }

    // Langchain + Gemini
    console.log("Calling Gemini 1.5 Pro...");
    const llm = new ChatGoogleGenerativeAI({
      modelName: "gemini-1.5-pro-latest", // using 1.5 pro for big context
      temperature: 0,
      maxOutputTokens: 2048,
    });

    const promptTemplate = PromptTemplate.fromTemplate(`
      You are a medical AI scribe. Read this transcript and return a JSON object representing a SOAP note.
      Keys must be: "subjective_complaints", "objective_symptoms", "assessment", "lifestyle_advice", "medications" (array).
      DO NOT USE MARKDOWN. JUST RAW JSON.

      Transcript: {transcript}
    `);

    const chain = promptTemplate.pipe(llm);
    
    let summaryJson;
    if (!process.env.GEMINI_API_KEY) {
      console.warn("no gemini key. mocking response.");
      summaryJson = {
        subjective_complaints: "Severe headache.",
        objective_symptoms: "Patient looks tired.",
        assessment: "Tension headache.",
        lifestyle_advice: "Sleep.",
        medications: ["Ibuprofen"]
      };
    } else {
      const result = await chain.invoke({ transcript });
      try {
        // kinda hacky but JSON.parse throws if there's backticks
        let rawContent = result.content;
        rawContent = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
        summaryJson = JSON.parse(rawContent);
      } catch (e) {
        console.error("failed to parse json. gemini hallucinated maybe?", result.content);
        summaryJson = { error: "Failed to parse AI output" };
      }
    }

    console.log("all done, sending response");
    
  
    return NextResponse.json({
      transcript: transcript,
      summary: summaryJson
    });

  } catch (error) {
    console.error("API ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
