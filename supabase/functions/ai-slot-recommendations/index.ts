import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightSafe } from '../_shared/cors.ts';
import { checkRateLimitMemory, getClientIP, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  
  const preflightResponse = handleCorsPreflightSafe(req);
  if (preflightResponse) return preflightResponse;

  // SECURITY: Rate limiting for AI slot recommendations
  const clientIP = getClientIP(req);
  const rateLimitResult = checkRateLimitMemory(clientIP, RATE_LIMITS.AI_HEAVY);
  if (!rateLimitResult.allowed) {
    return rateLimitResponse(rateLimitResult, corsHeaders);
  }

  try {
    // SECURITY: Validate authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's auth token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { dentistId, patientId, date, availableSlots, businessId } = await req.json();

    // SECURITY: Validate required fields
    if (!dentistId || !patientId || !date || !availableSlots) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Verify user has access to this business (if businessId provided)
    if (businessId) {
      const { data: membership } = await supabaseClient
        .from('business_members')
        .select('id')
        .eq('business_id', businessId)
        .maybeSingle();

      if (!membership) {
        console.error('User does not have access to business:', businessId);
        return new Response(
          JSON.stringify({ error: 'Access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('AI slot recommendation request:', { 
      dentistId, 
      patientId, 
      date, 
      slotsCount: availableSlots?.length,
      userId: user.id 
    });

    // Get slot usage statistics using service role for internal query
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: slotStats } = await serviceClient
      .from('slot_usage_statistics')
      .select('*')
      .eq('dentist_id', dentistId)
      .order('recent_booking_rate', { ascending: true });

    // Get patient preferences
    const { data: patientPrefs } = await serviceClient
      .from('patient_preferences')
      .select('*')
      .eq('patient_id', patientId)
      .maybeSingle();

    // Prepare context for AI - NO sensitive patient data included
    const dayOfWeek = new Date(date).getDay();
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];

    const underutilizedSlots = (slotStats || [])
      .filter((s: any) => s.recent_booking_rate < 50 && s.day_of_week === dayOfWeek)
      .slice(0, 5)
      .map((s: any) => `${s.time_slot} (${s.recent_booking_rate.toFixed(1)}% booked)`)
      .join(', ');

    const preferredTimes = patientPrefs?.preferred_time_of_day?.join(', ') || 'no preference';

    const availableTimesStr = availableSlots.map((s: any) => s.time).join(', ');

    // Build prompt for AI - anonymized, no personal data
    const prompt = `You are an AI scheduling assistant for a dental practice. Your goal is to help BALANCE the dentist's schedule by promoting time slots that are booked LESS frequently.

**Current Situation:**
- Day: ${dayName}
- Available Times: ${availableTimesStr}
- Under-utilized Slots (need promotion): ${underutilizedSlots || 'None identified yet'}
- Patient Usually Prefers: ${preferredTimes}

**Your Task:**
Analyze the available time slots and recommend which ones to promote to the patient. Focus on:
1. **Under-utilized slots** (booking rate < 50%) should be PRIORITIZED
2. **Balance** - help distribute appointments evenly throughout the day
3. **Patient preferences** - consider what times the patient usually prefers, but gently guide them toward under-utilized slots if possible

**Output Format (JSON only):**
{
  "showSlots": ["10:00", "10:30", "11:00"],
  "slotDetails": {
    "10:00": {"score": 85, "reason": "Under-utilized slot, helps balance schedule"},
    "10:30": {"score": 82, "reason": "Less frequently booked"},
    "11:00": {"score": 80, "reason": "Balances morning schedule"}
  },
  "summary": "Morning slots are under-utilized"
}

**CRITICAL:** Return EXACTLY 3 time slots in "showSlots" - these are the ONLY slots the UI should display initially.`;

    console.log('Calling Lovable AI with prompt length:', prompt.length);

    // Call Lovable AI - API key is server-side only, never exposed to client
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a scheduling AI assistant. Always respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiText = aiData.choices?.[0]?.message?.content || '';

    console.log('AI response:', aiText.substring(0, 200));

    // Parse JSON from response
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response as JSON');
    }

    const aiAnalysis = JSON.parse(jsonMatch[0]);

    // Log recommendation for analytics - use service client
    try {
      await serviceClient
        .from('ai_slot_recommendations')
        .insert({
          patient_id: patientId,
          dentist_id: dentistId,
          recommended_slots: aiAnalysis.showSlots || [],
          ai_model_used: 'google/gemini-2.5-flash',
          ai_reasoning: aiAnalysis.summary,
          selected_date: date
        });
    } catch (logError) {
      console.error('Failed to log recommendation (non-critical):', logError);
    }

    console.log('AI recommendation generated - show these slots:', aiAnalysis.showSlots);

    return new Response(
      JSON.stringify({
        showSlots: aiAnalysis.showSlots || [],
        slotDetails: aiAnalysis.slotDetails || {},
        summary: aiAnalysis.summary
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in AI recommendations:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
