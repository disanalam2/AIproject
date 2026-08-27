require('dotenv').config();
const langchainAgent = require('./services/langchainAgent');

async function test() {
    try {
        const result = await langchainAgent.runAgent("Want to book a appointment", "DemoIntent");
        console.log("RESULT:", result);
    } catch (error) {
        console.error("ERROR:", error);
    }
}
test();
