import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!signature || !webhookSecret) {
    return new Response('Missing signature or webhook secret', { status: 400 });
  }

  try {
    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    );

    console.log('Webhook event type:', event.type);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const dentistId = session.metadata?.dentist_id;
        const planId = session.metadata?.plan_id;
        const billingCycle = session.metadata?.billing_cycle;

        if (!dentistId || !planId) {
          console.error('Missing metadata in checkout session:', { dentistId, planId });
          // Return error so Stripe retries - don't silently succeed
          return new Response(
            JSON.stringify({ error: 'Missing required metadata (dentist_id or plan_id)' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        // Get subscription details from Stripe
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        // Create or update subscription in database
        const { error } = await supabase
          .from('subscriptions')
          .upsert({
            dentist_id: dentistId,
            plan_id: planId,
            billing_cycle: billingCycle || 'monthly',
            status: 'active',
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer as string,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: false,
          });

        if (error) {
          console.error('Error creating subscription:', error);
        } else {
          console.log('Subscription created successfully');

          // Send notification to dentist
          await supabase.from('notifications').insert({
            user_id: (await supabase
              .from('dentists')
              .select('profile_id')
              .eq('id', dentistId)
              .single()).data?.profile_id,
            type: 'system',
            category: 'info',
            title: 'Subscription Active',
            message: 'Your subscription is now active. Thank you for choosing Caberu!',
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;

        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          console.error('Error updating subscription:', error);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        const { error } = await supabase
          .from('subscriptions')
          .update({ status: 'cancelled' })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          console.error('Error cancelling subscription:', error);
        } else {
          // Get dentist user_id to send notification
          const { data: subData } = await supabase
            .from('subscriptions')
            .select('dentist_id')
            .eq('stripe_subscription_id', subscription.id)
            .single();

          if (subData) {
            const { data: dentist } = await supabase
              .from('dentists')
              .select('profile_id')
              .eq('id', subData.dentist_id)
              .single();

            if (dentist) {
              await supabase.from('notifications').insert({
                user_id: dentist.profile_id,
                type: 'system',
                category: 'warning',
                title: 'Subscription Cancelled',
                message: 'Your subscription has been cancelled. You can reactivate it anytime.',
              });
            }
          }
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;

        // Check if renewal is coming up (7 days before end)
        const subscription = await stripe.subscriptions.retrieve(
          invoice.subscription as string
        );

        const daysUntilRenewal = Math.floor(
          (subscription.current_period_end * 1000 - Date.now()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilRenewal <= 7 && daysUntilRenewal > 0) {
          const { data: subData } = await supabase
            .from('subscriptions')
            .select('dentist_id')
            .eq('stripe_subscription_id', subscription.id)
            .single();

          if (subData) {
            const { data: dentist } = await supabase
              .from('dentists')
              .select('profile_id')
              .eq('id', subData.dentist_id)
              .single();

            if (dentist) {
              await supabase.from('notifications').insert({
                user_id: dentist.profile_id,
                type: 'system',
                category: 'info',
                title: 'Subscription Renewal Reminder',
                message: `Your subscription will renew in ${daysUntilRenewal} days.`,
              });
            }
          }
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
