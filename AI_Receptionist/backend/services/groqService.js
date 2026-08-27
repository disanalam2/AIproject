const { Groq } = require('groq-sdk');
require('dotenv').config();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

async function processIntent(transcript, intentName) {
    try {
        const prompt = `You are a helpful, professional medical AI receptionist for City Care clinic.
        The user just said: "${transcript}".
        Intent identified: ${intentName || 'Unknown'}.
        
        Respond naturally and concisely, asking for clarification if booking an appointment or thanking them for the call.`;

        const completion = await groq.chat.completions.create({
            messages: [{ role: "system", content: prompt }],
            model: "openai/gpt-oss-20b", // Updated to active model
            temperature: 0.3,
        });

        return completion.choices[0].message.content;
    } catch (error) {
        console.error("Groq Service Error:", error);
        return "I'm sorry, I'm having trouble processing that right now. Could you please repeat?";
    }
}

module.exports = {
    processIntent
};
