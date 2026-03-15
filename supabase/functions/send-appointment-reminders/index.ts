import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { getCorsHeaders, handleCorsPreflightSafe } from '../_shared/cors.ts';
import { format as formatTz } from "https://esm.sh/date-fns-tz@3.2.0";
import { toZonedTime } from "https://esm.sh/date-fns-tz@3.2.0";
import { sendWhatsAppTemplate, WHATSAPP_TEMPLATES } from '../_shared/whatsapp.ts';

const CLINIC_TIMEZONE = 'Europe/Brussels';

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  
  const preflightResponse = handleCorsPreflightSafe(req);
  if (preflightResponse) return preflightResponse;

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get pending reminders that need to be sent
    const now = new Date().toISOString();
    const { data: reminders, error: remindersError } = await supabase
      .from("appointment_reminders")
      .select(`id, appointment_id, reminder_type, notification_method`)
      .eq("status", "pending")
      .lte("scheduled_for", now)
      .limit(50);

    if (remindersError) {
      console.error("Error fetching reminders:", remindersError);
      throw remindersError;
    }

    const appointmentIds = [...new Set((reminders || []).map(r => r.appointment_id))];
    
    const { data: decryptedAppointments, error: aptError } = await supabase
      .from("appointments_decrypted")
      .select(`
        id, appointment_date, reason, patient_id, dentist_id, business_id,
        profiles!appointments_patient_id_fkey (id, first_name, last_name, phone),
        dentists (id, profiles (first_name, last_name))
      `)
      .in('id', appointmentIds);

    if (aptError) {
      console.error("Error fetching decrypted appointments:", aptError);
      throw aptError;
    }

    const appointmentMap = new Map((decryptedAppointments || []).map(a => [a.id, a]));

    console.log(`Found ${reminders?.length || 0} reminders to send`);

    const results = { sent: 0, failed: 0, errors: [] as string[] };

    for (const reminder of reminders || []) {
      try {
        const appointment = appointmentMap.get(reminder.appointment_id) as any;
        if (!appointment) {
          await supabase.from("appointment_reminders")
            .update({ status: "failed", error_message: "Appointment not found" })
            .eq("id", reminder.id);
          results.failed++;
          continue;
        }

        const patient = appointment.profiles;
        if (!patient?.phone) {
          await supabase.from("appointment_reminders")
            .update({ status: "failed", error_message: "No patient phone available" })
            .eq("id", reminder.id);
          results.failed++;
          continue;
        }

        // Send WhatsApp reminder template
        const waResult = await sendWhatsAppTemplate({
          phone: patient.phone,
          contentSid: WHATSAPP_TEMPLATES.APPOINTMENT_REMINDER_24H,
          contentVariables: { "1": patient.first_name || 'Patient' },
          businessId: appointment.business_id,
          patientId: patient.id,
          templateName: 'appointment_reminder_24h',
        });

        if (!waResult.success) {
          await supabase.from("appointment_reminders")
            .update({ status: "failed", error_message: waResult.error })
            .eq("id", reminder.id);
          results.failed++;
          results.errors.push(`Reminder ${reminder.id}: ${waResult.error}`);
        } else {
          // Also send push notification if patient has a user_id
          if (patient.user_id) {
            try {
              const appointmentDate = new Date(appointment.appointment_date);
              const brusselsDate = toZonedTime(appointmentDate, CLINIC_TIMEZONE);
              const formattedDate = formatTz(brusselsDate, 'EEEE, MMMM d, yyyy', { timeZone: CLINIC_TIMEZONE });
              const formattedTime = formatTz(brusselsDate, 'h:mm a', { timeZone: CLINIC_TIMEZONE });
              const dentist = appointment.dentists?.profiles;
              const reminderText = reminder.reminder_type === "24h" ? "in 24 hours"
                : reminder.reminder_type === "2h" ? "in 2 hours" : "in 1 hour";

              await supabase.functions.invoke("send-push-notifications", {
                body: {
                  userId: patient.user_id,
                  title: `Appointment Reminder`,
                  message: `Your appointment with Dr. ${dentist?.first_name || ''} ${dentist?.last_name || ''} is ${reminderText} on ${formattedDate} at ${formattedTime}`,
                  url: '/appointments',
                  tag: `appointment-reminder-${reminder.id}`,
                  type: 'appointment_reminder',
                  requireInteraction: reminder.reminder_type === '2h' || reminder.reminder_type === '1h',
                },
                headers: { Authorization: `Bearer ${supabaseServiceKey}` },
              });
            } catch (pushErr) {
              console.warn(`Push notification error for reminder ${reminder.id}:`, pushErr);
            }
          }

          await supabase.from("appointment_reminders")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", reminder.id);
          results.sent++;
          console.log(`Successfully sent reminder ${reminder.id}`);
        }
      } catch (error) {
        console.error(`Error processing reminder ${reminder.id}:`, error);
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        await supabase.from("appointment_reminders")
          .update({ status: "failed", error_message: errMsg })
          .eq("id", reminder.id);
        results.failed++;
        results.errors.push(`Reminder ${reminder.id}: ${errMsg}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true, results,
        message: `Processed ${results.sent + results.failed} reminders: ${results.sent} sent, ${results.failed} failed`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error in send-appointment-reminders:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
