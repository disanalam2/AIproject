const configService = require('./configService');

/**
 * Mocks creating a calendar event and returning a meeting link/confirmation.
 * In production, this would use googleapis (OAuth2) or Microsoft Graph API.
 */
async function syncToCalendar(appointmentDetails) {
    const config = await configService.getConfiguration();
    const activeCalendar = config.active_calendar || 'google_cal';

    console.log(`[CalendarService] Syncing to ${activeCalendar} for patient ${appointmentDetails.patientName}...`);
    
    // MOCK SYNC LOGIC
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const meetLink = `https://meet.google.com/mock-link-${Math.random().toString(36).substring(4)}`;

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
