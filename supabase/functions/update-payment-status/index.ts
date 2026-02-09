import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders, handleCorsPreflightSafe } from "../_shared/cors.ts";

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  const preflightResponse = handleCorsPreflightSafe(req);
  if (preflightResponse) return preflightResponse;

  try {
    const { session_id } = await req.json();

    if (!session_id) {
      throw new Error('Session ID is required');
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Get the session from Stripe to verify payment status
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status === 'paid') {
      // Initialize Supabase client with service role key to bypass RLS
      const supabaseService = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

      // Update payment request status and paid_at
      const { data: updatedRequests, error } = await supabaseService
        .from('payment_requests')
        .update({ 
          status: 'paid',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('stripe_session_id', session_id)
        .select('appointment_id');

      if (error) {
        console.error('Error updating payment status:', error);
        throw error;
      }

      // Also update the linked appointment's payment_status to 'paid'
      if (updatedRequests && updatedRequests.length > 0) {
        const appointmentIds = updatedRequests
          .map(r => r.appointment_id)
          .filter(Boolean);
        
        if (appointmentIds.length > 0) {
          const { error: aptError } = await supabaseService
            .from('appointments')
            .update({ 
              payment_status: 'paid',
              updated_at: new Date().toISOString()
            })
            .in('id', appointmentIds);

          if (aptError) {
            console.error('Error updating appointment payment status:', aptError);
            // Don't throw - payment was already marked as paid
          }
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          payment_status: session.payment_status,
          message: 'Payment status updated successfully'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } else if (session.payment_status === 'unpaid' || session.status === 'expired') {
      // Optionally mark failed
      const supabaseService = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      await supabaseService
        .from('payment_requests')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('stripe_session_id', session_id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          payment_status: session.payment_status,
          message: 'Payment not completed'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          payment_status: session.payment_status,
          message: 'Payment not completed'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});