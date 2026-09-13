import { ComprehendMedicalClient, DetectEntitiesV2Command }  from '@aws-sdk/client-comprehendmedical';
import { PollyClient, SynthesizeSpeechCommand }  from '@aws-sdk/client-polly';
import 'dotenv/config';

import { getSecret } from '../../core/services/configService.js';

async function extractMedicalEntities(text) {
    if (!text || text.trim() === '') return [];
    
    try {
        const region = await getSecret('NLP_AWS_REGION') || process.env.AWS_REGION || 'us-east-1';
        const accessKeyId = await getSecret('NLP_AWS_ACCESS_KEY_ID') || process.env.AWS_ACCESS_KEY_ID;
        const secretAccessKey = await getSecret('NLP_AWS_SECRET_ACCESS_KEY') || process.env.AWS_SECRET_ACCESS_KEY;
        
        if (!accessKeyId || !secretAccessKey) {
            console.warn("[AWSService] NO AWS CREDENTIALS for Comprehend Medical.");
            return [];
        }

        const comprehendClient = new ComprehendMedicalClient({
            region: region,
            credentials: {
                accessKeyId: accessKeyId,
                secretAccessKey: secretAccessKey
            }
        });

        const command = new DetectEntitiesV2Command({ Text: text });
        const response = await comprehendClient.send(command);
        return response.Entities || [];
    } catch (error) {
        console.error("AWS Comprehend Medical Error:", error);
        return [];
    }
}

/**
 * Feature 6: Human-like voice (Using AWS Polly Neural Engine)
 * Feature 5: Multiple Languages Supported (Dynamically handling language codes)
 */
async function generateSpeech(text, languageCode = 'en-US') {
    try {
        const region = await getSecret('TTS_AWS_REGION') || process.env.AWS_REGION || 'us-east-1';
        const accessKeyId = await getSecret('TTS_AWS_ACCESS_KEY_ID') || process.env.AWS_ACCESS_KEY_ID;
        const secretAccessKey = await getSecret('TTS_AWS_SECRET_ACCESS_KEY') || process.env.AWS_SECRET_ACCESS_KEY;
        
        if (!accessKeyId || !secretAccessKey) {
            console.warn("[AWSService] NO AWS CREDENTIALS for Polly.");
            return null;
        }

        const pollyClient = new PollyClient({
            region: region,
            credentials: {
                accessKeyId: accessKeyId,
                secretAccessKey: secretAccessKey
            }
        });

        // Map language code to human-like neural voices
        let voiceId = 'Matthew'; // Default English US
        if (languageCode.startsWith('hi')) {
            voiceId = 'Kajal'; // Hindi Neural Voice
        } else if (languageCode.startsWith('es')) {
            voiceId = 'Lupe'; // Spanish Neural Voice
        }

        console.log(`[AWSService] 🎙️ Synthesizing Speech using Polly Neural (${voiceId}, ${languageCode})...`);

        const command = new SynthesizeSpeechCommand({
            Engine: 'neural', // Enforces highly realistic human-like voice
            OutputFormat: 'pcm', // Raw audio for telephony
            Text: text,
            VoiceId: voiceId,
            LanguageCode: languageCode
        });

        const response = await pollyClient.send(command);
        
        // return the audio stream stream
        return response.AudioStream;
    } catch (error) {
        console.error("AWS Polly Error:", error);
        throw error;
    }
}

export {
    extractMedicalEntities,
    generateSpeech
};
