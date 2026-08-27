require('dotenv').config();
const { ChatGroq } = require("@langchain/groq");
const { tool } = require("@langchain/core/tools");
const { z } = require("zod");

async function testModel(modelName) {
    try {
        const llm = new ChatGroq({
            apiKey: process.env.GROQ_API_KEY,
            modelName: modelName,
            temperature: 0,
        });
        
        const testTool = tool(async ({ x }) => `x is ${x}`, {
            name: "test_tool",
            description: "A test tool",
            schema: z.object({ x: z.string() })
        });
        
        const llmWithTools = llm.bindTools([testTool]);
        const res = await llmWithTools.invoke("Use the test tool and pass x='hello'");
        console.log(`Success with ${modelName}:`, res.tool_calls);
        return true;
    } catch (e) {
        console.log(`Failed with ${modelName}:`, e.message);
        return false;
    }
}

async function run() {
    const models = [
        "qwen/qwen3.6-27b",
        "openai/gpt-oss-20b",
        "openai/gpt-oss-120b",
        "groq/compound",
        "groq/compound-mini"
    ];
    for (const m of models) {
        const ok = await testModel(m);
        if (ok) break;
    }
}
run();
