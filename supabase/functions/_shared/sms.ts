/**
 * Shared SMS utility using Twilio Messaging API
 * Sends plain-text SMS messages to patients alongside email notifications.
 * Logs all SMS activity to the sms_logs table.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

interface SendSmsParams {
  to: string;       // E.164 format phone number
  message: string;  // Plain text message body (max ~1600 chars for multi-segment)
  messageType?: string; // e.g., 'appointment_confirmed', 'reminder', etc.
  businessId?: string;  // Optional business context
}

interface SendSmsResult {
  success: boolean;
  sid?: string;
  error?: string;
}

/**
 * Strip HTML tags and convert to plain text for SMS
 */
export function htmlToPlainText(html: string): string {
  return html
    // Replace <br> and block-level tags with newlines
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|tr|li)>/gi, '\n')
    .replace(/<(p|div|h[1-6]|tr|li)[^>]*>/gi, '')
    // Remove remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode common HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Clean up whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Clean phone number to E.164 format
 */
function cleanPhoneNumber(phone: string): string | null {
  if (!phone) return null;
  
  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Ensure it starts with +
  if (!cleaned.startsWith('+')) {
    // Assume Belgian number if starts with 0
    if (cleaned.startsWith('0')) {
      cleaned = '+32' + cleaned.substring(1);
    } else if (cleaned.length >= 10) {
      cleaned = '+' + cleaned;
    } else {
      return null;
    }
  }
  
  // Basic validation: must be at least 10 digits
  if (cleaned.replace('+', '').length < 10) {
    return null;
  }
  
  return cleaned;
}

/**
 * Log SMS to database
 */
async function logSms(params: {
  recipientPhone: string;
  messageBody: string;
  messageType: string;
  businessId?: string;
  twilioSid?: string;
  status: string;
  errorMessage?: string;
}): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) return;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    await supabase.from('sms_logs').insert({
      recipient_phone: params.recipientPhone,
      message_body: params.messageBody,
      message_type: params.messageType,
      business_id: params.businessId || null,
      twilio_sid: params.twilioSid || null,
      status: params.status,
      error_message: params.errorMessage || null,
    });
  } catch (err) {
    console.warn('Failed to log SMS to database:', err);
  }
}

/**
 * Send an SMS message via Twilio Messaging API
 */
export async function sendSms({ to, message, messageType = 'notification', businessId }: SendSmsParams): Promise<SendSmsResult> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!accountSid || !authToken || !fromNumber) {
    console.warn('⚠️ Twilio SMS credentials not configured, skipping SMS');
    await logSms({
      recipientPhone: to,
      messageBody: message,
      messageType,
      businessId,
      status: 'skipped',
      errorMessage: 'SMS not configured',
    });
    return { success: false, error: 'SMS not configured' };
  }

  const cleanedTo = cleanPhoneNumber(to);
  if (!cleanedTo) {
    console.warn(`⚠️ Invalid phone number for SMS: ${to}`);
    await logSms({
      recipientPhone: to,
      messageBody: message,
      messageType,
      businessId,
      status: 'failed',
      errorMessage: 'Invalid phone number',
    });
    return { success: false, error: 'Invalid phone number' };
  }

  // Truncate message to SMS-safe length (keep under 1600 chars / ~10 segments)
  const smsMessage = message.length > 1500 ? message.substring(0, 1497) + '...' : message;

  try {
    const twilioAuth = btoa(`${accountSid}:${authToken}`);
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: cleanedTo,
        From: fromNumber,
        Body: smsMessage,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Twilio SMS error:', data);
      await logSms({
        recipientPhone: cleanedTo,
        messageBody: smsMessage,
        messageType,
        businessId,
        status: 'failed',
        errorMessage: data.message || `Twilio error ${data.code}`,
      });
      return { success: false, error: data.message || `Twilio error ${data.code}` };
    }

    console.log(`✅ SMS sent to ${cleanedTo}, SID: ${data.sid}`);
    await logSms({
      recipientPhone: cleanedTo,
      messageBody: smsMessage,
      messageType,
      businessId,
      twilioSid: data.sid,
      status: 'sent',
    });
    return { success: true, sid: data.sid };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown SMS error';
    console.error('❌ SMS send failed:', errMsg);
    await logSms({
      recipientPhone: cleanedTo || to,
      messageBody: smsMessage,
      messageType,
      businessId,
      status: 'failed',
      errorMessage: errMsg,
    });
    return { success: false, error: errMsg };
  }
}
