import { google } from 'googleapis';
import * as configService from '../../core/services/configService.js';

/**
 * Logs every conversation turn to a Google Sheet for human front-desk review.
 * @param {string} sessionId 
 * @param {string} userTranscript 
 * @param {string} botResponse 
 * @param {string} currentState 
 */
export async function logConversation(sessionId, userTranscript, botResponse, currentState) {
    try {
        const credentialsJson = await configService.getSecret('GOOGLE_SHEETS_CREDENTIALS') || process.env.GOOGLE_SHEETS_CREDENTIALS;
        const spreadsheetId = await configService.getSecret('GOOGLE_SHEET_ID') || process.env.GOOGLE_SHEET_ID;

        if (!credentialsJson || !spreadsheetId) {
            console.log(`[SheetsIntegration] 📊 Skipping real Sheets sync (credentials missing). MOCK: Logged state [${currentState}] for ${sessionId}`);
            return;
        }

        const credentials = JSON.parse(credentialsJson);
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        
        const timestamp = new Date().toISOString();
        const values = [
            [timestamp, sessionId, currentState, userTranscript, botResponse]
        ];

        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Logs!A:E', // Assuming a sheet named "Logs"
            valueInputOption: 'USER_ENTERED',
            requestBody: { values },
        });

        console.log(`[SheetsIntegration] 📊 Successfully logged conversation to Google Sheets`);
    } catch (error) {
        console.error(`[SheetsIntegration] ❌ Error logging to Google Sheets:`, error.message);
    }
}

/**
 * Legacy mocked function for appending generic log data
 */
export async function appendToGoogleSheet(logData) {
    console.log(`[SheetsIntegration] 📊 Appending log to Google Sheet for human review...`);
    console.log(`[SheetsIntegration] 📋 Data appended:`, JSON.stringify(logData));
    await new Promise(resolve => setTimeout(resolve, 300));
    return { success: true, sheetUrl: "https://docs.google.com/spreadsheets/d/mock-sheet-url" };
}
