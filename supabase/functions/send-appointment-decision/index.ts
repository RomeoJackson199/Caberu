import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { format } from 'https://esm.sh/date-fns@3.6.0';
import { toZonedTime } from 'https://esm.sh/date-fns-tz@3.1.3';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

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

        // Get patient email separately
        let patientEmail = null;
        try {
            const { data: patientProfile } = await supabase
                .from('profiles')
                .select('email, first_name, last_name')
                .eq('id', appointment.patient_id)
                .single();

            patientEmail = patientProfile?.email;
            console.log('Patient profile:', patientProfile);
        } catch (profileError) {
            console.error('Failed to get patient profile:', profileError);
        }

        if (!patientEmail) {
            return new Response(
                JSON.stringify({ success: true, message: 'No patient email found, skipping notification' }),
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

        return new Response(
            JSON.stringify({
                success: true,
                message: emailSent ? `Email sent to ${patientEmail}` : 'Appointment processed but email not sent',
                email_sent: emailSent,
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
