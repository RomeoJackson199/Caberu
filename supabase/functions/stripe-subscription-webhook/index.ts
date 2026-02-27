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

        // ── New-business checkout: create the business from metadata ──
        if (!businessId && metadata.business_data) {
          console.log('New-business checkout – creating business from webhook');

          const businessData = JSON.parse(metadata.business_data);
          const profileId = metadata.profile_id;
          const userId = metadata.user_id;

          if (!profileId || !userId) {
            console.error('Missing profile_id or user_id in metadata:', metadata);
            break;
          }

          // Generate unique slug with collision handling
          let baseSlug = (businessData.slug || businessData.name || 'practice')
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9.]+/g, '-')
            .replace(/^-+|-+$/g, '');

          let uniqueSlug = baseSlug;
          let slugCounter = 1;

          while (true) {
            const { data: existing } = await supabase
              .from('businesses')
              .select('id')
              .eq('slug', uniqueSlug)
              .maybeSingle();

            if (!existing) break;
            uniqueSlug = `${baseSlug}-${slugCounter}`;
            slugCounter++;
          }

          // Get Stripe subscription details
          const stripeSubscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );

          // Create business with subscription fields
          const { data: business, error: businessError } = await supabase
            .from('businesses')
            .insert({
              name: businessData.name,
              slug: uniqueSlug,
              owner_profile_id: profileId,
              tagline: businessData.tagline || 'Your Practice, Your Way',
              primary_color: businessData.primaryColor || '#0F3D91',
              secondary_color: businessData.secondaryColor || '#66D2D6',
              currency: 'USD',
              template_type: 'healthcare',
              subscription_status: 'active',
              subscription_plan: metadata.plan_name || null,
              subscription_started_at: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
              subscription_ends_at: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
            })
            .select()
            .single();

          if (businessError) {
            console.error('Business creation error:', businessError);
            break;
          }

          console.log('Business created:', business.id, business.slug);

          // Add owner as business member
          await supabase
            .from('business_members')
            .insert({
              profile_id: profileId,
              business_id: business.id,
              role: 'owner',
            });

          // Assign admin and provider roles (ignore duplicates)
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert([
              { user_id: userId, role: 'admin' },
              { user_id: userId, role: 'provider' },
            ]);

          if (roleError && !roleError.message.includes('duplicate') && !roleError.message.includes('unique')) {
            console.error('Role assignment error:', roleError);
          }

          // Set as current business
          await supabase
            .from('session_business')
            .upsert(
              { user_id: userId, business_id: business.id },
              { onConflict: 'user_id' }
            );

          // Send welcome notification
          await supabase.from('notifications').insert({
            user_id: profileId,
            type: 'system',
            category: 'info',
            title: 'Welcome to Caberu!',
            message: `Your ${metadata.plan_name || ''} subscription is now active. Your practice "${business.name}" is ready.`,
          });

          console.log('New-business checkout fully processed:', business.id);
          break;
        }

        // ── Existing-business checkout (plan upgrade/change) ──
        if (!businessId) {
          console.log('Checkout session has no business_id and no business_data, skipping');
          break;
        }

        const planName = metadata.plan_name;
        if (!planName) {
          console.error('Missing plan_name in checkout session metadata:', metadata);
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

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
