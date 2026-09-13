import { runAgent as runLangchainAgent } from './langchainAgent.js';
import { logConversation } from './sheetsIntegration.js';

// In-memory store for decision tree states
const userStates = new Map();

export const STATES = {
    INITIAL: 'INITIAL',
    LLM_HANDOFF: 'LLM_HANDOFF'
};

/**
 * Standard Decision Tree (Dialogue Flow) that handles basic routing
 * without invoking expensive LLMs. Routes to Langchain only when needed.
 */
export async function processViaDecisionTree(sessionId, transcript, intentName, tenantId) {
    if (!userStates.has(sessionId)) {
        userStates.set(sessionId, { state: STATES.INITIAL, history: [] });
    }
    
    const session = userStates.get(sessionId);
    session.history.push({ role: 'user', content: transcript });
    
    let botResponse = "";

    try {
        if (session.state === STATES.INITIAL) {
            console.log(`[Dialogue Flow] State: INITIAL | Processing: "${transcript}"`);
            const lowerTranscript = transcript.toLowerCase();
            
            // 1. Simple Info Routing (No LLM Cost)
            if (lowerTranscript.includes("timing") || lowerTranscript.includes("open") || lowerTranscript.includes("hours")) {
                botResponse = "We are open from 9 AM to 8 PM, Monday to Saturday. Can I help you with anything else, like booking an appointment?";
            } 
            else if (lowerTranscript.includes("location") || lowerTranscript.includes("address") || lowerTranscript.includes("where are you")) {
                botResponse = "We are located at 123 Health Avenue, City Center. Do you need help booking a visit?";
            }
            // 2. Emergency Catch (Immediate Handoff)
            else if (lowerTranscript.includes("emergency") || lowerTranscript.includes("heart attack") || lowerTranscript.includes("bleeding")) {
                session.state = STATES.LLM_HANDOFF;
                console.log(`[Dialogue Flow] EMERGENCY DETECTED -> Handoff to LangChain`);
                botResponse = await runLangchainAgent(sessionId, transcript, intentName, tenantId);
            }
            // 3. Complex Routing -> Hand off to LLM (Appointments, Symptoms, Reschedule)
            else if (lowerTranscript.includes("appointment") || lowerTranscript.includes("book") || lowerTranscript.includes("reschedule") || lowerTranscript.includes("doctor") || lowerTranscript.includes("pain") || lowerTranscript.includes("sick")) {
                session.state = STATES.LLM_HANDOFF;
                console.log(`[Dialogue Flow] Complex Intent -> Handoff to LangChain`);
                botResponse = await runLangchainAgent(sessionId, transcript, intentName, tenantId);
            } 
            // 4. Fallback routing
            else {
                botResponse = "I'm a virtual receptionist. I can provide hospital information, or help you book and manage appointments. How can I help you today?";
            }
        } 
        else if (session.state === STATES.LLM_HANDOFF) {
            console.log(`[Dialogue Flow] State: LLM_HANDOFF | Routing directly to Langchain`);
            // Already handed off, all subsequent messages go directly to LLM for context retention
            botResponse = await runLangchainAgent(sessionId, transcript, intentName, tenantId);
        }
        
        session.history.push({ role: 'bot', content: botResponse });
        
        // Feature 16: Log all discussion and queries properly (to Google Sheets)
        logConversation(sessionId, transcript, botResponse, session.state).catch(e => {
            console.error("[Dialogue Flow] Error logging to Sheets:", e.message);
        });

        return botResponse;
        
    } catch (error) {
        console.error("[Dialogue Flow] Error:", error);
        return "Sorry, we are experiencing technical difficulties. Please call back later.";
    }
}

export function clearDialogueSession(sessionId) {
    userStates.delete(sessionId);
}
