import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAuthClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const supabaseServiceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseAuthClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Not authenticated');
    }

    // Get user's profile
    const { data: profile, error: profileError } = await supabaseServiceClient
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    const { name, tagline } = await req.json();

    // Generate unique slug
    let slug = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const { data: existingBusiness } = await supabaseServiceClient
      .from('businesses')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (existingBusiness) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 8)}`;
    }

    // Create business - always healthcare template
    const { data: business, error: businessError } = await supabaseServiceClient
      .from('businesses')
      .insert({
        name,
        slug,
        tagline: tagline || 'Your Practice, Your Way',
        owner_profile_id: profile.id,
        template_type: 'healthcare',
        primary_color: '#0F3D91',
        secondary_color: '#66D2D6',
        currency: 'USD',
        subscription_status: 'active',
        subscription_plan: 'monthly',
        subscription_started_at: new Date().toISOString(),
        subscription_ends_at: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(), // 1 year default
      })
      .select()
      .single();

    if (businessError) throw businessError;

    // Assign admin role
    const { error: adminRoleError } = await supabaseServiceClient
      .from('user_roles')
      .upsert({ user_id: user.id, role: 'admin' }, { onConflict: 'user_id,role' });

    if (adminRoleError) {
      console.error('Error assigning admin role:', adminRoleError);
    }

    // Add to business_members as owner
    // This will trigger auto-creation of dentist record via database trigger
    const { error: memberError } = await supabaseServiceClient
      .from('business_members')
      .insert({
        business_id: business.id,
        profile_id: profile.id,
        role: 'owner',
      });

    if (memberError) throw memberError;

    // Set session business
    const { error: sessionError } = await supabaseServiceClient
      .from('session_business')
      .upsert(
        { user_id: user.id, business_id: business.id },
        { onConflict: 'user_id' }
      );

    if (sessionError) throw sessionError;

    console.log('Healthcare business created successfully:', business.id);

    return new Response(
      JSON.stringify({
        success: true,
        business_id: business.id,
        slug: business.slug,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error creating healthcare business:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
