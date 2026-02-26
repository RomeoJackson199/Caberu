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
        const metadata = session.metadata || {};
        const businessId = metadata.business_id;
        const planName = metadata.plan_name;
        const billingCycle = metadata.billing_cycle;

        // New-business checkouts have no business_id yet — the business is
        // created by complete-business-subscription after the user lands on the
        // success page. Nothing to do here for those sessions.
        if (!businessId) {
          console.log('New-business checkout (no business_id yet), skipping webhook handling');
          break;
        }

        if (!planName) {
          console.error('Missing plan_name in checkout session metadata:', metadata);
          break;
        }

        // Get subscription details from Stripe
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        // Update the businesses table directly (single source of truth)
        const { error } = await supabase
          .from('businesses')
          .update({
            subscription_status: 'active',
            subscription_plan: planName,
            subscription_started_at: new Date(subscription.current_period_start * 1000).toISOString(),
            subscription_ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
            pending_plan_change: null,
            pending_plan_change_date: null,
          })
          .eq('id', businessId);

        if (error) {
          console.error('Error updating business subscription:', error);
        } else {
          console.log('Business subscription activated:', businessId, planName);

          // Send notification
          const profileId = metadata.profile_id;
          if (profileId) {
            await supabase.from('notifications').insert({
              user_id: profileId,
              type: 'system',
              category: 'info',
              title: 'Subscription Active',
              message: `Your ${planName} subscription is now active. Thank you for choosing Caberu!`,
            });
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Find the business by matching the customer email
        const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
        
        if (customer.email) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', customer.email)
            .limit(1)
            .maybeSingle();

          if (profile) {
            const { data: membership } = await supabase
              .from('business_members')
              .select('business_id')
              .eq('profile_id', profile.id)
              .eq('role', 'owner')
              .limit(1)
              .maybeSingle();

            if (membership) {
              const updateData: Record<string, any> = {
                subscription_ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
              };

              if (subscription.cancel_at_period_end) {
                updateData.subscription_status = 'cancelling';
              } else if (subscription.status === 'active') {
                updateData.subscription_status = 'active';
              }

              await supabase
                .from('businesses')
                .update(updateData)
                .eq('id', membership.business_id);
            }
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
        
        if (customer.email) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', customer.email)
            .limit(1)
            .maybeSingle();

          if (profile) {
            const { data: membership } = await supabase
              .from('business_members')
              .select('business_id')
              .eq('profile_id', profile.id)
              .eq('role', 'owner')
              .limit(1)
              .maybeSingle();

            if (membership) {
              await supabase
                .from('businesses')
                .update({
                  subscription_status: 'cancelled',
                  pending_plan_change: null,
                  pending_plan_change_date: null,
                })
                .eq('id', membership.business_id);

              // Send cancellation notification
              await supabase.from('notifications').insert({
                user_id: profile.id,
                type: 'system',
                category: 'warning',
                title: 'Subscription Cancelled',
                message: 'Your subscription has been cancelled. You can reactivate it anytime from the pricing page.',
              });
            }
          }
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          );

          // Update period end on the business
          const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
          
          if (customer.email) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id')
              .eq('email', customer.email)
              .limit(1)
              .maybeSingle();

            if (profile) {
              const { data: membership } = await supabase
                .from('business_members')
                .select('business_id')
                .eq('profile_id', profile.id)
                .eq('role', 'owner')
                .limit(1)
                .maybeSingle();

              if (membership) {
                await supabase
                  .from('businesses')
                  .update({
                    subscription_status: 'active',
                    subscription_ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
                  })
                  .eq('id', membership.business_id);
              }
            }
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          );
          const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
          
          if (customer.email) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id')
              .eq('email', customer.email)
              .limit(1)
              .maybeSingle();

            if (profile) {
              const { data: membership } = await supabase
                .from('business_members')
                .select('business_id')
                .eq('profile_id', profile.id)
                .eq('role', 'owner')
                .limit(1)
                .maybeSingle();

              if (membership) {
                await supabase
                  .from('businesses')
                  .update({ subscription_status: 'past_due' })
                  .eq('id', membership.business_id);

                await supabase.from('notifications').insert({
                  user_id: profile.id,
                  type: 'system',
                  category: 'warning',
                  title: 'Payment Failed',
                  message: 'Your subscription payment failed. Please update your payment method to avoid service interruption.',
                });
              }
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
