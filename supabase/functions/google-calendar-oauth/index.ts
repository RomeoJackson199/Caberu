import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightSafe } from '../_shared/cors.ts';

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  
  const preflightResponse = handleCorsPreflightSafe(req);
  if (preflightResponse) return preflightResponse;

  try {
    const { action, code, redirectUri } = await req.json();
    
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

    if (action === 'get-auth-url') {
      console.log('OAuth request - clientId:', googleClientId, 'redirectUri:', redirectUri);
      
      // Generate OAuth URL with full calendar access for bidirectional sync
      const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ];
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${googleClientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(scopes.join(' '))}&` +
        `access_type=offline&` +
        `prompt=consent`;
      
      return new Response(
        JSON.stringify({ authUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (action === 'exchange-code') {
      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: code,
          client_id: googleClientId!,
          client_secret: googleClientSecret!,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });
      
      const tokens = await tokenResponse.json();
      
      if (!tokens.refresh_token) {
        throw new Error('No refresh token received');
      }
      
      // Get profile_id for the user
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (!profile) {
        throw new Error('Profile not found');
      }
      
      // Store refresh token in dentists table
      const { error: updateError } = await supabase
        .from('dentists')
        .update({
          google_calendar_refresh_token: tokens.refresh_token,
          google_calendar_connected: true,
          google_calendar_last_sync: new Date().toISOString(),
        })
        .eq('profile_id', profile.id);
      
      if (updateError) {
        console.error('Error updating dentist:', updateError);
        throw updateError;
      }
      
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (action === 'disconnect') {
      // Get profile_id for the user
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (!profile) {
        throw new Error('Profile not found');
      }
      
      // Remove tokens from dentists table
      const { error: updateError } = await supabase
        .from('dentists')
        .update({
          google_calendar_refresh_token: null,
          google_calendar_connected: false,
          google_calendar_last_sync: null,
        })
        .eq('profile_id', profile.id);
      
      if (updateError) {
        throw updateError;
      }
      
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    throw new Error('Invalid action');
    
  } catch (error) {
    console.error('Error in google-calendar-oauth:', error);
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
