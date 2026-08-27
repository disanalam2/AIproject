require('dotenv').config();
const { ChatGroq } = require("@langchain/groq");

async function testModel(modelName) {
    try {
        const llm = new ChatGroq({
            apiKey: process.env.GROQ_API_KEY,
            modelName: modelName,
            temperature: 0,
        });
        const res = await llm.invoke("Hello");
        console.log(`Success with ${modelName}:`, res.content);
        return true;
    } catch (e) {
        console.log(`Failed with ${modelName}:`, e.message);
        return false;
    }
}

async function run() {
    const models = ["llama3-70b-8192", "llama3-8b-8192", "mixtral-8x7b-32768", "llama-3.1-8b-instant"];
    for (const m of models) {
        const ok = await testModel(m);
        if (ok) break;
    }
}
run();
