import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { getCorsHeaders, handleCorsPreflightSafe } from "../_shared/cors.ts";
import { sendWhatsAppTemplate, WHATSAPP_TEMPLATES } from '../_shared/whatsapp.ts';

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  const preflightResponse = handleCorsPreflightSafe(req);
  if (preflightResponse) return preflightResponse;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, serviceKey);

    const { payment_request_ids, template_key, dentist_id } = await req.json();
    if (!Array.isArray(payment_request_ids) || payment_request_ids.length === 0) {
      throw new Error('payment_request_ids required');
    }

    const { data: requests, error } = await supabase
      .from('payment_requests')
      .select('id, patient_email, description, amount, status, patient_id, dentist_id, stripe_session_id')
      .in('id', payment_request_ids);
    if (error) throw error;

    const results: Record<string, { ok: boolean; message?: string }> = {};

    if (!requests || requests.length === 0) {
      return new Response(JSON.stringify({ success: true, results: {} }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    for (const pr of (requests || [])) {
      try {
        // Get patient phone for WhatsApp
        let patientPhone: string | null = null;
        let businessId: string | null = null;

        if (pr.patient_id) {
          const { data: patientProfile } = await supabase
            .from('profiles')
            .select('phone')
            .eq('id', pr.patient_id)
            .single();
          patientPhone = patientProfile?.phone || null;
        }

        // Get business_id from dentist
        if (pr.dentist_id) {
          const { data: dentist } = await supabase
            .from('dentists')
            .select('business_id')
            .eq('id', pr.dentist_id)
            .single();
          businessId = dentist?.business_id || null;
        }

        // Send WhatsApp payment reminder template
        if (patientPhone && businessId) {
          const waResult = await sendWhatsAppTemplate({
            phone: patientPhone,
            contentSid: WHATSAPP_TEMPLATES.PAYMENT_REMINDER,
            contentVariables: { "1": `€${(pr.amount / 100).toFixed(2)}` },
            businessId,
            patientId: pr.patient_id,
            templateName: 'payment_reminder',
          });

          if (waResult.success) {
            console.log(`✅ WhatsApp payment reminder sent for ${pr.id}`);
          } else {
            console.warn(`WhatsApp failed for ${pr.id}: ${waResult.error}`);
          }
        }

        await supabase
          .from('payment_reminders')
          .insert({
            payment_request_id: pr.id,
            template_key: template_key || 'friendly',
            channel: 'whatsapp',
            status: 'sent',
            sent_at: new Date().toISOString(),
            metadata: { channel: 'whatsapp' }
          });

        await supabase
          .from('payment_requests')
          .update({ last_reminder_at: new Date().toISOString() })
          .eq('id', pr.id);

        results[pr.id] = { ok: true };
      } catch (e) {
        results[pr.id] = { ok: false, message: (e as Error).message };
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
