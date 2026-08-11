import Groq from "groq-sdk";
import { retrieveMedicalContext } from './ragService.js';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

/**
 * Summarizes clinical transcripts into SOAP notes using Groq Llama 3 API
 * @param {string} transcript - The raw clinical transcript
 * @param {string} [searchKeywords=null] - Keywords for RAG context search
 * @returns {Promise<Object>} The structured SOAP note in JSON
 */
export async function summarizeTranscript(transcript, searchKeywords = null) {
  console.log("Calling Groq (Llama-3)...");
  
  if (!process.env.GROQ_API_KEY) {
    console.warn("No GROQ_API_KEY found in .env. Mocking response.");
    return {
      subjective_complaints: "Patient reported issues but no API key configured.",
      objective_symptoms: "System is offline.",
      assessment: "Missing API Key.",
      lifestyle_advice: "Please add GROQ_API_KEY to your .env file.",
      medications: []
    };
  }

  const medicalContext = await retrieveMedicalContext(searchKeywords || transcript);

  const prompt = `
    You are an expert medical AI scribe. Read this clinical conversation transcript and strictly format it into a professional JSON SOAP note.
    
    ${medicalContext ? `MEDICAL TEXTBOOK CONTEXT:\nUse the following excerpts from standard medical textbooks to improve clinical accuracy, terminology, and standard practices in your notes:\n${medicalContext}\n\n` : ''}
    Crucial Requirements:
    - IGNORE NOISE: The transcript may contain background noise, side chatter, or irrelevant conversation. Act as a noise filter and ignore anything not related to the clinical consultation.
    - If the transcript is in a language other than English (e.g. Hindi, Hinglish, Spanish), accurately translate it into English first.
    - ALL OUTPUT MUST BE IN ENGLISH.
    - Use standard clinical format and terminology.
    - Accurately capture all relative medical terms, diagnoses, dosages, frequencies, and anatomical locations.
    - Keys MUST be exactly: "subjective_complaints", "objective_symptoms", "assessment", "lifestyle_advice", "medications".
    - "medications" must be an array of strings (e.g., ["Ibuprofen 400mg PO TID"]).
    - DO NOT USE MARKDOWN CODE BLOCKS (\`\`\`json). Output raw json only.

    Transcript: ${transcript}
  `;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama3-70b-8192", // We can use Llama-3-70b for high reasoning
      temperature: 0,
      response_format: { type: "json_object" } // Force JSON output natively!
    });

    const rawContent = chatCompletion.choices[0]?.message?.content || "{}";
    
    try {
      return JSON.parse(rawContent);
    } catch (e) {
      console.error("Failed to parse JSON. LLM hallucinated maybe?", rawContent);
      return { error: "Failed to parse AI output" };
    }
  } catch (error) {
    console.error("Groq Summarization Error:", error);
    throw new Error(`Failed to summarize transcript: ${error.message}`);
  }
}
