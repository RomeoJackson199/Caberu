import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { appointment_id, decision } = await req.json();
        console.log('Received request:', { appointment_id, decision });

        if (!appointment_id || !decision) {
            return new Response(
                JSON.stringify({ error: 'appointment_id and decision are required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // First check if appointment exists
        const { data: appointmentCheck, error: checkError } = await supabase
            .from('appointments')
            .select('id, patient_id, dentist_id')
            .eq('id', appointment_id)
            .maybeSingle();

        console.log('Appointment check:', { appointmentCheck, checkError });

        if (checkError) {
            console.error('Error checking appointment:', checkError);
            return new Response(
                JSON.stringify({ error: 'Database error checking appointment', details: checkError.message }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        if (!appointmentCheck) {
            console.error('Appointment not found with ID:', appointment_id);
            return new Response(
                JSON.stringify({ error: 'Appointment not found', appointment_id }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Get appointment details with patient and dentist info
        const { data: appointment, error: aptError } = await supabase
            .from('appointments')
            .select(`
        id,
        appointment_date,
        reason,
        patient_id,
        dentist_id,
        profiles:patient_id (
          first_name,
          last_name,
          email
        ),
        dentists:dentist_id (
          profile_id,
          profiles:profile_id (
            first_name,
            last_name
          )
        )
      `)
            .eq('id', appointment_id)
            .single();

        if (aptError || !appointment) {
            console.error('Error fetching appointment details:', aptError);
            return new Response(
                JSON.stringify({ error: 'Failed to fetch appointment details', details: aptError?.message }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        console.log('Appointment found:', { id: appointment.id, patient_id: appointment.patient_id });

        const patientEmail = appointment.profiles?.email;
        const patientName = `${appointment.profiles?.first_name || ''} ${appointment.profiles?.last_name || ''}`.trim();

        // Handle nested dentist profile
        const dentistProfiles = appointment.dentists?.profiles;
        const dentistProfile = Array.isArray(dentistProfiles) ? dentistProfiles[0] : dentistProfiles;
        const dentistName = dentistProfile
            ? `Dr. ${dentistProfile.first_name || ''} ${dentistProfile.last_name || ''}`.trim()
            : 'Your dentist';

        if (!patientEmail) {
            console.log('No patient email found, skipping notification');
            return new Response(
                JSON.stringify({ success: true, message: 'No email to send - patient email not found' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Format the date
        const appointmentDate = new Date(appointment.appointment_date);
        const formattedDate = appointmentDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        const formattedTime = appointmentDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });

        // Prepare email content based on decision
        let subject: string;
        let title: string;
        let message: string;
        let statusColor: string;

        if (decision === 'approved') {
            subject = '✅ Your Appointment Has Been Confirmed!';
            title = 'Appointment Confirmed';
            message = `Great news! ${dentistName} has approved your appointment request.`;
            statusColor = '#22c55e'; // green
        } else {
            subject = '❌ Appointment Request Update';
            title = 'Appointment Not Available';
            message = `Unfortunately, ${dentistName} was unable to confirm your appointment request for this time slot. Please book a new appointment at a different time.`;
            statusColor = '#ef4444'; // red
        }

        // Send email using the existing send-email-notification function
        let emailSent = false;
        try {
            const { error: emailError } = await supabase.functions.invoke('send-email-notification', {
                body: {
                    to: patientEmail,
                    subject: subject,
                    message: `${title}\n\n${message}\n\nAppointment: ${formattedDate} at ${formattedTime}\nReason: ${appointment.reason || 'General consultation'}`,
                    messageType: 'appointment_confirmation',
                    isSystemNotification: true,
                },
            });

            if (emailError) {
                console.error('Error sending email:', emailError);
            } else {
                emailSent = true;
            }
        } catch (emailCatchError) {
            console.error('Failed to invoke send-email-notification:', emailCatchError);
            // Don't throw - we still want to return success for the decision itself
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: emailSent
                    ? `${decision} email sent to ${patientEmail}`
                    : `Appointment ${decision} but email delivery failed`,
                email_sent: emailSent
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error in send-appointment-decision:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
