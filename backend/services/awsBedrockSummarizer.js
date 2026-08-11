import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { retrieveMedicalContext } from './ragService.js';

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

/**
 * Summarizes clinical transcripts into SOAP notes using Amazon Bedrock (Claude 3.5 Sonnet)
 * @param {string} transcript - The raw clinical transcript
 * @param {string} [searchKeywords=null] - Keywords for RAG context search
 * @returns {Promise<Object>} The structured SOAP note in JSON
 */
export async function summarizeTranscript(transcript, searchKeywords = null) {
  console.log("Calling AWS Bedrock (Claude 3.5 Sonnet)...");
  
  if (!process.env.AWS_ACCESS_KEY_ID) {
    console.warn("no AWS credentials. mocking response.");
    return {
      subjective_complaints: "Severe headache.",
      objective_symptoms: "Patient looks tired.",
      assessment: "Tension headache.",
      lifestyle_advice: "Sleep.",
      medications: ["Ibuprofen"]
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
    DO NOT USE MARKDOWN. OUTPUT ONLY RAW JSON.

    Transcript: ${transcript}
  `;

  try {
    const command = new InvokeModelCommand({
      modelId: "anthropic.claude-3-5-sonnet-20240620-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 2000,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      }),
    });

    const response = await client.send(command);
    
    // The response body is a Uint8Array. We need to decode it.
    const decodedResponseBody = new TextDecoder().decode(response.body);
    const responseBody = JSON.parse(decodedResponseBody);
    
    // Claude typically puts the text in content[0].text
    let rawContent = responseBody.content?.[0]?.text || "{}";
    
    // If Claude wrapped it in markdown code blocks by accident, clean it up
    rawContent = rawContent.replace(/^\`\`\`json\s*/g, '').replace(/\s*\`\`\`$/g, '');

    try {
      return JSON.parse(rawContent);
    } catch (e) {
      console.error("failed to parse json. LLM hallucinated maybe?", rawContent);
      return { error: "Failed to parse AI output" };
    }
  } catch (error) {
    console.error("Bedrock Summarization Error:", error);
    throw new Error(`Failed to summarize transcript: ${error.message}`);
  }
}
