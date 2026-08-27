const prisma = require('../prismaClient');

/**
 * Mocks triggering an outbound call via Amazon Connect or Twilio API.
 */
async function triggerOutboundCall(phoneNumber, prompt) {
    console.log(`[OutboundService] 📞 Dialing ${phoneNumber}...`);
    console.log(`[OutboundService] 🤖 AI Initial Prompt: "${prompt}"`);
    
    // MOCK API CALL
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
        success: true,
        status: 'call_initiated'
    };
}

/**
 * Feature 9: Missed Call Handling
 * Automatically calls back a number that missed a call.
 */
async function handleMissedCall(phoneNumber) {
    console.log(`[OutboundService] Missed call detected from ${phoneNumber}. Initiating callback...`);
    const prompt = "Hello! I noticed we just missed a call from this number. I am the AI receptionist at City Care clinic. How can I help you today?";
    return await triggerOutboundCall(phoneNumber, prompt);
}

/**
 * Feature 8: Reminders follow up
 * Fetches appointments for tomorrow and calls patients to remind them.
 */
async function runDailyReminders() {
    console.log(`[OutboundService] Running Daily Appointment Reminders...`);
    
    // In a real scenario, we would query the database for appointments occurring tomorrow.
    // Since we are mocking the time query:
    const upcomingAppointments = await prisma.appointment.findMany({
        where: {
            status: "CONFIRMED"
        },
        take: 3 // Limit for mock purposes
    });

    for (const appt of upcomingAppointments) {
        const prompt = `Hello ${appt.patientName}, this is an automated reminder from City Care Clinic for your appointment scheduled on ${appt.appointmentDate.toLocaleDateString()}. Please press 1 to confirm or say 'reschedule' to change the time.`;
        await triggerOutboundCall(appt.patientPhone, prompt);
    }
    
    return { success: true, callsMade: upcomingAppointments.length };
}

/**
 * Feature 7: Re-engage Inactive Patients
 * Fetches patients who haven't had an appointment in > 6 months and calls them.
 */
async function reEngageInactivePatients() {
    console.log(`[OutboundService] Running Inactive Patient Re-engagement...`);
    
    // Mocking finding patients from 6 months ago
    const mockInactivePatients = [
        { name: "John Doe", phone: "+1234567890" },
        { name: "Jane Smith", phone: "+0987654321" }
    ];

    for (const patient of mockInactivePatients) {
        const prompt = `Hello ${patient.name}, this is the City Care clinic. We noticed it's been over 6 months since your last routine checkup. Would you like me to help you schedule a health screening today?`;
        await triggerOutboundCall(patient.phone, prompt);
    }
    
    return { success: true, callsMade: mockInactivePatients.length };
}

module.exports = {
    handleMissedCall,
    runDailyReminders,
    reEngageInactivePatients
};
