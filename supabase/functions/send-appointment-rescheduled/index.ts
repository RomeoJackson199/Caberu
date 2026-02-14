import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { format } from 'https://esm.sh/date-fns@3.6.0';
import { toZonedTime } from 'https://esm.sh/date-fns-tz@3.1.3';
import { getCorsHeaders, handleCorsPreflightSafe } from "../_shared/cors.ts";
import { sendSms } from '../_shared/sms.ts';

serve(async (req) => {
    const origin = req.headers.get('Origin');
    const corsHeaders = getCorsHeaders(origin);

    const preflightResponse = handleCorsPreflightSafe(req);
    if (preflightResponse) return preflightResponse;

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('Missing environment variables');
            return new Response(
                JSON.stringify({ error: 'Server configuration error' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        let body;
        try {
            body = await req.json();
        } catch {
            return new Response(
                JSON.stringify({ error: 'Invalid JSON body' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const { appointment_id, new_date, new_time } = body;
        console.log('Reschedule notification request:', { appointment_id, new_date, new_time });

        if (!appointment_id || !new_date || !new_time) {
            return new Response(
                JSON.stringify({ error: 'appointment_id, new_date, and new_time are required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Fetch appointment details
        const { data: appointment, error: aptError } = await supabase
            .from('appointments_decrypted')
            .select('id, appointment_date, reason, patient_id, dentist_id')
            .eq('id', appointment_id)
            .maybeSingle();

        if (aptError) {
            console.error('Database error:', aptError);
            return new Response(
                JSON.stringify({ error: 'Database error', details: aptError.message }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        if (!appointment) {
            return new Response(
                JSON.stringify({ error: 'Appointment not found', appointment_id }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Get patient profile
        let patientEmail = null;
        let patientUserId = null;
        let patientName = '';
        let patientPhone: string | null = null;
        try {
            const { data: patientProfile } = await supabase
                .from('profiles')
                .select('email, first_name, last_name, user_id, phone')
                .eq('id', appointment.patient_id)
                .single();

            patientEmail = patientProfile?.email;
            patientUserId = patientProfile?.user_id;
            patientName = `${patientProfile?.first_name || ''} ${patientProfile?.last_name || ''}`.trim();
            patientPhone = patientProfile?.phone || null;
            console.log('Patient profile found:', { patientName, hasPhone: !!patientPhone, hasEmail: !!patientEmail });
        } catch (profileError) {
            console.error('Failed to get patient profile:', profileError);
        }

        if (!patientEmail && !patientPhone) {
            return new Response(
                JSON.stringify({ success: true, message: 'No patient contact info found, skipping notification' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Get dentist name
        let dentistName = 'your dentist';
        try {
            const { data: dentist } = await supabase
                .from('dentists')
                .select('profiles:profile_id(first_name, last_name)')
                .eq('id', appointment.dentist_id)
                .single();

            const rawProfiles = dentist?.profiles;
            let dentistProfile = null;
            if (Array.isArray(rawProfiles) && rawProfiles.length > 0) {
                dentistProfile = rawProfiles[0];
            } else if (rawProfiles && !Array.isArray(rawProfiles)) {
                dentistProfile = rawProfiles as { first_name: string; last_name: string };
            }
            if (dentistProfile) {
                dentistName = `Dr. ${dentistProfile.first_name} ${dentistProfile.last_name}`;
            }
        } catch (dentistError) {
            console.warn('Could not fetch dentist name:', dentistError);
        }

        // Format the new date/time in Brussels timezone
        const CLINIC_TIMEZONE = 'Europe/Brussels';
        const newDateTime = new Date(`${new_date}T${new_time}:00+01:00`);
        const brusselsTime = toZonedTime(newDateTime, CLINIC_TIMEZONE);
        const formattedDate = format(brusselsTime, 'EEEE, MMMM d, yyyy');
        const formattedTime = format(brusselsTime, 'h:mm a');

        // Format old date for reference
        const oldDateTime = new Date(appointment.appointment_date);
        const oldBrusselsTime = toZonedTime(oldDateTime, CLINIC_TIMEZONE);
        const oldFormattedDate = format(oldBrusselsTime, 'EEEE, MMMM d, yyyy');
        const oldFormattedTime = format(oldBrusselsTime, 'h:mm a');

        // Send SMS notification
        let smsSent = false;
        if (patientPhone) {
            try {
                const smsBody = `📅 Your appointment has been rescheduled.\n\nNew date: ${formattedDate}\nNew time: ${formattedTime}\nWith: ${dentistName}\n\nPrevious: ${oldFormattedDate} at ${oldFormattedTime}\n\nPlease arrive 10 minutes early.`;
                const smsResult = await sendSms({
                    to: patientPhone,
                    message: smsBody,
                    messageType: 'appointment_rescheduled',
                });
                smsSent = smsResult.success;
                if (smsResult.success) {
                    console.log('📱 Reschedule SMS sent successfully');
                } else {
                    console.warn('📱 SMS send returned failure:', smsResult.error);
                }
            } catch (smsError) {
                console.warn('📱 SMS send failed (non-critical):', smsError);
            }
        }

        // Send email notification
        let emailSent = false;
        if (patientEmail) {
            try {
                const subject = '📅 Your Appointment Has Been Rescheduled';
                const message = `Your appointment has been rescheduled.\n\nNew Date: ${formattedDate}\nNew Time: ${formattedTime}\nWith: ${dentistName}\n\nPrevious appointment: ${oldFormattedDate} at ${oldFormattedTime}\nReason: ${appointment.reason || 'General consultation'}\n\nPlease arrive 10 minutes early. If this time doesn't work for you, please contact us to find an alternative.`;

                const { error: emailError } = await supabase.functions.invoke('send-email-notification', {
                    body: {
                        to: patientEmail,
                        subject,
                        message,
                        messageType: 'system',
                        isSystemNotification: true,
                    },
                    headers: {
                        Authorization: `Bearer ${supabaseServiceKey}`,
                    },
                });

                if (!emailError) {
                    emailSent = true;
                    console.log('📧 Reschedule email sent successfully');
                } else {
                    console.error('📧 Email error:', emailError);
                }
            } catch (emailCatchError) {
                console.error('📧 Failed to invoke email function:', emailCatchError);
            }
        }

        // Create in-app notification
        let notificationCreated = false;
        let pushSent = false;
        if (patientUserId) {
            try {
                const notificationTitle = 'Appointment Rescheduled 📅';
                const notificationMessage = `Your appointment has been rescheduled to ${formattedDate} at ${formattedTime} with ${dentistName}.`;

                const { data: notificationData, error: notificationError } = await supabase
                    .from('notifications')
                    .insert({
                        user_id: patientUserId,
                        type: 'appointment',
                        category: 'info',
                        title: notificationTitle,
                        message: notificationMessage,
                        action_url: `/appointments/${appointment_id}`,
                        metadata: {
                            appointment_id,
                            action: 'rescheduled',
                            new_date,
                            new_time,
                            old_date: appointment.appointment_date,
                            formatted_date: formattedDate,
                            formatted_time: formattedTime,
                        },
                        is_read: false,
                        created_at: new Date().toISOString(),
                    })
                    .select('id')
                    .single();

                if (!notificationError && notificationData) {
                    notificationCreated = true;
                    console.log('🔔 In-app notification created:', notificationData.id);

                    // Send push notification
                    try {
                        const { data: pushData, error: pushError } = await supabase.functions.invoke('send-push-notifications', {
                            body: {
                                userId: patientUserId,
                                title: notificationTitle,
                                message: notificationMessage,
                                url: `/appointments/${appointment_id}`,
                                type: 'appointment',
                                notificationId: notificationData.id,
                                requireInteraction: false,
                            },
                            headers: {
                                Authorization: `Bearer ${supabaseServiceKey}`,
                            },
                        });

                        if (!pushError && pushData?.success) {
                            pushSent = true;
                            console.log('🔔 Push notification sent successfully');
                        }
                    } catch (pushCatchError) {
                        console.error('Failed to send push notification:', pushCatchError);
                    }
                } else {
                    console.error('Notification creation error:', notificationError);
                }
            } catch (notifCatchError) {
                console.error('Failed to create notification:', notifCatchError);
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Reschedule notifications sent',
                sms_sent: smsSent,
                email_sent: emailSent,
                notification_created: notificationCreated,
                push_sent: pushSent,
                appointment_id,
                new_date: formattedDate,
                new_time: formattedTime,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Unexpected error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error', details: String(error) }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
