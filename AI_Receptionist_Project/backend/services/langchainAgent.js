const { ChatGroq } = require("@langchain/groq");
const { AgentExecutor, createToolCallingAgent } = require("langchain/agents");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { tool } = require("@langchain/core/tools");
const { z } = require("zod");
const { extractMedicalEntities } = require("./awsService");
const prisma = require("../prismaClient");
const configService = require("./configService");
const calendarService = require("./calendarService");
const notificationService = require("./notificationService");

// Define Tools
const extractSymptomsTool = tool(
    async ({ text }) => {
        try {
            console.log(`[Tool: Symptom Extractor] Analyzing: ${text}`);
            const entities = await extractMedicalEntities(text);
            return JSON.stringify(entities);
        } catch (error) {
            return "Failed to extract symptoms.";
        }
    },
    {
        name: "extract_medical_symptoms",
        description: "Use this to extract medical conditions, anatomy, and symptoms from the patient's speech using AWS Comprehend Medical.",
        schema: z.object({
            text: z.string().describe("The text transcript to analyze for medical entities."),
        }),
    }
);

const checkAvailabilityTool = tool(
    async ({ doctorOrDepartment, date }) => {
        try {
            console.log(`[Tool: Check Availability] Checking for ${doctorOrDepartment} on ${date}`);
            return `Slots available for ${doctorOrDepartment} on ${date}: 10:00 AM, 2:30 PM.`;
        } catch (error) {
            return "Failed to check availability.";
        }
    },
    {
        name: "check_appointment_availability",
        description: "Check the availability of a doctor or department for a specific date.",
        schema: z.object({
            doctorOrDepartment: z.string().describe("The name of the doctor or the department."),
            date: z.string().describe("The preferred date in YYYY-MM-DD format, or general timeframe like 'tomorrow'."),
        }),
    }
);

const bookAppointmentTool = tool(
    async ({ patientName, patientPhone, appointmentDate, reason }) => {
        try {
            console.log(`[Tool: Book Appointment] Booking for ${patientName} on ${appointmentDate}`);
            const appointment = await prisma.appointment.create({
                data: {
                    patientName,
                    patientPhone,
                    appointmentDate: new Date(appointmentDate),
                    reason
                }
            });
            
            // Sync to Calendar (Feature 14)
            const syncResult = await calendarService.syncToCalendar(appointment);
            
            // Send WhatsApp / SMS Confirmation (Feature 13)
            const msg = `Hi ${patientName}, your appointment is confirmed for ${new Date(appointmentDate).toLocaleString()}. Meeting link: ${syncResult.meetLink}`;
            await notificationService.sendWhatsAppOrSMS(patientPhone, msg);
            
            return `Appointment successfully booked with ID: ${appointment.id}. Calendar sync status: ${syncResult.success}. Meeting link: ${syncResult.meetLink}`;
        } catch (error) {
            console.error(error);
            return "Failed to book the appointment due to an error.";
        }
    },
    {
        name: "book_appointment",
        description: "Use this to finally book an appointment in the database once the user confirms a time.",
        schema: z.object({
            patientName: z.string().describe("The patient's full name."),
            patientPhone: z.string().describe("The patient's contact number."),
            appointmentDate: z.string().describe("The confirmed date and time in ISO 8601 format."),
            reason: z.string().describe("The reason for the visit or symptoms."),
        }),
    }
);

const rescheduleAppointmentTool = tool(
    async ({ appointmentId, newDate }) => {
        try {
            console.log(`[Tool: Reschedule Appointment] Rescheduling ${appointmentId} to ${newDate}`);
            const appointment = await prisma.appointment.update({
                where: { id: parseInt(appointmentId) },
                data: { appointmentDate: new Date(newDate), status: "RESCHEDULED" }
            });
            
            const syncResult = await calendarService.syncToCalendar(appointment);
            
            // Send WhatsApp / SMS Confirmation for Reschedule (Feature 13)
            const msg = `Hi ${appointment.patientName}, your appointment has been rescheduled to ${new Date(newDate).toLocaleString()}. Meeting link: ${syncResult.meetLink}`;
            await notificationService.sendWhatsAppOrSMS(appointment.patientPhone, msg);
            
            return `Appointment ID ${appointmentId} successfully rescheduled to ${newDate}.`;
        } catch (error) {
            console.error(error);
            return "Failed to reschedule. Please ensure the appointment ID is correct.";
        }
    },
    {
        name: "reschedule_appointment",
        description: "Use this to reschedule an existing appointment to a new date and time.",
        schema: z.object({
            appointmentId: z.string().describe("The ID of the existing appointment."),
            newDate: z.string().describe("The new date and time in ISO 8601 format."),
        }),
    }
);

