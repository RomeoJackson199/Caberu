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

    // Get appointment details with service info
    const { data: appointment, error: aptError } = await supabase
      .from('appointments_decrypted')
      .select(`
        *,
        dentists!inner(profile_id, google_calendar_refresh_token, google_calendar_connected, google_calendar_sync_direction, google_calendar_id),
        profiles!appointments_patient_id_fkey(first_name, last_name, email, phone),
        business_services(name)
      `)
      .eq('id', appointmentId)
      .single();
    
    if (aptError || !appointment) {
      throw new Error('Appointment not found');
    }

    const dentist = appointment.dentists;
    const patient = appointment.profiles;
    const serviceName = appointment.business_services?.name || null;
    
    if (!dentist.google_calendar_connected || !dentist.google_calendar_refresh_token) {
      return new Response(
        JSON.stringify({ success: false, message: 'Google Calendar not connected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Respect sync direction — skip if direction is google_to_practice only
    const syncDirection = dentist.google_calendar_sync_direction || 'both';
    if (syncDirection === 'google_to_practice') {
      return new Response(
        JSON.stringify({ success: false, message: 'Sync direction does not allow pushing to Google Calendar' }),
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

    // Helper: find existing Google Calendar event by appointment ID
    const calendarId = encodeURIComponent(dentist.google_calendar_id || 'primary');

    async function findGcalEventId(accessToken: string, aptId: string): Promise<string | null> {
      try {
        const searchUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?privateExtendedProperty=appointmentId%3D${aptId}&maxResults=1`;
        const res = await fetch(searchUrl, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.items?.[0]?.id || null;
      } catch {
        return null;
      }
    }

    if (action === 'create' || action === 'update') {
      // Create or update event in Google Calendar
      const startTime = new Date(appointment.appointment_date);
      const endTime = new Date(startTime.getTime() + (appointment.duration_minutes || 60) * 60000);
      
      // Build summary parts: patient name + service/reason
      const detailParts = [serviceName, appointment.reason].filter(Boolean);
      const detailLabel = detailParts.length > 0 ? detailParts.join(' — ') : 'Appointment';
      
      const contactInfo = patient.phone 
        ? `Phone: ${patient.phone}` 
        : `Email: ${patient.email}`;
      
      const descriptionLines = [
        `Patient: ${patient.first_name} ${patient.last_name}`,
        contactInfo,
        serviceName ? `Service: ${serviceName}` : null,
        appointment.reason ? `Reason: ${appointment.reason}` : null,
        `Status: ${appointment.status}`,
        appointment.notes ? `Notes: ${appointment.notes}` : null,
      ].filter(Boolean).join('\n');

      const event = {
        summary: `${patient.first_name} ${patient.last_name} - ${detailLabel}`,
        description: descriptionLines,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'UTC',
        },
        colorId: appointment.status === 'confirmed' ? '9' : appointment.status === 'completed' ? '10' : '11',
        extendedProperties: {
          private: {
            appointmentId: appointmentId,
          },
        },
      };

      // Look up existing event via extendedProperties
      let calendarEventId = await findGcalEventId(tokens.access_token, appointmentId);
      let method = 'POST';
      let url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;

      if ((action === 'update' || calendarEventId) && calendarEventId) {
        method = 'PUT';
        url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${calendarEventId}`;
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

      return new Response(
        JSON.stringify({ success: true, eventId: calendarData.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (action === 'delete') {
      // Delete event from Google Calendar
      const calendarEventId = await findGcalEventId(tokens.access_token, appointmentId);
      
      if (calendarEventId) {
        await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${calendarEventId}`, {
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
