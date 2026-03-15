import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { getCorsHeaders, handleCorsPreflightSafe } from '../_shared/cors.ts';
import { cleanPhoneNumber } from '../_shared/whatsapp.ts';

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  const preflightResponse = handleCorsPreflightSafe(req);
  if (preflightResponse) return preflightResponse;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Twilio sends webhooks as application/x-www-form-urlencoded
    const formData = await req.formData();
    const fromRaw = formData.get('From')?.toString() || '';
    const toRaw = formData.get('To')?.toString() || '';
    const body = formData.get('Body')?.toString() || '';
    const messageSid = formData.get('MessageSid')?.toString() || '';
    const numMedia = parseInt(formData.get('NumMedia')?.toString() || '0', 10);

    console.log(`📱 WhatsApp webhook: From=${fromRaw}, Body="${body}", SID=${messageSid}`);

    // Extract phone number (remove whatsapp: prefix)
    const phone = cleanPhoneNumber(fromRaw.replace('whatsapp:', ''));
    if (!phone) {
      console.warn('Invalid phone from webhook:', fromRaw);
      return new Response('<Response></Response>', {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Determine which business this belongs to by looking at existing sessions/messages
    let businessId: string | null = null;
    let patientId: string | null = null;

    // First check existing session
    const { data: session } = await supabase
      .from('whatsapp_sessions')
      .select('business_id')
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (session) {
      businessId = session.business_id;
    } else {
      // Check existing messages
      const { data: prevMsg } = await supabase
        .from('whatsapp_messages')
        .select('business_id')
        .eq('phone', phone)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (prevMsg) {
        businessId = prevMsg.business_id;
      }
    }

    // Try to find patient by phone
    const { data: patientProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();

    if (patientProfile) {
      patientId = patientProfile.id;

      // If no business yet, find it from patient's appointments
      if (!businessId) {
        const { data: apt } = await supabase
          .from('appointments')
          .select('business_id')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (apt) businessId = apt.business_id;
      }
    }

    if (!businessId) {
      console.warn('Could not determine business for phone:', phone);
      return new Response('<Response></Response>', {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Store inbound message
    await supabase.from('whatsapp_messages').insert({
      business_id: businessId,
      patient_id: patientId,
      phone,
      direction: 'inbound',
      body,
      twilio_sid: messageSid,
      status: 'received',
      is_read: false,
    });

    // Update/create session (24h window)
    await supabase.from('whatsapp_sessions').upsert({
      business_id: businessId,
      phone,
      last_inbound_at: new Date().toISOString(),
    }, { onConflict: 'business_id,phone' });

    // Auto-action: handle Confirm/Cancel replies for appointment reminders
    const normalizedBody = body.trim().toLowerCase();
    if (normalizedBody === 'confirm' || normalizedBody === 'yes') {
      // Find most recent pending/confirmed appointment for this patient
      if (patientId) {
        const { data: apt } = await supabase
          .from('appointments')
          .select('id, status')
          .eq('patient_id', patientId)
          .eq('business_id', businessId)
          .in('status', ['pending', 'confirmed'])
          .gte('appointment_date', new Date().toISOString())
          .order('appointment_date', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (apt) {
          await supabase
            .from('appointments')
            .update({ status: 'confirmed', updated_at: new Date().toISOString() })
            .eq('id', apt.id);
          console.log(`✅ Appointment ${apt.id} confirmed via WhatsApp by patient ${patientId}`);
        }
      }
    } else if (normalizedBody === 'cancel' || normalizedBody === 'no') {
      if (patientId) {
        const { data: apt } = await supabase
          .from('appointments')
          .select('id, status')
          .eq('patient_id', patientId)
          .eq('business_id', businessId)
          .in('status', ['pending', 'confirmed'])
          .gte('appointment_date', new Date().toISOString())
          .order('appointment_date', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (apt) {
          await supabase
            .from('appointments')
            .update({ status: 'cancelled', updated_at: new Date().toISOString() })
            .eq('id', apt.id);
          console.log(`❌ Appointment ${apt.id} cancelled via WhatsApp by patient ${patientId}`);
        }
      }
    }

    // Return TwiML empty response (no auto-reply)
    return new Response('<Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    return new Response('<Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
});
