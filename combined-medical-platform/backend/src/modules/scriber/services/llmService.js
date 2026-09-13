import Groq from "groq-sdk";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

import { retrieveMedicalContext } from './ragService.js';
import { getSecret, getConfiguration } from '../../core/services/configService.js';

export async function summarizeTranscript(transcript, searchKeywords = null) {
  console.log("Calling Dynamic LLM Service...");
  
  const config = await getConfiguration();
  const activeLlm = config.active_llm || 'bedrock'; // default to bedrock based on client request

  const ragQuery = searchKeywords || transcript.substring(0, 500);
  const medicalContext = await retrieveMedicalContext(ragQuery);

  const prompt = `
    You are an expert medical AI scribe. Read this clinical conversation transcript and strictly format it into a professional JSON SOAP note.
    
    ${medicalContext ? `MEDICAL TEXTBOOK CONTEXT:\nUse the following excerpts from standard medical textbooks ONLY for reference to spell medical terms correctly or understand standard practices. DO NOT invent or assume the patient has any of the symptoms or conditions mentioned in this textbook context unless they are EXPLICITLY stated in the transcript.\n${medicalContext}\n\n` : ''}
    Crucial Requirements:
    - ANTI-HALLUCINATION: YOU MUST NOT invent any symptoms, diagnoses, or medications. If the transcript is very short or cut off, output "None" for the respective fields. ONLY use information explicitly spoken in the transcript.
    - IGNORE NOISE: The transcript may contain background noise, side chatter, or irrelevant conversation. Act as a noise filter and ignore anything not related to the clinical consultation.
    - ALL OUTPUT MUST BE IN ENGLISH.
    - Use standard clinical format and terminology.
    - Keys MUST be exactly: "subjective_complaints", "objective_symptoms", "assessment", "lifestyle_advice", "medications".
    - "medications" must be an array of strings.
    - OUTPUT RAW JSON ONLY.

    Transcript: ${transcript}
  `;

  try {
    if (activeLlm === 'openai') {
      const apiKey = await getSecret('LLM_API_KEY') || process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error("OpenAI API Key is missing. Please set it in Master Settings.");
      const openai = new OpenAI({ apiKey });
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
        response_format: { type: "json_object" }
      });
      return JSON.parse(response.choices[0].message.content);
    } 
    else if (activeLlm === 'gemini') {
      const apiKey = await getSecret('LLM_API_KEY') || process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("Gemini API Key is missing. Please set it in Master Settings.");
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { 
            responseMimeType: "application/json",
            temperature: 0 
        }
      });
      return JSON.parse(response.text);
    }
    else if (activeLlm === 'bedrock') {
      const region = await getSecret('LLM_AWS_REGION') || process.env.AWS_REGION || 'us-east-1';
      const accessKeyId = await getSecret('LLM_AWS_ACCESS_KEY_ID') || process.env.AWS_ACCESS_KEY_ID;
      const secretAccessKey = await getSecret('LLM_AWS_SECRET_ACCESS_KEY') || process.env.AWS_SECRET_ACCESS_KEY;
      if (!accessKeyId) throw new Error("AWS Credentials for Bedrock missing.");
      
      const client = new BedrockRuntimeClient({
        region, credentials: { accessKeyId, secretAccessKey }
      });
      
      const input = {
        modelId: "anthropic.claude-3-haiku-20240307-v1:0",
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 1000,
          temperature: 0,
          messages: [{ role: "user", content: prompt + " OUTPUT JSON ONLY. NO OTHER TEXT." }]
        })
      };
      
      const command = new InvokeModelCommand(input);
      const response = await client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const text = responseBody.content[0].text;
      return JSON.parse(text);
    }
    else {
      // Default: Groq
      const apiKey = await getSecret('LLM_API_KEY') || process.env.GROQ_API_KEY;
      if (!apiKey) throw new Error("Groq API Key is missing. Please set it in Master Settings.");
      const groq = new Groq({ apiKey });
      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
        response_format: { type: "json_object" }
      });
      return JSON.parse(response.choices[0].message.content);
    }
  } catch (error) {
    console.error(`LLM Summarization Error (${activeLlm}):`, error);
    return { error: `Failed to summarize using ${activeLlm}: ${error.message}` };
  }
}
