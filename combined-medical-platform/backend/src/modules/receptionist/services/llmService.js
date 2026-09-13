import * as groqService from './groqService.js';
import * as configService from '../../core/services/configService.js';
import * as langchainAgent from './langchainAgent.js';

async function processIntent(sessionId, transcript, intentName) {
    // 1. Fetch active LLM provider from config
    const config = await configService.getConfiguration();
    const activeLLM = config.active_llm || 'groq';

    // 2. Route to appropriate service
    switch (activeLLM) {
        case 'groq':
            console.log(`[LLM Router] Routing to LangChain Agent with Groq...`);
            return await langchainAgent.runAgent(sessionId, transcript, intentName);
        
        case 'openai':
        case 'bedrock':
        case 'gemini':
            console.log(`[LLM Router] Routing to LangChain Agent with ${activeLLM}...`);
            return await langchainAgent.runAgent(sessionId, transcript, intentName);
            
        default:
            console.warn(`[LLM Router] Unknown provider ${activeLLM}. Using LangChain Groq Agent.`);
            return await langchainAgent.runAgent(sessionId, transcript, intentName);
    }
}

export {
    processIntent
};
