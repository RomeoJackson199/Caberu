/**
 * Shared WhatsApp utility using Twilio Messages API
 * Sends WhatsApp messages (template or freeform) to patients.
 * Logs all activity to the whatsapp_messages table.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

interface SendTemplateParams {
  phone: string;
  contentSid: string;
  contentVariables?: Record<string, string>;
  businessId: string;
  patientId?: string;
  templateName?: string;
}

interface SendFreeformParams {
  phone: string;
  body: string;
  businessId: string;
  patientId?: string;
}

interface WhatsAppResult {
  success: boolean;
  sid?: string;
  error?: string;
  windowClosed?: boolean;
}

/**
 * Clean phone number to E.164 format
 */
export function cleanPhoneNumber(phone: string): string | null {
  if (!phone) return null;
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned.startsWith('+')) {
    if (cleaned.startsWith('0')) {
      cleaned = '+32' + cleaned.substring(1);
    } else if (cleaned.length >= 10) {
      cleaned = '+' + cleaned;
    } else {
      return null;
    }
  }
  if (cleaned.replace('+', '').length < 10) return null;
  return cleaned;
}

function getSupabase() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, key);
}

function getTwilioAuth() {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const rawNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER') || '+13609670625';
  // Always ensure the From number has the whatsapp: channel prefix
  const whatsappNumber = rawNumber.startsWith('whatsapp:') ? rawNumber : `whatsapp:${rawNumber}`;
  if (!accountSid || !authToken) return null;
  return { accountSid, authToken, whatsappNumber };
}

async function logMessage(params: {
  businessId: string;
  patientId?: string;
  phone: string;
  direction: 'inbound' | 'outbound';
  body?: string;
  templateSid?: string;
  templateName?: string;
  twilioSid?: string;
  status: string;
}) {
  try {
    const supabase = getSupabase();
    await supabase.from('whatsapp_messages').insert({
      business_id: params.businessId,
      patient_id: params.patientId || null,
      phone: params.phone,
      direction: params.direction,
      body: params.body || null,
      template_sid: params.templateSid || null,
      template_name: params.templateName || null,
      twilio_sid: params.twilioSid || null,
      status: params.status,
      is_read: params.direction === 'outbound',
    });
  } catch (err) {
    console.warn('Failed to log WhatsApp message:', err);
  }
}

/**
 * Send a WhatsApp template message via Twilio Content API
 */
export async function sendWhatsAppTemplate({
  phone, contentSid, contentVariables, businessId, patientId, templateName
}: SendTemplateParams): Promise<WhatsAppResult> {
  const twilio = getTwilioAuth();
  if (!twilio) {
    console.warn('⚠️ Twilio credentials not configured, skipping WhatsApp');
    return { success: false, error: 'Twilio not configured' };
  }

  const cleanedPhone = cleanPhoneNumber(phone);
  if (!cleanedPhone) {
    console.warn(`⚠️ Invalid phone for WhatsApp: ${phone}`);
    return { success: false, error: 'Invalid phone number' };
  }

  try {
    const twilioAuth = btoa(`${twilio.accountSid}:${twilio.authToken}`);
    const url = `https://api.twilio.com/2010-04-01/Accounts/${twilio.accountSid}/Messages.json`;

    const params: Record<string, string> = {
      To: `whatsapp:${cleanedPhone}`,
      From: twilio.whatsappNumber,
      ContentSid: contentSid,
    };

    if (contentVariables && Object.keys(contentVariables).length > 0) {
      params.ContentVariables = JSON.stringify(contentVariables);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(params),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Twilio WhatsApp error:', data);
      await logMessage({
        businessId, patientId, phone: cleanedPhone, direction: 'outbound',
        body: `[Template: ${templateName || contentSid}]`,
        templateSid: contentSid, templateName, status: 'failed',
      });
      return { success: false, error: data.message || `Twilio error ${data.code}` };
    }

    console.log(`✅ WhatsApp template sent to ${cleanedPhone}, SID: ${data.sid}`);
    await logMessage({
      businessId, patientId, phone: cleanedPhone, direction: 'outbound',
      body: `[Template: ${templateName || contentSid}]`,
      templateSid: contentSid, templateName, twilioSid: data.sid, status: 'sent',
    });
    return { success: true, sid: data.sid };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ WhatsApp template send failed:', errMsg);
    await logMessage({
      businessId, patientId, phone: cleanedPhone, direction: 'outbound',
      body: `[Template: ${templateName || contentSid}]`,
      templateSid: contentSid, templateName, status: 'failed',
    });
    return { success: false, error: errMsg };
  }
}

/**
 * Send a WhatsApp freeform text message (only works within 24h window)
 */
export async function sendWhatsAppFreeform({
  phone, body, businessId, patientId
}: SendFreeformParams): Promise<WhatsAppResult> {
  const twilio = getTwilioAuth();
  if (!twilio) {
    return { success: false, error: 'Twilio not configured' };
  }

  const cleanedPhone = cleanPhoneNumber(phone);
  if (!cleanedPhone) {
    return { success: false, error: 'Invalid phone number' };
  }

  // Check 24h session window
  const supabase = getSupabase();
  const { data: session } = await supabase
    .from('whatsapp_sessions')
    .select('last_inbound_at')
    .eq('business_id', businessId)
    .eq('phone', cleanedPhone)
    .maybeSingle();

  if (!session?.last_inbound_at) {
    return { success: false, error: 'No active session — patient has not messaged. Use a template instead.', windowClosed: true };
  }

  const lastInbound = new Date(session.last_inbound_at);
  const hoursSince = (Date.now() - lastInbound.getTime()) / (1000 * 60 * 60);
  if (hoursSince > 24) {
    return { success: false, error: '24h session window expired. Use a template instead.', windowClosed: true };
  }

  try {
    const twilioAuth = btoa(`${twilio.accountSid}:${twilio.authToken}`);
    const url = `https://api.twilio.com/2010-04-01/Accounts/${twilio.accountSid}/Messages.json`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: `whatsapp:${cleanedPhone}`,
        From: twilio.whatsappNumber,
        Body: body,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Twilio WhatsApp freeform error:', data);
      await logMessage({
        businessId, patientId, phone: cleanedPhone, direction: 'outbound',
        body, status: 'failed',
      });
      return { success: false, error: data.message || `Twilio error ${data.code}` };
    }

    console.log(`✅ WhatsApp freeform sent to ${cleanedPhone}, SID: ${data.sid}`);
    await logMessage({
      businessId, patientId, phone: cleanedPhone, direction: 'outbound',
      body, twilioSid: data.sid, status: 'sent',
    });
    return { success: true, sid: data.sid };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ WhatsApp freeform send failed:', errMsg);
    await logMessage({
      businessId, patientId, phone: cleanedPhone, direction: 'outbound',
      body, status: 'failed',
    });
    return { success: false, error: errMsg };
  }
}

// Template SID constants
export const WHATSAPP_TEMPLATES = {
  APPOINTMENT_CONFIRMATION: 'HXb42396a8935679888be901c6511d346e',
  APPOINTMENT_REMINDER_24H: 'HX9f28be56e75885c418443bc07b6ff4bb',
  PAYMENT_REMINDER: 'HXb41dcf0777fc125449965c46564f2f2b',
  PATIENT_WELCOME: 'HX6200ec02afae9fdf60b8f886aa5dcf32',
} as const;
