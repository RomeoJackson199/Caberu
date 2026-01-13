import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { format } from 'https://esm.sh/date-fns@3.6.0';
import { toZonedTime } from 'https://esm.sh/date-fns-tz@3.1.3';
import { getCorsHeaders, handleCorsPreflightSafe } from "../_shared/cors.ts";

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
        } catch (parseError) {
            return new Response(
                JSON.stringify({ error: 'Invalid JSON body' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const { appointment_id, decision } = body;
        console.log('Received request:', { appointment_id, decision });

        if (!appointment_id || !decision) {
            return new Response(
                JSON.stringify({ error: 'appointment_id and decision are required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Simple query first - just get the appointment
        const { data: appointment, error: aptError } = await supabase
            .from('appointments')
            .select('id, appointment_date, reason, patient_id, dentist_id')
            .eq('id', appointment_id)
            .maybeSingle();

        console.log('Appointment query result:', { appointment, error: aptError?.message });

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

        // Get patient profile with user_id
        let patientEmail = null;
        let patientUserId = null;
        let patientName = '';
        try {
            const { data: patientProfile } = await supabase
                .from('profiles')
                .select('email, first_name, last_name, user_id')
                .eq('id', appointment.patient_id)
                .single();

            patientEmail = patientProfile?.email;
            patientUserId = patientProfile?.user_id;
            patientName = `${patientProfile?.first_name || ''} ${patientProfile?.last_name || ''}`.trim();
            console.log('Patient profile:', patientProfile);
        } catch (profileError) {
            console.error('Failed to get patient profile:', profileError);
        }

        if (!patientEmail || !patientUserId) {
            return new Response(
                JSON.stringify({ success: true, message: 'No patient email or user ID found, skipping notification' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Format date in Brussels timezone using date-fns-tz for reliable conversion
        const CLINIC_TIMEZONE = 'Europe/Brussels';
        const appointmentDate = new Date(appointment.appointment_date);
        const brusselsTime = toZonedTime(appointmentDate, CLINIC_TIMEZONE);
        
        const formattedDate = format(brusselsTime, 'EEEE, MMMM d, yyyy');
        const formattedTime = format(brusselsTime, 'h:mm a');

        // Prepare email content
        const subject = decision === 'approved'
            ? '✅ Your Appointment Has Been Confirmed!'
            : '❌ Appointment Request Update';

        const message = decision === 'approved'
            ? `Great news! Your appointment has been approved.\n\nDate: ${formattedDate}\nTime: ${formattedTime}\nReason: ${appointment.reason || 'General consultation'}`
            : `Unfortunately, your appointment request could not be confirmed.\n\nDate: ${formattedDate}\nTime: ${formattedTime}\n\nPlease book a new appointment at a different time.`;

        // Try to send email but don't fail if it doesn't work
        let emailSent = false;
        try {
            const { error: emailError } = await supabase.functions.invoke('send-email-notification', {
                body: {
                    to: patientEmail,
                    subject: subject,
                    message: message,
                    messageType: 'system',
                    isSystemNotification: true,
                },
            });

            if (!emailError) {
                emailSent = true;
                console.log('Email sent successfully');
            } else {
                console.error('Email error:', emailError);
            }
        } catch (emailCatchError) {
            console.error('Failed to invoke email function:', emailCatchError);
        }

        // Create in-app notification and send push notification
        let notificationCreated = false;
        let pushSent = false;
        try {
            // Create notification in database
            const notificationTitle = decision === 'approved'
                ? 'Appointment Confirmed ✅'
                : 'Appointment Request Update ❌';

            const notificationMessage = decision === 'approved'
                ? `Great news! Your appointment has been confirmed for ${formattedDate} at ${formattedTime}.`
                : `Your appointment request for ${formattedDate} at ${formattedTime} could not be confirmed. Please book a new appointment.`;

            const { data: notificationData, error: notificationError } = await supabase
                .from('notifications')
                .insert({
                    user_id: patientUserId,
                    type: 'appointment',
                    category: decision === 'approved' ? 'success' : 'warning',
                    title: notificationTitle,
                    message: notificationMessage,
                    action_url: `/appointments/${appointment_id}`,
                    metadata: {
                        appointment_id: appointment_id,
                        decision: decision,
                        appointment_date: appointment.appointment_date,
                        formatted_date: formattedDate,
                        formatted_time: formattedTime
                    },
                    is_read: false,
                    created_at: new Date().toISOString(),
                })
                .select('id')
                .single();

            if (!notificationError && notificationData) {
                notificationCreated = true;
                console.log('In-app notification created:', notificationData.id);

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
                            requireInteraction: decision !== 'approved' // Require interaction for declined appointments
                        }
                    });

                    if (!pushError && pushData?.success) {
                        pushSent = true;
                        console.log('Push notification sent successfully');
                    } else {
                        console.error('Push notification error:', pushError);
                    }
                } catch (pushCatchError) {
                    console.error('Failed to send push notification:', pushCatchError);
                }
            } else {
                console.error('Notification creation error:', notificationError);
            }
        } catch (notificationCatchError) {
            console.error('Failed to create notification:', notificationCatchError);
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: emailSent ? `Email sent to ${patientEmail}` : 'Appointment processed but email not sent',
                email_sent: emailSent,
                notification_created: notificationCreated,
                push_sent: pushSent,
                appointment_id: appointment_id,
                decision: decision
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
