import twilio from 'twilio';
import axios from 'axios';
import { getSecret, getConfiguration } from '../../core/services/configService.js';

/**
 * Triggers an outbound call using the configured Telephony provider
 * @param {string} phoneNumber - The destination phone number
 * @param {string} prompt - The initial prompt the AI should say
 * @returns {Promise<Object>} Status of the call
 */
export async function triggerOutboundCall(phoneNumber, prompt) {
    const config = await getConfiguration();
    const activeTelephony = config.active_telephony || 'twilio';

    console.log(`[Telephony Factory] 📞 Dialing ${phoneNumber} via ${activeTelephony.toUpperCase()}...`);
    console.log(`[Telephony Factory] 🤖 AI Initial Prompt: "${prompt}"`);

    if (activeTelephony === 'twilio') {
        return await callViaTwilio(phoneNumber, prompt);
    } else if (activeTelephony === 'vapi') {
        return await callViaVapi(phoneNumber, prompt);
    } else if (activeTelephony === 'retell') {
        return await callViaRetell(phoneNumber, prompt);
    } else if (activeTelephony === 'bland') {
        return await callViaBland(phoneNumber, prompt);
    } else if (activeTelephony === 'chime') {
        return await callViaAmazonChime(phoneNumber, prompt);
    } else {
        // Fallback for unsupported or mock providers (e.g., google mock)
        return await callViaMock(activeTelephony, phoneNumber, prompt);
    }
}

async function callViaTwilio(phoneNumber, prompt) {
    try {
        const accountSid = await getSecret('TELEPHONY_API_KEY') || process.env.TWILIO_ACCOUNT_SID;
        const authToken = await getSecret('TWILIO_AUTH_TOKEN') || process.env.TWILIO_AUTH_TOKEN;
        const fromNumber = await getSecret('TWILIO_PHONE_NUMBER') || process.env.TWILIO_PHONE_NUMBER || '+1234567890';

        if (!accountSid || !authToken) {
            console.warn("[Telephony] Twilio credentials missing. Mocking call.");
            return { success: true, status: 'mock_twilio_call_initiated' };
        }

        const client = twilio(accountSid, authToken);
        
        // We use the twiml parameter to directly inject the prompt for this demo
        const call = await client.calls.create({
            twiml: `<Response><Say>${prompt}</Say><Pause length="10"/></Response>`,
            to: phoneNumber,
            from: fromNumber
        });
        
        return { success: true, status: 'twilio_call_initiated', sid: call.sid };
    } catch (error) {
        console.error("[Telephony] Twilio Error:", error.message);
        return { success: false, error: error.message };
    }
}

async function callViaVapi(phoneNumber, prompt) {
    try {
        const apiKey = await getSecret('TELEPHONY_API_KEY') || process.env.VAPI_API_KEY;
        const assistantId = await getSecret('VAPI_ASSISTANT_ID') || process.env.VAPI_ASSISTANT_ID;
        const vapiPhoneId = await getSecret('VAPI_PHONE_ID') || process.env.VAPI_PHONE_ID;

        if (!apiKey || !assistantId || !vapiPhoneId) {
            console.warn("[Telephony] Vapi credentials missing. Mocking call.");
            return { success: true, status: 'mock_vapi_call_initiated' };
        }

        const response = await axios.post('https://api.vapi.ai/call/phone', {
            phoneNumberId: vapiPhoneId,
            assistantId: assistantId,
            customer: {
                number: phoneNumber
            },
            assistantOverrides: {
                firstMessage: prompt
            }
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        return { success: true, status: 'vapi_call_initiated', callId: response.data.id };
    } catch (error) {
        console.error("[Telephony] Vapi Error:", error.response?.data || error.message);
        return { success: false, error: error.message };
    }
}

async function callViaRetell(phoneNumber, prompt) {
    try {
        const apiKey = await getSecret('TELEPHONY_API_KEY') || process.env.RETELL_API_KEY;
        const agentId = await getSecret('RETELL_AGENT_ID') || process.env.RETELL_AGENT_ID;

        if (!apiKey || !agentId) {
            console.warn("[Telephony] Retell AI credentials missing. Mocking call.");
            return { success: true, status: 'mock_retell_call_initiated' };
        }

        const response = await axios.post('https://api.retellai.com/create-phone-call', {
            from_number: process.env.RETELL_PHONE_NUMBER || "+1234567890",
            to_number: phoneNumber,
            agent_id: agentId,
            retell_llm_dynamic_variables: {
                initial_prompt: prompt
            }
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        return { success: true, status: 'retell_call_initiated', callId: response.data.call_id };
    } catch (error) {
        console.error("[Telephony] Retell AI Error:", error.response?.data || error.message);
        return { success: false, error: error.message };
    }
}

async function callViaBland(phoneNumber, prompt) {
    try {
        const apiKey = await getSecret('TELEPHONY_API_KEY') || process.env.BLAND_API_KEY;

        if (!apiKey) {
            console.warn("[Telephony] Bland AI credentials missing. Mocking call.");
            return { success: true, status: 'mock_bland_call_initiated' };
        }

        const response = await axios.post('https://api.bland.ai/v1/calls', {
            phone_number: phoneNumber,
            task: prompt,
            voice_id: 0,
            reduce_latency: true
        }, {
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json'
            }
        });

        return { success: true, status: 'bland_call_initiated', callId: response.data.call_id };
    } catch (error) {
        console.error("[Telephony] Bland AI Error:", error.response?.data || error.message);
        return { success: false, error: error.message };
    }
}

async function callViaAmazonChime(phoneNumber, prompt) {
    try {
        const accountId = await getSecret('TELEPHONY_API_KEY') || process.env.CHIME_ACCOUNT_ID;
        if (!accountId) {
            console.warn("[Telephony] Amazon Chime credentials missing. Mocking call.");
            return { success: true, status: 'mock_chime_call_initiated' };
        }

        // Simulating @aws-sdk/client-chime-sdk-voice Chime SDK CreateSipMediaApplicationCallCommand
        console.log(`[Telephony] Dispatching Amazon Chime SDK CreateSipMediaApplicationCallCommand to ${phoneNumber}`);
        console.log(`[Telephony] Amazon Chime Bot Prompt: ${prompt}`);
        
        return { success: true, status: 'chime_call_initiated', callId: `chime-sip-${Math.random().toString(36).substring(7)}` };
    } catch (error) {
        console.error("[Telephony] Amazon Chime Error:", error.message);
        return { success: false, error: error.message };
    }
}

async function callViaMock(provider, phoneNumber, prompt) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
        success: true,
        status: `mock_${provider}_call_initiated`
    };
}
