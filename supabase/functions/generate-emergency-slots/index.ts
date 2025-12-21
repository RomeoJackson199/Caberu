import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify user authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const { dentist_id, date } = await req.json()

    // Create a Supabase client with the Auth context of the user that called the function
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Verify user authentication and authorization
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Invalid or expired token');
    }

    // Authorization check: Only dentists can generate slots for themselves
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    const { data: dentist, error: dentistError } = await supabaseClient
      .from('dentists')
      .select('id')
      .eq('id', dentist_id)
      .eq('profile_id', profile?.id)
      .single();

    if (dentistError || !dentist) {
      throw new Error('Unauthorized: You can only generate slots for yourself');
    }

    // Call the existing function to generate slots
    const { error: generateError } = await supabaseClient.rpc('generate_daily_slots', {
      p_dentist_id: dentist_id,
      p_date: date
    })

    if (generateError) {
      console.error('Error generating slots:', generateError)
      throw generateError
    }

    // Optimize emergency slots by ensuring adequate emergency-only slots for high urgency cases
    const { data: existingSlots, error: slotsError } = await supabaseClient
      .from('appointment_slots')
      .select('*')
      .eq('dentist_id', dentist_id)
      .eq('slot_date', date)
      .eq('is_available', true)

    if (slotsError) throw slotsError

    // Ensure at least 30% of available slots are emergency-only for same-day requests
    const totalSlots = existingSlots?.length || 0
    const emergencySlots = existingSlots?.filter(slot => slot.emergency_only).length || 0
    const requiredEmergencySlots = Math.ceil(totalSlots * 0.3)

    if (emergencySlots < requiredEmergencySlots) {
      // Convert some regular slots to emergency-only
      const slotsToConvert = existingSlots
        ?.filter(slot => !slot.emergency_only)
        .slice(0, requiredEmergencySlots - emergencySlots)

      if (slotsToConvert && slotsToConvert.length > 0) {
        const slotIds = slotsToConvert.map(slot => slot.id)
        
        const { error: updateError } = await supabaseClient
          .from('appointment_slots')
          .update({ emergency_only: true })
          .in('id', slotIds)

        if (updateError) {
          console.error('Error updating emergency slots:', updateError)
        }
      }
    }

    // Get updated slots
    const { data: finalSlots, error: finalError } = await supabaseClient
      .from('appointment_slots')
      .select('*')
      .eq('dentist_id', dentist_id)
      .eq('slot_date', date)
      .order('slot_time')

    if (finalError) throw finalError

    return new Response(
      JSON.stringify({ 
        success: true, 
        slots: finalSlots,
        emergency_slots_created: Math.max(0, requiredEmergencySlots - emergencySlots)
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in generate-emergency-slots function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})