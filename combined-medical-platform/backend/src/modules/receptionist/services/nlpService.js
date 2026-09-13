import { google }  from 'googleapis';
import * as configService from '../../core/services/configService.js';
import * as awsService from './awsService.js';

async function extractMedicalEntities(text) {
    const config = await configService.getConfiguration();
    const activeNLP = config.active_nlp || 'comprehend';

    try {
        if (activeNLP === 'google_healthcare') {
            console.log(`[NLP: Google Healthcare API] Extracting entities for: ${text}`);
            const apiKey = await configService.getSecret('NLP_API_KEY') || process.env.GOOGLE_API_KEY;
            if (!apiKey) console.warn("[NLP Factory] Google Healthcare API Key missing.");

            const auth = new google.auth.GoogleAuth({
                scopes: ['https://www.googleapis.com/auth/cloud-healthcare'],
            });
            const healthcare = google.healthcare({ version: 'v1', auth });

            // Ensure these are configured in process.env later
            const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'my-project';
            const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
            const nlpService = `projects/${projectId}/locations/${location}/services/nlp`;

            const request = {
                nlpService: nlpService,
                resource: { documentContent: text }
            };

            const response = await healthcare.projects.locations.services.nlp.analyzeEntities(request);
            
            return {
                message: "Google Healthcare API NLP Extraction",
                originalText: text,
                entities: response.data.entityMentions || []
            };
        } else {
            console.log(`[NLP: AWS Comprehend Medical] Extracting entities for: ${text}`);
            return await awsService.extractMedicalEntities(text);
        }
    } catch (error) {
        console.error("NLP Extraction Error:", error);
        throw error;
    }
}

export {
    extractMedicalEntities
};
