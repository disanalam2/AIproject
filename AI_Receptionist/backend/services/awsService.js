const { ComprehendMedicalClient, DetectEntitiesV2Command } = require('@aws-sdk/client-comprehendmedical');
const { PollyClient, SynthesizeSpeechCommand } = require('@aws-sdk/client-polly');
require('dotenv').config();

const comprehendClient = new ComprehendMedicalClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const pollyClient = new PollyClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

async function extractMedicalEntities(text) {
    if (!text || text.trim() === '') return [];
    
    try {
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

module.exports = {
    extractMedicalEntities,
    generateSpeech
};
