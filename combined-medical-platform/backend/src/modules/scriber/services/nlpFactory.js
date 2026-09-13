import { ComprehendMedicalClient, InferICD10CMCommand } from "@aws-sdk/client-comprehendmedical";
import { google } from 'googleapis';
import { getSecret, getConfiguration } from '../../core/services/configService.js';

/**
 * Extracts medical conditions and ICD-10 codes from a transcript
 * @param {string} text - The transcript or summary text
 * @returns {Promise<Array>} Array of ICD-10 codes and descriptions
 */
export async function extractICD10Codes(text) {
  if (!text || text.trim() === "") {
    return [];
  }

  const config = await getConfiguration();
  const activeNLP = config.active_nlp || 'comprehend';

  console.log(`[Scriber NLP] Using ${activeNLP} for ICD-10 extraction...`);

  if (activeNLP === 'google_healthcare') {
    return await extractViaGoogleHealthcare(text);
  } else {
    // Default to AWS Comprehend
    return await extractViaAWSComprehend(text);
  }
}

async function extractViaAWSComprehend(text) {
  const region = await getSecret('NLP_AWS_REGION') || process.env.AWS_REGION || 'us-east-1';
  const accessKeyId = await getSecret('NLP_AWS_ACCESS_KEY_ID') || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = await getSecret('NLP_AWS_SECRET_ACCESS_KEY') || process.env.AWS_SECRET_ACCESS_KEY;
  
  if (!accessKeyId || !secretAccessKey) {
    console.warn("[Scriber NLP] No AWS credentials. Returning empty codes.");
    return [];
  }

  const client = new ComprehendMedicalClient({
    region,
    credentials: { accessKeyId, secretAccessKey }
  });

  try {
    const command = new InferICD10CMCommand({
      Text: text.substring(0, 10000)
    });

    const response = await client.send(command);
    const codes = [];

    if (response.Entities) {
      for (const entity of response.Entities) {
        if (entity.ICD10CMConcepts && entity.ICD10CMConcepts.length > 0) {
          const bestConcept = entity.ICD10CMConcepts[0];
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
    console.error("[Scriber NLP] Comprehend Medical Error:", error);
    return [];
  }
}

async function extractViaGoogleHealthcare(text) {
  try {
    const projectId = await getSecret('GOOGLE_CLOUD_PROJECT') || process.env.GOOGLE_CLOUD_PROJECT || 'my-project';
    const location = await getSecret('GOOGLE_CLOUD_LOCATION') || process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
    
    // Check if we have credentials set in environment for Google Auth to work seamlessly
    const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-healthcare'],
    });
    
    const healthcare = google.healthcare({ version: 'v1', auth });
    const nlpService = `projects/${projectId}/locations/${location}/services/nlp`;

    const request = {
        nlpService: nlpService,
        resource: { documentContent: text.substring(0, 10000) }
    };

    const response = await healthcare.projects.locations.services.nlp.analyzeEntities(request);
    
    const codes = [];
    if (response.data && response.data.entityMentions) {
        for (const mention of response.data.entityMentions) {
            // Check if mention is a problem/condition and has linked entities (like ICD-10)
            if (mention.type === 'PROBLEM' && mention.linkedEntities) {
                // Find ICD-10 linked entity
                const icd10Link = mention.linkedEntities.find(le => le.entityId && le.entityId.includes('ICD10'));
                if (icd10Link) {
                     codes.push({
                         condition: mention.text.content,
                         code: icd10Link.entityId, // Google usually formats it like "UMLS:C12345/ICD10:E11" or similar
                         description: "Extracted via Google Healthcare",
                         confidence: mention.confidence ? (mention.confidence * 100).toFixed(2) + "%" : "N/A"
                     });
                }
            }
        }
    }
    
    // Fallback if no specific ICD-10 links were found but problems were found
    if (codes.length === 0 && response.data.entityMentions) {
        for (const mention of response.data.entityMentions) {
            if (mention.type === 'PROBLEM' && mention.confidence > 0.5) {
                 codes.push({
                     condition: mention.text.content,
                     code: "UNMAPPED",
                     description: "Medical Condition (No ICD-10 mapping available)",
                     confidence: (mention.confidence * 100).toFixed(2) + "%"
                 });
            }
        }
    }
    
    return codes;
  } catch (error) {
    console.error("[Scriber NLP] Google Healthcare NLP Error:", error);
    return [];
  }
}
