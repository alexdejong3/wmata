import dotenv from 'dotenv';
import twilio from 'twilio';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_FROM_NUMBER;

if (!accountSid || !authToken || !fromNumber) {
  throw new Error('Twilio credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER) must be set in environment');
}

const client = twilio(accountSid, authToken);

/**
 * Send an SMS message using Twilio
 * @param to Recipient phone number (E.164 format, e.g. +15551234567)
 * @param body Message text
 * @returns Promise with Twilio message response
 */
export async function sendSms(to: string, body: string) {
  return client.messages.create({
    body,
    from: fromNumber,
    to,
  });
}
