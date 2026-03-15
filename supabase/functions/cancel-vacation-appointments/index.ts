import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { format } from 'https://esm.sh/date-fns@3.6.0';
import { toZonedTime } from 'https://esm.sh/date-fns-tz@3.1.3';
import { getCorsHeaders, handleCorsPreflightSafe } from '../_shared/cors.ts';
import { sendWhatsAppFreeform, sendWhatsAppTemplate, WHATSAPP_TEMPLATES } from '../_shared/whatsapp.ts';

const CLINIC_TIMEZONE = 'Europe/Brussels';

serve(async (req) => {
    const origin = req.headers.get('Origin');
    const corsHeaders = getCorsHeaders(origin);
    
    const preflightResponse = handleCorsPreflightSafe(req);
    if (preflightResponse) return preflightResponse;

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseServiceKey) {
            return new Response(
                JSON.stringify({ error: 'Server configuration error' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { vacation_id, dentist_id, start_date, end_date, vacation_type, reason } = await req.json();
        
        console.log('Processing vacation cancellation:', { vacation_id, dentist_id, start_date, end_date, vacation_type });

        if (!dentist_id || !start_date || !end_date) {
            return new Response(
                JSON.stringify({ error: 'dentist_id, start_date, and end_date are required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Get dentist info for the cancellation message
        const { data: dentist } = await supabase
            .from('dentists')
            .select('first_name, last_name')
            .eq('id', dentist_id)
            .single();

        const dentistName = dentist ? `Dr. ${dentist.first_name} ${dentist.last_name}` : 'Your dentist';

        // Find all appointments within the vacation date range
        const startDateStr = start_date;
        const endDateStr = end_date;
        
        // Query appointments that fall within the vacation period
        const { data: appointments, error: aptError } = await supabase
            .from('appointments_decrypted')
            .select(`
                id,
                appointment_date,
                reason,
                patient_id,
                status,
                profiles!appointments_patient_id_fkey (
                    email,
                    first_name,
                    last_name,
                    phone
                )
            `)
            .eq('dentist_id', dentist_id)
            .gte('appointment_date', `${startDateStr}T00:00:00`)
            .lte('appointment_date', `${endDateStr}T23:59:59`)
            .in('status', ['pending', 'confirmed']);

        if (aptError) {
            console.error('Error fetching appointments:', aptError);
            return new Response(
                JSON.stringify({ error: 'Failed to fetch appointments', details: aptError.message }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        console.log(`Found ${appointments?.length || 0} appointments to cancel`);

        if (!appointments || appointments.length === 0) {
            return new Response(
                JSON.stringify({ success: true, message: 'No appointments to cancel', cancelled_count: 0 }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Determine the cancellation reason based on vacation type
        let cancellationReason = '';
        if (vacation_type === 'sick_leave' || reason?.toLowerCase().includes('sick')) {
            cancellationReason = `We apologize, but ${dentistName} is unfortunately unwell and unable to see patients during this time.`;
        } else if (vacation_type === 'emergency') {
            cancellationReason = `We apologize, but ${dentistName} has had an emergency and is unavailable during this time.`;
        } else {
            cancellationReason = `${dentistName} is on scheduled leave during this time.`;
        }

        const cancelledAppointments = [];
        const emailsSent = [];

        // Cancel each appointment and send notification
        for (const apt of appointments) {
            // Update appointment status to cancelled
            const { error: updateError } = await supabase
                .from('appointments')
                .update({
                    status: 'cancelled',
                    notes: `Auto-cancelled due to dentist ${vacation_type || 'vacation'}. ${reason || ''}`
                })
                .eq('id', apt.id);

            if (updateError) {
                console.error(`Failed to cancel appointment ${apt.id}:`, updateError);
                continue;
            }

            cancelledAppointments.push(apt.id);

            // Release the appointment slot
            try {
                await supabase.rpc('release_appointment_slot', { p_appointment_id: apt.id });
            } catch (slotError) {
                console.error(`Failed to release slot for appointment ${apt.id}:`, slotError);
            }

            // Send WhatsApp cancellation notification to patient
            const patientPhone = (apt.profiles as any)?.phone;
            const patientName = (apt.profiles as any)?.first_name || 'Patient';

            if (patientPhone) {
                const appointmentDate = new Date(apt.appointment_date);
                const brusselsTime = toZonedTime(appointmentDate, CLINIC_TIMEZONE);
                const formattedDate = format(brusselsTime, 'EEEE, MMMM d, yyyy');
                const formattedTime = format(brusselsTime, 'h:mm a');

                // Get business_id for this appointment
                const { data: aptBiz } = await supabase
                    .from('appointments')
                    .select('business_id')
                    .eq('id', apt.id)
                    .single();

                if (aptBiz?.business_id) {
                    const cancelMsg = `⚠️ Your appointment on ${formattedDate} at ${formattedTime} has been cancelled. ${cancellationReason} Please book a new appointment at your convenience.`;

                    // Try freeform first (within 24h window), fall back silently
                    const freeResult = await sendWhatsAppFreeform({
                        phone: patientPhone,
                        body: cancelMsg,
                        businessId: aptBiz.business_id,
                        patientId: (apt.profiles as any)?.id,
                    });

                    if (!freeResult.success) {
                        // Window closed, send confirmation template as fallback
                        await sendWhatsAppTemplate({
                            phone: patientPhone,
                            contentSid: WHATSAPP_TEMPLATES.APPOINTMENT_CONFIRMATION,
                            contentVariables: { "1": patientName },
                            businessId: aptBiz.business_id,
                            patientId: (apt.profiles as any)?.id,
                            templateName: 'appointment_cancellation_fallback',
                        });
                    }

                    emailsSent.push(patientPhone);
                    console.log(`WhatsApp cancellation sent to ${patientPhone}`);
                }
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                cancelled_count: cancelledAppointments.length,
                cancelled_appointments: cancelledAppointments,
                emails_sent: emailsSent.length,
                message: `Cancelled ${cancelledAppointments.length} appointments and sent ${emailsSent.length} notification emails`
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
