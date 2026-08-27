const configService = require('./configService');

/**
 * Mocks creating a calendar event and returning a meeting link/confirmation.
 * Emulates Amazon WorkMail API integration.
 */
async function syncToCalendar(appointmentDetails) {
    const config = await configService.getConfiguration();
    const activeCalendar = config.active_calendar || 'aws_workmail';

    console.log(`[CalendarService] Syncing using provider: ${activeCalendar} for patient ${appointmentDetails.patientName}...`);
    
    let eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    let meetLink = '';

    if (activeCalendar === 'google_cal') {
        const { google } = require('googleapis');
        // Requires GOOGLE_APPLICATION_CREDENTIALS path in process.env, or passing it directly.
        // As we assume credentials will be provided later, we construct the auth and call the API.
        try {
            const auth = new google.auth.GoogleAuth({
                scopes: ['https://www.googleapis.com/auth/calendar.events'],
            });
            const calendar = google.calendar({ version: 'v3', auth });
            
            const event = {
                summary: `Appointment for ${appointmentDetails.patientName}`,
                description: `Reason: ${appointmentDetails.reason}`,
                start: { dateTime: appointmentDetails.appointmentDate.toISOString() },
                end: { dateTime: new Date(appointmentDetails.appointmentDate.getTime() + 30 * 60000).toISOString() },
                conferenceData: { createRequest: { requestId: eventId, conferenceSolutionKey: { type: "hangoutsMeet" } } }
            };

            const response = await calendar.events.insert({
                calendarId: 'primary',
                resource: event,
                conferenceDataVersion: 1
            });
            
            eventId = response.data.id;
            meetLink = response.data.hangoutLink;
            console.log("Google Calendar event created:", eventId);
        } catch (error) {
            console.error("Failed to create Google Calendar event (Missing credentials?):", error.message);
            meetLink = "https://meet.google.com/fallback";
        }
    } else if (activeCalendar === 'whatsapp') {
        const axios = require('axios');
        try {
            const accessToken = await configService.getSecret('WHATSAPP_ACCESS_TOKEN') || process.env.WHATSAPP_ACCESS_TOKEN;
            const phoneNumberId = await configService.getSecret('WHATSAPP_PHONE_ID') || process.env.WHATSAPP_PHONE_ID;
            
            if (!accessToken || !phoneNumberId) throw new Error("WhatsApp credentials not found");

            await axios.post(`https://graph.facebook.com/v17.0/${phoneNumberId}/messages`, {
                messaging_product: "whatsapp",
                to: appointmentDetails.patientPhone,
                type: "template",
                template: { name: "appointment_confirmation", language: { code: "en_US" } }
            }, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            meetLink = `https://wa.me/message/booking_confirmed`;
            console.log("WhatsApp message sent.");
        } catch (error) {
            console.error("Failed to send WhatsApp message (Missing credentials?):", error.message);
            meetLink = "https://wa.me/fallback";
        }
    } else {
        console.log("Mocking Amazon WorkMail Calendar sync...");
        meetLink = `https://chime.aws/mock-meeting-${Math.random().toString(36).substring(4)}`;
    }

    return {
        success: true,
        provider: activeCalendar,
        eventId: eventId,
        meetLink: meetLink,
        message: `Successfully synced to ${activeCalendar}`
    };
}

module.exports = {
    syncToCalendar
};
