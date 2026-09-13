/**
 * Mocks sending SMS and WhatsApp messages.
 * In production, this would use Twilio, SNS, or Meta WhatsApp Cloud API.
 */
async function sendWhatsAppOrSMS(phoneNumber, message) {
    console.log(`[NotificationService] 📱 Sending SMS/WhatsApp to ${phoneNumber}...`);
    console.log(`[NotificationService] ✉️ Message Content: "${message}"`);
    
    // MOCK DELAY
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
        success: true,
        method: 'whatsapp_sms',
        status: 'delivered'
    };
}

/**
 * Mocks sending Email messages.
 * In production, this would use AWS SES or Nodemailer/SendGrid.
 */
async function sendEmail(emailAddress, subject, body) {
    console.log(`[NotificationService] 📧 Sending Email to ${emailAddress}...`);
    console.log(`[NotificationService] 📝 Subject: "${subject}"`);
    
    // MOCK DELAY
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
        success: true,
        method: 'email',
        status: 'delivered'
    };
}

export {
    sendWhatsAppOrSMS,
    sendEmail
};
