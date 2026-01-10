import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { getCorsHeaders, handleCorsPreflightSafe } from '../_shared/cors.ts';

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight requests
  const preflightResponse = handleCorsPreflightSafe(req);
  if (preflightResponse) return preflightResponse;

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('Stripe secret key not configured');
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });

    const { amount, successUrl, cancelUrl, promoCode } = await req.json();

    console.log('Creating business setup payment session:', { amount, successUrl, cancelUrl, promoCode });

    let finalAmount = amount;
    let discountAmount = 0;

    // If promo code is provided, validate and apply discount
    if (promoCode) {
      console.log('Validating promo code for checkout:', promoCode);
      // Note: Promo validation happens in the frontend
      // Here we just apply the discount to the amount
      // For a 'free' promo, amount should already be 0 from frontend logic
    }

    // Create a one-time payment session for business setup
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Business Account Activation',
              description: promoCode 
                ? `One-time setup fee (Promo: ${promoCode})`
                : 'One-time setup fee to activate your business account',
            },
            unit_amount: finalAmount, // Amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${successUrl}${successUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      ...(promoCode && { metadata: { promo_code: promoCode } }),
    });

    console.log('Stripe session created:', session.id);

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error creating payment session:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