const knowledgeBaseTool = tool(
    async ({ query }) => {
        console.log(`[Tool: Knowledge Base] Looking up: ${query}`);
        // Mocking RAG Knowledge Base lookup (Features 2 & 11)
        const mockKnowledge = {
            "timings": "The clinic is open from 9 AM to 8 PM from Monday to Saturday. Sundays are closed.",
            "location": "We are located at 123 Health Avenue, City Center.",
            "insurance": "We accept all major health insurances including Medicare and BlueCross."
        };
        const key = Object.keys(mockKnowledge).find(k => query.toLowerCase().includes(k));
        return key ? mockKnowledge[key] : "I don't have that information in my knowledge base right now. Let me know if you need to speak to the front desk.";
    },
    {
        name: "hospital_knowledge_base",
        description: "Use this to answer general queries about the hospital like timings, location, insurance, and other general FAQs.",
        schema: z.object({
            query: z.string().describe("The general query the user is asking about the hospital."),
        }),
    }
);

const emergencyEscalationTool = tool(
    async ({ reason }) => {
        console.log(`[Tool: Emergency Escalation] Escalating due to: ${reason}`);
        // In a real system, this would trigger an AWS Connect / Twilio transfer to a live SIP agent.
        return `[SYSTEM COMMAND: TRANSFER_TO_HUMAN] Critical emergency detected: ${reason}. Transferring to urgent care line immediately.`;
    },
    {
        name: "emergency_escalation",
        description: "CALL THIS TOOL IMMEDIATELY if the user describes a medical emergency like heart attack, severe bleeding, or extreme pain. Do not ask for appointment times.",
        schema: z.object({
            reason: z.string().describe("The emergency reason detected."),
        }),
    }
);

const tools = [
    extractSymptomsTool, 
    checkAvailabilityTool, 
    bookAppointmentTool, 
    rescheduleAppointmentTool, 
    knowledgeBaseTool, 
    emergencyEscalationTool
];

async function initializeAgent() {
    const groqApiKey = await configService.getSecret("GROQ_API_KEY") || process.env.GROQ_API_KEY;

    if (!groqApiKey) {
        throw new Error("Groq API Key is not configured in Master Settings or Environment Variables.");
    }

    const llm = new ChatGroq({
        apiKey: groqApiKey,
        modelName: "qwen/qwen3.6-27b", 
        temperature: 0.2,
    });

    const prompt = ChatPromptTemplate.fromMessages([
        [
            "system",
            "You are a professional, empathetic medical AI receptionist for City Care clinic. " +
            "Your job is to assist the caller efficiently. " +
            "Use the provided tools if the user is asking to book an appointment, reschedule, check availability, or ask general queries. " +
            "If the user is describing symptoms, ALWAYS use the extract_medical_symptoms tool. " +
            "If the user is describing an emergency, ALWAYS use the emergency_escalation tool immediately. " +
            "IMPORTANT: When you successfully book an appointment using the book_appointment tool, you MUST read the Appointment ID back to the user and tell them to show it when they visit."
        ],
        ["human", "{input}"],
        ["placeholder", "{agent_scratchpad}"],
    ]);

    const agent = createToolCallingAgent({ llm, tools, prompt });
    
    return new AgentExecutor({
        agent,
        tools,
        verbose: true,
    });
}

async function runAgent(transcript, intentName) {
    try {
        const agentExecutor = await initializeAgent();
        const result = await agentExecutor.invoke({
            input: `User Intent: ${intentName}. Transcript: "${transcript}"`
        });
        return result.output;
    } catch (error) {
        console.error("LangChain Agent Error:", error);
        return "I'm sorry, our system is experiencing a technical difficulty. Could you please repeat that?";
    }
}

module.exports = {
    runAgent
};
