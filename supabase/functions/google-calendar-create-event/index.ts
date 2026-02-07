import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightSafe } from '../_shared/cors.ts';

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  
  const preflightResponse = handleCorsPreflightSafe(req);
  if (preflightResponse) return preflightResponse;

  try {
    const { appointmentId, action } = await req.json();
    
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from request
    const authHeader = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!authHeader) {
      throw new Error('No authorization header');
    }
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader);
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Get appointment details
    const { data: appointment, error: aptError } = await supabase
      .from('appointments_decrypted')
      .select(`
        *,
        dentists!inner(profile_id, google_calendar_refresh_token, google_calendar_connected),
        profiles!appointments_patient_id_fkey(first_name, last_name, email)
      `)
      .eq('id', appointmentId)
      .single();
    
    if (aptError || !appointment) {
      throw new Error('Appointment not found');
    }

    const dentist = appointment.dentists;
    const patient = appointment.profiles;
    
    if (!dentist.google_calendar_connected || !dentist.google_calendar_refresh_token) {
      return new Response(
        JSON.stringify({ success: false, message: 'Google Calendar not connected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get access token from refresh token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: dentist.google_calendar_refresh_token,
        client_id: googleClientId!,
        client_secret: googleClientSecret!,
        grant_type: 'refresh_token',
      }),
    });
    
    const tokens = await tokenResponse.json();
    
    if (!tokens.access_token) {
      throw new Error('Failed to get access token');
    }

    if (action === 'create' || action === 'update') {
      // Create or update event in Google Calendar
      const startTime = new Date(appointment.appointment_date);
      const endTime = new Date(startTime.getTime() + (appointment.duration_minutes || 60) * 60000);
      
      const event = {
        summary: `${patient.first_name} ${patient.last_name} - ${appointment.reason}`,
        description: `Patient: ${patient.first_name} ${patient.last_name}\nEmail: ${patient.email}\nReason: ${appointment.reason}\nStatus: ${appointment.status}${appointment.notes ? `\nNotes: ${appointment.notes}` : ''}`,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'UTC',
        },
        colorId: appointment.status === 'confirmed' ? '9' : appointment.status === 'completed' ? '10' : '11',
      };

      let calendarEventId = appointment.notes?.match(/gcal_event_id:([^\s]+)/)?.[1];
      let method = 'POST';
      let url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

      if (action === 'update' && calendarEventId) {
        method = 'PUT';
        url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${calendarEventId}`;
      }

      const calendarResponse = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });
      
      const calendarData = await calendarResponse.json();
      
      if (!calendarResponse.ok) {
        console.error('Calendar API error:', calendarData);
        throw new Error('Failed to sync to Google Calendar');
      }

      // Store the Google Calendar event ID in appointment notes
      if (action === 'create' && calendarData.id) {
        const updatedNotes = appointment.notes 
          ? `${appointment.notes}\ngcal_event_id:${calendarData.id}`
          : `gcal_event_id:${calendarData.id}`;
        
        await supabase
          .from('appointments')
          .update({ notes: updatedNotes })
          .eq('id', appointmentId);
      }

      return new Response(
        JSON.stringify({ success: true, eventId: calendarData.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (action === 'delete') {
      // Delete event from Google Calendar
      const calendarEventId = appointment.notes?.match(/gcal_event_id:([^\s]+)/)?.[1];
      
      if (calendarEventId) {
        await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${calendarEventId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
          },
        });
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    throw new Error('Invalid action');
    
  } catch (error) {
    console.error('Error in google-calendar-create-event:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
