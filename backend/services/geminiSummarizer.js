/**
 * Summarizes clinical transcripts into SOAP notes using Google Gemini
 * @param {string} transcript - The raw clinical transcript
 * @returns {Promise<Object>} The structured SOAP note in JSON
 */
export async function summarizeTranscript(transcript) {
  console.log("Calling Google Gemini via fetch...");
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
  
  if (!apiKey) {
    console.warn("no GEMINI API credentials. mocking response.");
    return {
      subjective_complaints: "Severe headache.",
      objective_symptoms: "Patient looks tired.",
      assessment: "Tension headache.",
      lifestyle_advice: "Sleep.",
      medications: ["Ibuprofen"]
    };
  }

  const prompt = `
    You are an expert medical AI scribe. Read this clinical conversation transcript and strictly format it into a professional JSON SOAP note.
    Crucial Requirements:
    - Use standard clinical format and terminology.
    - Accurately capture all relative medical terms, diagnoses, dosages, frequencies, and anatomical locations.
    - Keys MUST be exactly: "subjective_complaints", "objective_symptoms", "assessment", "lifestyle_advice", "medications".
    - "medications" must be an array of strings (e.g., ["Ibuprofen 400mg PO TID"]).
    DO NOT USE MARKDOWN. OUTPUT ONLY RAW JSON.

    Transcript: ${transcript}
  `;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0, responseMimeType: "application/json" }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    try {
      return JSON.parse(rawContent);
    } catch (e) {
      console.error("failed to parse json. LLM hallucinated maybe?", rawContent);
      return { error: "Failed to parse AI output" };
    }
  } catch (error) {
    console.error("Gemini Summarization Error:", error);
    throw new Error("Failed to summarize transcript");
  }
}
