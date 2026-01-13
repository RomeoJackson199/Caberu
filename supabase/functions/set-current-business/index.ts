import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { getCorsHeaders, handleCorsPreflightSafe } from "../_shared/cors.ts";

interface SetBusinessRequest {
  businessId?: string;
  businessSlug?: string;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  const preflightResponse = handleCorsPreflightSafe(req);
  if (preflightResponse) return preflightResponse;

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { businessId, businessSlug }: SetBusinessRequest = await req.json();

    // Get profile_id for current user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resolve business by ID or slug
    let targetBusinessId = businessId;
    if (!targetBusinessId && businessSlug) {
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id')
        .eq('slug', businessSlug)
        .single();

      if (businessError || !business) {
        return new Response(JSON.stringify({ error: 'Business not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      targetBusinessId = business.id;
    }

    if (!targetBusinessId) {
      return new Response(JSON.stringify({ error: 'Business ID or slug required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the business exists first (security check)
    const { data: businessExists, error: businessExistsError } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', targetBusinessId)
      .single();

    if (businessExistsError || !businessExists) {
      return new Response(JSON.stringify({ error: 'Business not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify membership
    const { data: membership, error: membershipError } = await supabase
      .from('business_members')
      .select('role')
      .eq('profile_id', profile.id)
      .eq('business_id', targetBusinessId)
      .maybeSingle();

    // If not a member, allow guests (patients) to set context for browsing/booking
    // Guest access is read-only and controlled by RLS on data tables
    if (!membership) {
      const { error: sessionError } = await supabase
        .from('session_business')
        .upsert({
          user_id: user.id,
          business_id: targetBusinessId,
          updated_at: new Date().toISOString(),
        });

      if (sessionError) {
        console.error('Session upsert error for guest:', sessionError);
        return new Response(
          JSON.stringify({ error: 'Failed to set business context' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          businessId: targetBusinessId,
          role: 'guest',
          message: 'Business context set for guest',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Update session_business table (fallback for JWT)
    await supabase
      .from('session_business')
      .upsert({
        user_id: user.id,
        business_id: targetBusinessId,
        updated_at: new Date().toISOString(),
      });

    // Return success with business context
    return new Response(
      JSON.stringify({
        success: true,
        businessId: targetBusinessId,
        role: membership.role,
        message: 'Business context set successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in set-current-business:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
