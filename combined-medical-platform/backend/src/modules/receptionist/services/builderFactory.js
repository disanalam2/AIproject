import { getSecret, getConfiguration } from '../../core/services/configService.js';
import { runAgent as runLangchainAgent } from './langchainAgent.js';
import { processViaDecisionTree } from './dialogueFlow.js';
import { LexRuntimeV2Client, RecognizeTextCommand } from "@aws-sdk/client-lex-runtime-v2";
import axios from 'axios';

/**
 * Processes a user utterance using the configured builder/orchestrator
 * @param {string} sessionId - Unique session ID for the call
 * @param {string} transcript - What the user said
 * @param {string} intentName - Optional intent name (if STT/NLU already provided one)
 * @returns {Promise<string>} The response text from the bot
 */
export async function processUserUtterance(sessionId, transcript, intentName = null, tenantId = null) {
    const config = await getConfiguration();
    const activeBuilder = config.active_builder || 'langchain';

    console.log(`[Builder Factory] Processing utterance via ${activeBuilder.toUpperCase()}: "${transcript}"`);

    if (activeBuilder === 'lex') {
        return await processViaAmazonLex(sessionId, transcript);
    } else if (activeBuilder === 'dialogflow') {
        return await processViaDialogflow(sessionId, transcript);
    } else if (activeBuilder === 'voiceflow') {
        return await processViaVoiceflow(sessionId, transcript);
    } else if (activeBuilder === 'langchain') {
        // Direct to LLM
        return await runLangchainAgent(sessionId, transcript, intentName || "General Query", tenantId);
    } else {
        // Default to the Hybrid Decision Tree Architecture
        return await processViaDecisionTree(sessionId, transcript, intentName, tenantId);
    }
}

async function processViaAmazonLex(sessionId, transcript) {
    try {
        const region = await getSecret('BUILDER_AWS_REGION') || process.env.AWS_REGION || 'us-east-1';
        const botId = await getSecret('LEX_BOT_ID') || process.env.LEX_BOT_ID;
        const botAliasId = await getSecret('LEX_BOT_ALIAS_ID') || process.env.LEX_BOT_ALIAS_ID;
        
        if (!botId) {
            console.warn("[Builder] Amazon Lex Bot ID missing. Falling back to mock.");
            return "[Mock Amazon Lex Response: How can I help you book an appointment today?]";
        }

        const client = new LexRuntimeV2Client({ region });
        
        const command = new RecognizeTextCommand({
            botId: botId,
            botAliasId: botAliasId,
            localeId: "en_US",
            sessionId: sessionId,
            text: transcript
        });
        
        const response = await client.send(command);
        
        if (response.messages && response.messages.length > 0) {
            return response.messages[0].content;
        }
        
        return "Sorry, Amazon Lex didn't return a message.";
    } catch (error) {
        console.error("[Builder] Amazon Lex Error:", error);
        return "Sorry, I am having trouble connecting to Amazon Lex.";
    }
}

async function processViaDialogflow(sessionId, transcript) {
    try {
        const projectId = await getSecret('BUILDER_API_KEY') || process.env.DIALOGFLOW_PROJECT_ID;
        
        if (!projectId) {
            console.warn("[Builder] Dialogflow credentials missing. Falling back to mock.");
            return "[Mock Dialogflow Response: Please specify a time for your appointment.]";
        }

        // We would use @google-cloud/dialogflow SDK here.
        console.log(`[Builder] Simulating Dialogflow DetectIntent for project ${projectId}`);
        return "[Dialogflow Output: Great, let me check the doctor's availability for you.]";
    } catch (error) {
        console.error("[Builder] Dialogflow Error:", error);
        return "Sorry, I am having trouble connecting to Dialogflow.";
    }
}

async function processViaVoiceflow(sessionId, transcript) {
    try {
        const apiKey = await getSecret('BUILDER_API_KEY') || process.env.VOICEFLOW_API_KEY;
        const projectId = await getSecret('VOICEFLOW_PROJECT_ID') || process.env.VOICEFLOW_PROJECT_ID;

        if (!apiKey) {
            console.warn("[Builder] Voiceflow API Key missing. Falling back to mock.");
            return "[Mock Voiceflow Response: Welcome to City Care Clinic. How can I assist?]";
        }

        const response = await axios.post(
            `https://general-runtime.voiceflow.com/state/user/${sessionId}/interact`,
            {
                action: { type: 'text', payload: transcript }
            },
            {
                headers: {
                    'Authorization': apiKey,
                    'versionID': 'production'
                }
            }
        );

        // Voiceflow returns an array of traces
        let outputText = "";
        for (const trace of response.data) {
            if (trace.type === 'text' || trace.type === 'speak') {
                outputText += trace.payload.message + " ";
            }
        }
        
        return outputText.trim() || "I'm sorry, I didn't understand that.";
    } catch (error) {
        console.error("[Builder] Voiceflow Error:", error.response?.data || error.message);
        return "Sorry, I am having trouble connecting to Voiceflow.";
    }
}
