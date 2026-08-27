import { ComprehendMedicalClient, InferICD10CMCommand } from "@aws-sdk/client-comprehendmedical";

const client = new ComprehendMedicalClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

/**
 * Extracts medical conditions and ICD-10 codes from a transcript
 * @param {string} text - The transcript or summary text
 * @returns {Promise<Array>} Array of ICD-10 codes and descriptions
 */
export async function extractICD10Codes(text) {
  console.log("Calling AWS Comprehend Medical (ICD-10)...");
  
  if (!process.env.AWS_ACCESS_KEY_ID) {
    console.warn("no AWS credentials. returning empty codes.");
    return [];
  }

  if (!text || text.trim() === "") {
    console.warn("Text is empty, skipping Comprehend Medical.");
    return [];
  }

  try {
    const command = new InferICD10CMCommand({
      Text: text.substring(0, 10000) // Comprehend Medical has a 10,000 char limit
    });

    const response = await client.send(command);
    const codes = [];

    if (response.Entities) {
      for (const entity of response.Entities) {
        if (entity.ICD10CMConcepts && entity.ICD10CMConcepts.length > 0) {
          // Take the highest confidence ICD-10 concept for each entity
          const bestConcept = entity.ICD10CMConcepts[0];
          
          // Only add if we have high confidence (>0.5)
          if (bestConcept.Score > 0.5) {
            codes.push({
              condition: entity.Text,
              code: bestConcept.Code,
              description: bestConcept.Description,
              confidence: (bestConcept.Score * 100).toFixed(2) + "%"
            });
          }
        }
      }
    }
    
    return codes;
  } catch (error) {
    console.error("Comprehend Medical Error:", error);
    return [];
  }
}
