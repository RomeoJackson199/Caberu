import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { code } = await req.json();

    if (!code) {
      throw new Error('Promo code is required');
    }

    console.log('Validating promo code:', code);

    // Query promo code from database
    const { data: promoCode, error } = await supabaseClient
      .from('promo_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !promoCode) {
      console.log('Promo code not found or inactive:', error);
      return new Response(
        JSON.stringify({ valid: false, message: 'Invalid or expired promo code' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Check if promo code has expired
    if (promoCode.expires_at && new Date(promoCode.expires_at) < new Date()) {
      console.log('Promo code expired:', promoCode.expires_at);
      return new Response(
        JSON.stringify({ valid: false, message: 'Promo code has expired' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Check if promo code has reached max uses
    if (promoCode.max_uses && promoCode.uses_count >= promoCode.max_uses) {
      console.log('Promo code max uses reached:', { uses_count: promoCode.uses_count, max_uses: promoCode.max_uses });
      return new Response(
        JSON.stringify({ valid: false, message: 'Promo code has reached its usage limit' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log('Promo code validated successfully:', promoCode);

    return new Response(
      JSON.stringify({ 
        valid: true, 
        promoCode: {
          id: promoCode.id,
          code: promoCode.code,
          discount_type: promoCode.discount_type,
          discount_value: promoCode.discount_value,
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error validating promo code:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
