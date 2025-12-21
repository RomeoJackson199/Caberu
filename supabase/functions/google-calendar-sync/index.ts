import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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
        .select('id, google_calendar_refresh_token, google_calendar_connected')
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
        .select('id, google_calendar_refresh_token, google_calendar_connected')
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
    
    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
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
    
    // Transform events to match our format
    const events = (calendarData.items || []).map((event: any) => ({
      id: `gcal_${event.id}`,
      summary: event.summary || 'Untitled Event',
      description: event.description || '',
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      location: event.location || '',
      isGoogleCalendarEvent: true,
      isAllDay: !event.start?.dateTime, // All-day events don't have dateTime
    }));

    console.log(`Found ${events.length} Google Calendar events`);

    // First, reset all slots in the date range to available (unblock previously blocked slots)
    const resetStartDate = new Date(startDate);
    const resetEndDate = new Date(endDate);
    let currentResetDate = new Date(resetStartDate);

    while (currentResetDate <= resetEndDate) {
      const dateStr = currentResetDate.toISOString().split('T')[0];
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

      currentResetDate.setDate(currentResetDate.getDate() + 1);
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
        // Handle timed events: block all 30-minute slots in the event duration
        const startTime = new Date(event.start);
        const endTime = new Date(event.end);
        const slotDate = event.start.substring(0, 10); // YYYY-MM-DD
        
        // Generate all 30-minute slot times for this event
        const slotsToBlock: string[] = [];
        let currentSlot = new Date(startTime);
        
        while (currentSlot < endTime) {
          const hours = currentSlot.getHours().toString().padStart(2, '0');
          const minutes = currentSlot.getMinutes().toString().padStart(2, '0');
          slotsToBlock.push(`${hours}:${minutes}`);
          currentSlot.setMinutes(currentSlot.getMinutes() + 30);
        }
        
        if (slotsToBlock.length > 0) {
          console.log(`Blocking ${slotsToBlock.length} slots on ${slotDate}: ${slotsToBlock.join(', ')}`);
          
          await supabase
            .from('appointment_slots')
            .update({ 
              is_available: false,
              updated_at: new Date().toISOString()
            })
            .eq('dentist_id', dentist.id)
            .eq('slot_date', slotDate)
            .in('slot_time', slotsToBlock);
        }
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
