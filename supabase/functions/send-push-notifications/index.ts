import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Web Push library for Deno
import webpush from 'npm:web-push@3.6.7';

// Inline CORS configuration (to avoid shared module import issues)
const ALLOWED_ORIGINS = [
  'https://caberu.be',
  'https://www.caberu.be',
  'https://app.caberu.be',
  'https://supabase.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const origin = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)
    ? requestOrigin
    : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

function handleCorsPreflightSafe(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.get('Origin');
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    });
  }
  return null;
}

interface PushNotificationRequest {
  userId: string;
  title: string;
  message: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  type?: string;
  notificationId?: string;
  requireInteraction?: boolean;
  actions?: Array<{ action: string; title: string }>;
}

interface PushSubscription {
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
}

serve(async (req) => {
  // Handle CORS preflight
  const preflightResponse = handleCorsPreflightSafe(req);
  if (preflightResponse) return preflightResponse;

  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured');
    }

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('VAPID keys not configured. Please set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY secrets.');
    }

    // Configure VAPID details
    webpush.setVapidDetails(
      'mailto:support@caberu.be',
      vapidPublicKey,
      vapidPrivateKey
    );

    // Parse request body
    const {
      userId,
      title,
      message,
      url = '/',
      icon = '/logo.png',
      badge = '/badge.png',
      tag = 'notification',
      type = 'general',
      notificationId,
      requireInteraction = false,
      actions = []
    }: PushNotificationRequest = await req.json();

    if (!userId) {
      throw new Error('userId is required');
    }

    if (!title || !message) {
      throw new Error('title and message are required');
    }

    console.log(`📱 Sending push notification to user: ${userId}`);
    console.log(`📝 Title: ${title}`);
    console.log(`📝 Message: ${message}`);

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check user's notification preferences
    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('push_enabled, quiet_hours_start, quiet_hours_end')
      .eq('user_id', userId)
      .single();

    // Default to enabled if no preferences exist
    const pushEnabled = preferences?.push_enabled ?? true;

    if (!pushEnabled) {
      console.log('⚠️ Push notifications disabled for this user');
      return new Response(JSON.stringify({
        success: true,
        message: 'Push notifications disabled for this user',
        sent: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check quiet hours
    if (preferences?.quiet_hours_start && preferences?.quiet_hours_end) {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();

      const [startHour, startMin] = preferences.quiet_hours_start.split(':').map(Number);
      const [endHour, endMin] = preferences.quiet_hours_end.split(':').map(Number);

      const quietStart = startHour * 60 + startMin;
      const quietEnd = endHour * 60 + endMin;

      // Handle overnight quiet hours (e.g., 22:00 to 07:00)
      const inQuietHours = quietStart > quietEnd
        ? currentTime >= quietStart || currentTime < quietEnd
        : currentTime >= quietStart && currentTime < quietEnd;

      if (inQuietHours) {
        console.log('🌙 Currently in quiet hours, skipping push notification');
        return new Response(JSON.stringify({
          success: true,
          message: 'Quiet hours active, notification not sent',
          sent: 0
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Get user's active push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh_key, auth_key')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      throw new Error('Failed to fetch push subscriptions');
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('⚠️ No active push subscriptions found for user');
      return new Response(JSON.stringify({
        success: true,
        message: 'No active push subscriptions',
        sent: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📬 Found ${subscriptions.length} active subscription(s)`);

    // Prepare the push payload
    const payload = JSON.stringify({
      title,
      message,
      body: message, // Alias for compatibility
      url,
      icon,
      badge,
      tag,
      type,
      notification_id: notificationId,
      requireInteraction,
      actions,
      timestamp: Date.now()
    });

    // Send push notification to all active subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub: PushSubscription & { id: string }) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh_key,
              auth: sub.auth_key
            }
          };

          await webpush.sendNotification(pushSubscription, payload);
          console.log(`✅ Push sent to endpoint: ${sub.endpoint.substring(0, 50)}...`);
          return { success: true, endpoint: sub.endpoint };
        } catch (error: any) {
          console.error(`❌ Push failed for endpoint: ${sub.endpoint.substring(0, 50)}...`, error.message);

          // If subscription is expired or invalid, mark it as inactive
          if (error.statusCode === 404 || error.statusCode === 410) {
            console.log(`🗑️ Marking subscription as inactive: ${sub.id}`);
            await supabase
              .from('push_subscriptions')
              .update({ is_active: false })
              .eq('id', sub.id);
          }

          throw error;
        }
      })
    );

    // Count successes and failures
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`📊 Push notification results: ${successful} sent, ${failed} failed`);

    return new Response(JSON.stringify({
      success: true,
      message: `Push notifications sent`,
      sent: successful,
      failed: failed,
      total: subscriptions.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error sending push notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return new Response(JSON.stringify({
      error: errorMessage,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
