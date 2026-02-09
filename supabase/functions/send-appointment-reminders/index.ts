import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { getCorsHeaders, handleCorsPreflightSafe } from '../_shared/cors.ts';
import { format as formatTz } from "https://esm.sh/date-fns-tz@3.2.0";
import { toZonedTime } from "https://esm.sh/date-fns-tz@3.2.0";

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
      .select(`
        id,
        appointment_id,
        reminder_type,
        notification_method
      `)
      .eq("status", "pending")
      .lte("scheduled_for", now)
      .limit(50);

    if (remindersError) {
      console.error("Error fetching reminders:", remindersError);
      throw remindersError;
    }

    // Fetch decrypted appointment details separately for each reminder
    const appointmentIds = [...new Set((reminders || []).map(r => r.appointment_id))];
    
    const { data: decryptedAppointments, error: aptError } = await supabase
      .from("appointments_decrypted")
      .select(`
        id,
        appointment_date,
        reason,
        patient_id,
        dentist_id,
        profiles!appointments_patient_id_fkey (
          id,
          user_id,
          email,
          first_name,
          last_name,
          phone
        ),
        dentists (
          id,
          clinic_address,
          profiles (
            first_name,
            last_name
          )
        )
      `)
      .in('id', appointmentIds);

    if (aptError) {
      console.error("Error fetching decrypted appointments:", aptError);
      throw aptError;
    }

    // Index appointments by id for quick lookup
    const appointmentMap = new Map((decryptedAppointments || []).map(a => [a.id, a]));

    console.log(`Found ${reminders?.length || 0} reminders to send`);

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const reminder of reminders || []) {
      try {
        const appointment = appointmentMap.get(reminder.appointment_id) as any;
        if (!appointment) {
          console.log(`Skipping reminder ${reminder.id}: Appointment not found`);
          await supabase
            .from("appointment_reminders")
            .update({ status: "failed", error_message: "Appointment not found" })
            .eq("id", reminder.id);
          results.failed++;
          continue;
        }

        const patient = appointment.profiles;
        const dentist = appointment.dentists.profiles;

        if (!patient?.email) {
          console.log(`Skipping reminder ${reminder.id}: No patient email`);
          await supabase
            .from("appointment_reminders")
            .update({ 
              status: "failed", 
              error_message: "No patient email available" 
            })
            .eq("id", reminder.id);
          results.failed++;
          continue;
        }

        // Format the appointment date in Brussels timezone
        const appointmentDate = new Date(appointment.appointment_date);
        const brusselsDate = toZonedTime(appointmentDate, CLINIC_TIMEZONE);
        const formattedDate = formatTz(brusselsDate, 'EEEE, MMMM d, yyyy', { timeZone: CLINIC_TIMEZONE });
        const formattedTime = formatTz(brusselsDate, 'h:mm a', { timeZone: CLINIC_TIMEZONE });

        // Determine reminder timing text
        const reminderText = reminder.reminder_type === "24h" 
          ? "in 24 hours"
          : reminder.reminder_type === "2h"
          ? "in 2 hours"
          : "in 1 hour";

        // Send email notification
        const { error: emailError } = await supabase.functions.invoke(
          "send-email-notification",
          {
            body: {
              to: patient.email,
              subject: `Appointment Reminder - ${formattedDate}`,
              message: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #2D5D7B;">Appointment Reminder</h2>

                  <p>Hello ${patient.first_name},</p>

                  <p>This is a friendly reminder that your dental appointment is coming up ${reminderText}.</p>

                  <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin: 0 0 12px 0; color: #1e293b;">Appointment Details:</h3>
                    <table style="width: 100%;">
                      <tr>
                        <td style="padding: 8px 0; font-weight: bold; color: #475569;">Date:</td>
                        <td style="padding: 8px 0;">${formattedDate}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-weight: bold; color: #475569;">Time:</td>
                        <td style="padding: 8px 0;">${formattedTime}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-weight: bold; color: #475569;">Dentist:</td>
                        <td style="padding: 8px 0;">Dr. ${dentist.first_name} ${dentist.last_name}</td>
                      </tr>
                      ${appointment.reason ? `
                        <tr>
                          <td style="padding: 8px 0; font-weight: bold; color: #475569;">Reason:</td>
                          <td style="padding: 8px 0;">${appointment.reason}</td>
                        </tr>
                      ` : ''}
                    </table>
                  </div>

                  <div style="background: #dbeafe; padding: 16px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #1e40af;">
                      <strong>Important:</strong> Please arrive 10 minutes early for check-in.
                      If you need to reschedule, please contact us at least 24 hours in advance.
                    </p>
                  </div>

                  <p style="color: #64748b; font-size: 14px; margin-top: 24px;">
                    Thank you for choosing our dental practice. We look forward to seeing you soon!
                  </p>
                </div>
              `,
              messageType: "appointment_reminder",
              patientId: patient.id,
              dentistId: appointment.dentist_id,
              isSystemNotification: true,
            },
            headers: {
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
          }
        );

        if (emailError) {
          console.error(`Error sending email for reminder ${reminder.id}:`, emailError);
          await supabase
            .from("appointment_reminders")
            .update({
              status: "failed",
              error_message: emailError.message
            })
            .eq("id", reminder.id);
          results.failed++;
          results.errors.push(`Reminder ${reminder.id}: ${emailError.message}`);
        } else {
          // Also send push notification if patient has a user_id
          if (patient.user_id) {
            try {
              const { error: pushError } = await supabase.functions.invoke(
                "send-push-notifications",
                {
                  body: {
                    userId: patient.user_id,
                    title: `Appointment Reminder`,
                    message: `Your appointment with Dr. ${dentist.first_name} ${dentist.last_name} is ${reminderText} on ${formattedDate} at ${formattedTime}`,
                    url: '/appointments',
                    tag: `appointment-reminder-${reminder.id}`,
                    type: 'appointment_reminder',
                    requireInteraction: reminder.reminder_type === '2h' || reminder.reminder_type === '1h',
                  },
                  headers: {
                    Authorization: `Bearer ${supabaseServiceKey}`,
                  },
                }
              );

              if (pushError) {
                console.warn(`Push notification failed for reminder ${reminder.id}:`, pushError.message);
                // Don't fail the reminder if push fails, email was still sent
              } else {
                console.log(`Push notification sent for reminder ${reminder.id}`);
              }
            } catch (pushErr) {
              console.warn(`Push notification error for reminder ${reminder.id}:`, pushErr);
              // Don't fail the reminder if push fails, email was still sent
            }
          }

          await supabase
            .from("appointment_reminders")
            .update({
              status: "sent",
              sent_at: new Date().toISOString()
            })
            .eq("id", reminder.id);
          results.sent++;
          console.log(`Successfully sent reminder ${reminder.id}`);
        }
      } catch (error) {
        console.error(`Error processing reminder ${reminder.id}:`, error);
        const reminderErrorMessage = error instanceof Error ? error.message : 'Unknown error';
        await supabase
          .from("appointment_reminders")
          .update({ 
            status: "failed", 
            error_message: reminderErrorMessage 
          })
          .eq("id", reminder.id);
        results.failed++;
        results.errors.push(`Reminder ${reminder.id}: ${reminderErrorMessage}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: `Processed ${results.sent + results.failed} reminders: ${results.sent} sent, ${results.failed} failed`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in send-appointment-reminders:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
