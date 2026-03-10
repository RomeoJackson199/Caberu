import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightSafe } from '../_shared/cors.ts';

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  
  const preflightResponse = handleCorsPreflightSafe(req);
  if (preflightResponse) return preflightResponse;

  try {
    const { startDate, endDate, dentistId } = await req.json();
    
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    let dentist;
    
    // If dentistId is provided, use it directly (for patient bookings)
    if (dentistId) {
      const { data, error } = await supabase
        .from('dentists')
        .select('id, google_calendar_refresh_token, google_calendar_connected, google_calendar_sync_direction, google_calendar_id')
        .eq('id', dentistId)
        .single();
      
      if (error || !data) {
        throw new Error('Dentist not found');
      }
      dentist = data;
    } else {
      // Otherwise, get dentist from authenticated user (for dentist's own sync)
      const authHeader = req.headers.get('Authorization')?.split('Bearer ')[1];
      if (!authHeader) {
        throw new Error('No authorization header');
      }
      
      const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader);
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (!profile) {
        throw new Error('Profile not found');
      }
      
      const { data, error } = await supabase
        .from('dentists')
        .select('id, google_calendar_refresh_token, google_calendar_connected, google_calendar_sync_direction, google_calendar_id')
        .eq('profile_id', profile.id)
        .single();
      
      if (error || !data) {
        throw new Error('Dentist record not found');
      }
      dentist = data;
    }
    
    if (!dentist?.google_calendar_connected || !dentist.google_calendar_refresh_token) {
      return new Response(
        JSON.stringify({ events: [], connected: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Respect sync direction — skip importing Google events if direction is practice_to_google only
    const syncDirection = dentist.google_calendar_sync_direction || 'both';
    if (syncDirection === 'practice_to_google') {
      return new Response(
        JSON.stringify({ events: [], connected: true, skipped: true, message: 'Sync direction does not import from Google' }),
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
    
    // Fetch calendar events
    const timeMin = new Date(startDate).toISOString();
    const timeMax = new Date(endDate).toISOString();
    
    const calendarId = encodeURIComponent(dentist.google_calendar_id || 'primary');
    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?` +
      `timeMin=${encodeURIComponent(timeMin)}&` +
      `timeMax=${encodeURIComponent(timeMax)}&` +
      `singleEvents=true&` +
      `orderBy=startTime`,
      {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
        },
      }
    );
    
    const calendarData = await calendarResponse.json();
    
    if (!calendarResponse.ok) {
      console.error('Calendar API error:', calendarData);
      throw new Error('Failed to fetch calendar events');
    }
    
    // Update last sync time
    await supabase
      .from('dentists')
      .update({ google_calendar_last_sync: new Date().toISOString() })
      .eq('id', dentist.id);
    
    // Transform events to match our format, filtering out events that originated from the practice
    const events = (calendarData.items || [])
      .filter((event: any) => {
        // Skip events that were pushed from the practice system (they have appointmentId in extendedProperties)
        const privateProps = event.extendedProperties?.private;
        if (privateProps?.appointmentId) {
          console.log(`Skipping practice-originated event: ${event.summary} (appointmentId: ${privateProps.appointmentId})`);
          return false;
        }
        return true;
      })
      .map((event: any) => ({
        id: `gcal_${event.id}`,
        summary: event.summary || 'Untitled Event',
        description: event.description || '',
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        location: event.location || '',
        isGoogleCalendarEvent: true,
        isAllDay: !event.start?.dateTime,
      }));

    console.log(`Found ${events.length} Google Calendar events`);

    // Collect unique dates from events so we can ensure slots exist before blocking
    const uniqueDates = new Set<string>();
    const resetStartDate = new Date(startDate);
    const resetEndDate = new Date(endDate);
    let currentResetDate = new Date(resetStartDate);

    while (currentResetDate <= resetEndDate) {
      uniqueDates.add(currentResetDate.toISOString().split('T')[0]);
      currentResetDate.setDate(currentResetDate.getDate() + 1);
    }

    // Look up business_id for this dentist (needed for ensure_daily_slots)
    const { data: businessMember } = await supabase
      .from('business_members')
      .select('business_id')
      .eq('profile_id', (await supabase.from('dentists').select('profile_id').eq('id', dentist.id).single()).data?.profile_id)
      .limit(1)
      .single();

    const businessId = businessMember?.business_id;

    // Ensure slots exist for each date before blocking
    if (businessId) {
      for (const dateStr of uniqueDates) {
        console.log(`Ensuring slots exist for ${dateStr}`);
        await supabase.rpc('ensure_daily_slots', {
          p_dentist_id: dentist.id,
          p_date: dateStr,
          p_business_id: businessId,
        });
      }
    }

    // Reset all slots in the date range to available (unblock previously blocked slots)
    for (const dateStr of uniqueDates) {
      console.log(`Resetting all slots to available for ${dateStr}`);
      await supabase
        .from('appointment_slots')
        .update({
          is_available: true,
          updated_at: new Date().toISOString()
        })
        .eq('dentist_id', dentist.id)
        .eq('slot_date', dateStr)
        .is('appointment_id', null); // Only reset slots that aren't already booked
    }

    // Now block appointment slots for Google Calendar events
    for (const event of events) {
      if (event.isAllDay) {
        // Handle all-day events: block all slots for each date in range
        const startDate = new Date(event.start);
        const endDate = new Date(event.end); // Google all-day events: end is exclusive
        
        let currentDate = new Date(startDate);
        while (currentDate < endDate) {
          const dateStr = currentDate.toISOString().split('T')[0];
          console.log(`Blocking all slots for all-day event on ${dateStr}`);
          
          await supabase
            .from('appointment_slots')
            .update({ 
              is_available: false,
              updated_at: new Date().toISOString()
            })
            .eq('dentist_id', dentist.id)
            .eq('slot_date', dateStr);
          
          currentDate.setDate(currentDate.getDate() + 1);
        }
      } else if (event.start && event.end) {
        // Handle timed events: block all slots that overlap with the event
        const startTime = new Date(event.start);
        const endTime = new Date(event.end);
        const slotDate = event.start.substring(0, 10); // YYYY-MM-DD
        
        // Convert event start/end to Brussels timezone HH:MM:SS strings
        const startBrussels = startTime.toLocaleString('en-GB', { 
          timeZone: 'Europe/Brussels', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false 
        });
        const endBrussels = endTime.toLocaleString('en-GB', { 
          timeZone: 'Europe/Brussels', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false 
        });
        
        // Round start DOWN to nearest 30-min boundary so we catch overlapping slots
        const [startH, startM] = startBrussels.split(':').map(Number);
        const roundedMinute = Math.floor(startM / 30) * 30;
        const roundedStart = `${String(startH).padStart(2, '0')}:${String(roundedMinute).padStart(2, '0')}:00`;
        
        console.log(`Blocking slots on ${slotDate} where slot_time >= ${roundedStart} AND < ${endBrussels} (event: ${startBrussels}-${endBrussels})`);
        
        const { data: blockedSlots, error: blockError } = await supabase
          .from('appointment_slots')
          .update({ 
            is_available: false,
            updated_at: new Date().toISOString()
          })
          .eq('dentist_id', dentist.id)
          .eq('slot_date', slotDate)
          .gte('slot_time', roundedStart)
          .lt('slot_time', endBrussels)
          .select('slot_time');
        
        console.log(`Blocked ${blockedSlots?.length ?? 0} slots${blockError ? ` (error: ${blockError.message})` : ''}`);
      }
    }
    
    return new Response(
      JSON.stringify({ events, connected: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in google-calendar-sync:', error);
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
