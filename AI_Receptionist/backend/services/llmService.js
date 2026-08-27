const groqService = require('./groqService');
const configService = require('./configService');
const langchainAgent = require('./langchainAgent');

async function processIntent(transcript, intentName) {
    // 1. Fetch active LLM provider from config
    const config = await configService.getConfiguration();
    const activeLLM = config.active_llm || 'groq';

    // 2. Route to appropriate service
    switch (activeLLM) {
        case 'groq':
            console.log(`[LLM Router] Routing to LangChain Agent with Groq...`);
            return await langchainAgent.runAgent(transcript, intentName);
        
        case 'openai':
        case 'bedrock':
        case 'gemini':
            console.log(`[LLM Router] ${activeLLM} selected but not fully implemented. Falling back to LangChain Groq Agent.`);
            return await langchainAgent.runAgent(transcript, intentName);
            
        default:
            console.warn(`[LLM Router] Unknown provider ${activeLLM}. Using LangChain Groq Agent.`);
            return await langchainAgent.runAgent(transcript, intentName);
    }
}

module.exports = {
    processIntent
};
