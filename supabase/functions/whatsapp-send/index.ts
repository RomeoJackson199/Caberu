import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { getCorsHeaders, handleCorsPreflightSafe } from '../_shared/cors.ts';
import {
  sendWhatsAppTemplate,
  sendWhatsAppFreeform,
  cleanPhoneNumber,
  WHATSAPP_TEMPLATES,
} from '../_shared/whatsapp.ts';

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  const preflightResponse = handleCorsPreflightSafe(req);
  if (preflightResponse) return preflightResponse;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'send_template': {
        const { phone, content_sid, content_variables, business_id, patient_id, template_name } = body;
        if (!phone || !content_sid || !business_id) {
          return new Response(JSON.stringify({ error: 'phone, content_sid, business_id required' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const result = await sendWhatsAppTemplate({
          phone, contentSid: content_sid, contentVariables: content_variables,
          businessId: business_id, patientId: patient_id, templateName: template_name,
        });
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'send_freeform': {
        const { phone, message, business_id, patient_id } = body;
        if (!phone || !message || !business_id) {
          return new Response(JSON.stringify({ error: 'phone, message, business_id required' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const result = await sendWhatsAppFreeform({
          phone, body: message, businessId: business_id, patientId: patient_id,
        });
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'mark_read': {
        const { business_id, patient_id, phone: markPhone } = body;
        if (!business_id) {
          return new Response(JSON.stringify({ error: 'business_id required' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const query = supabase.from('whatsapp_messages')
          .update({ is_read: true, updated_at: new Date().toISOString() })
          .eq('business_id', business_id)
          .eq('direction', 'inbound')
          .eq('is_read', false);
        
        if (patient_id) query.eq('patient_id', patient_id);
        else if (markPhone) query.eq('phone', cleanPhoneNumber(markPhone) || markPhone);

        await query;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_conversations': {
        const { business_id } = body;
        if (!business_id) {
          return new Response(JSON.stringify({ error: 'business_id required' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get all messages grouped by phone, with last message and unread count
        const { data: messages, error: msgError } = await supabase
          .from('whatsapp_messages')
          .select('id, phone, body, direction, template_name, is_read, created_at, patient_id')
          .eq('business_id', business_id)
          .order('created_at', { ascending: false })
          .limit(500);

        if (msgError) throw msgError;

        // Get sessions for 24h window check
        const { data: sessions } = await supabase
          .from('whatsapp_sessions')
          .select('phone, last_inbound_at')
          .eq('business_id', business_id);

        const sessionMap = new Map((sessions || []).map(s => [s.phone, s.last_inbound_at]));

        // Group by phone
        const convMap = new Map<string, {
          phone: string;
          patient_id: string | null;
          last_message: string;
          last_message_at: string;
          last_direction: string;
          unread_count: number;
          window_open: boolean;
        }>();

        for (const msg of messages || []) {
          if (!convMap.has(msg.phone)) {
            const lastInbound = sessionMap.get(msg.phone);
            const windowOpen = lastInbound
              ? (Date.now() - new Date(lastInbound).getTime()) / (1000 * 60 * 60) < 24
              : false;

            convMap.set(msg.phone, {
              phone: msg.phone,
              patient_id: msg.patient_id,
              last_message: msg.body || `[Template: ${msg.template_name || 'message'}]`,
              last_message_at: msg.created_at,
              last_direction: msg.direction,
              unread_count: 0,
              window_open: windowOpen,
            });
          }
          if (msg.direction === 'inbound' && !msg.is_read) {
            const conv = convMap.get(msg.phone)!;
            conv.unread_count++;
          }
        }

        // Fetch patient names
        const patientIds = [...new Set([...convMap.values()].map(c => c.patient_id).filter(Boolean))];
        let patientNames: Record<string, string> = {};
        if (patientIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', patientIds);
          for (const p of profiles || []) {
            patientNames[p.id] = `${p.first_name || ''} ${p.last_name || ''}`.trim();
          }
        }

        const conversations = [...convMap.values()].map(c => ({
          ...c,
          patient_name: c.patient_id ? (patientNames[c.patient_id] || c.phone) : c.phone,
        }));

        // Sort by last message time
        conversations.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

        return new Response(JSON.stringify({ conversations }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_messages': {
        const { business_id, phone: msgPhone, patient_id: msgPatientId } = body;
        if (!business_id) {
          return new Response(JSON.stringify({ error: 'business_id required' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        let query = supabase.from('whatsapp_messages')
          .select('*')
          .eq('business_id', business_id)
          .order('created_at', { ascending: true })
          .limit(200);

        if (msgPhone) {
          const cleaned = cleanPhoneNumber(msgPhone) || msgPhone;
          query = query.eq('phone', cleaned);
        } else if (msgPatientId) {
          query = query.eq('patient_id', msgPatientId);
        }

        const { data, error } = await query;
        if (error) throw error;

        return new Response(JSON.stringify({ messages: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'send_reminders': {
        // Cron action: send 24h appointment reminders via WhatsApp
        const now = new Date();
        const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        // Find appointments in next 24h that haven't been reminded via WhatsApp
        const { data: upcomingApts, error: aptErr } = await supabase
          .from('appointments_decrypted')
          .select(`
            id, appointment_date, reason, patient_id, dentist_id, business_id,
            profiles!appointments_patient_id_fkey(id, first_name, last_name, phone),
            dentists(profiles(first_name, last_name))
          `)
          .gte('appointment_date', now.toISOString())
          .lte('appointment_date', in24h.toISOString())
          .in('status', ['confirmed', 'pending']);

        if (aptErr) {
          console.error('Error fetching appointments for WhatsApp reminders:', aptErr);
          throw aptErr;
        }

        let sent = 0, skipped = 0;
        for (const apt of upcomingApts || []) {
          const patient = apt.profiles as any;
          if (!patient?.phone) { skipped++; continue; }

          // Check if we already sent a WhatsApp reminder for this appointment
          const { data: existingReminder } = await supabase
            .from('whatsapp_messages')
            .select('id')
            .eq('business_id', apt.business_id)
            .eq('template_name', 'appointment_reminder_24h')
            .eq('patient_id', patient.id)
            .gte('created_at', new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString())
            .limit(1);

          if (existingReminder && existingReminder.length > 0) { skipped++; continue; }

          await sendWhatsAppTemplate({
            phone: patient.phone,
            contentSid: WHATSAPP_TEMPLATES.APPOINTMENT_REMINDER_24H,
            contentVariables: { "1": patient.first_name || 'Patient' },
            businessId: apt.business_id,
            patientId: patient.id,
            templateName: 'appointment_reminder_24h',
          });
          sent++;
        }

        return new Response(JSON.stringify({ success: true, sent, skipped }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
