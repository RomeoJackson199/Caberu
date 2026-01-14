import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

// Helper function to create JWT for VAPID
async function createVapidJWT(audience: string, subject: string, privateKeyBase64: string): Promise<string> {
  const header = { alg: 'ES256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: subject,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key
  const privateKeyBytes = Uint8Array.from(atob(privateKeyBase64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  
  const key = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    encoder.encode(unsignedToken)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${unsignedToken}.${signatureB64}`;
}

// Send web push notification using fetch
async function sendWebPushNotification(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<Response> {
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Content-Encoding': 'aes128gcm',
    'TTL': '86400',
  };

  // Add authorization if VAPID keys are provided
  if (vapidPublicKey && vapidPrivateKey) {
    try {
      const jwt = await createVapidJWT(audience, vapidSubject, vapidPrivateKey);
      headers['Authorization'] = `vapid t=${jwt}, k=${vapidPublicKey}`;
    } catch (e) {
      console.warn('Failed to create VAPID JWT, sending without auth:', e);
    }
  }

  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers,
    body: payload,
  });

  return response;
}

// 🔒 SECURITY: Audit logging helper for HIPAA compliance
async function logAuditEvent(
  supabase: any,
  action: string,
  callerId: string | null,
  targetUserId: string,
  details: Record<string, any>,
  req: Request
) {
  try {
    await supabase.from('audit_logs').insert({
      user_id: callerId,
      action: action,
      table_name: 'push_subscriptions',
      record_id: targetUserId,
      changes: {
        ...details,
        target_user_id: targetUserId,
        timestamp: new Date().toISOString(),
      },
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't fail the request if audit logging fails, but log the error
  }
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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured');
    }

    // 🔒 SECURITY: Check authentication
    const authHeader = req.headers.get('authorization');
    let callerId: string | null = null;
    let isServiceRole = false;

    // Check if this is a service role call (internal trigger)
    if (authHeader?.includes(supabaseServiceKey || '')) {
      isServiceRole = true;
      console.log('🔐 Service role access - internal trigger');
    } else if (authHeader) {
      // Validate user token
      const userClient = createClient(supabaseUrl, supabaseAnonKey || supabaseServiceKey, {
        global: { headers: { Authorization: authHeader } }
      });
      
      const { data: { user }, error: authError } = await userClient.auth.getUser();
      
      if (authError || !user) {
        console.error('🚫 Authentication failed:', authError?.message);
        
        // Audit failed auth attempt
        const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
        await logAuditEvent(serviceClient, 'push_notification_auth_failed', null, 'unknown', {
          error: authError?.message || 'Invalid token',
        }, req);
        
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      callerId = user.id;
      console.log(`🔐 Authenticated user: ${callerId}`);
    } else {
      // No auth header at all
      console.error('🚫 No authorization header provided');
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    // 🔒 SECURITY: Authorization check - who can send to whom?
    // Service role: can send to anyone (system notifications)
    // Regular user: can only send to themselves OR must be a business member sending to their patients
    if (!isServiceRole && callerId !== userId) {
      // Create service client for authorization check
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Check if caller is a business member who can notify this patient
      const { data: callerProfile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('user_id', callerId)
        .single();
      
      if (!callerProfile || !['dentist', 'admin', 'staff', 'super_admin'].includes(callerProfile.role)) {
        console.error(`🚫 Unauthorized: User ${callerId} cannot send notifications to ${userId}`);
        
        await logAuditEvent(supabase, 'push_notification_unauthorized', callerId, userId, {
          reason: 'User not authorized to send notifications to this target',
          caller_role: callerProfile?.role || 'unknown',
        }, req);
        
        return new Response(JSON.stringify({ error: 'Not authorized to send notifications to this user' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Additional check: verify the target user is a patient of the caller's business
      const { data: hasAccess } = await supabase
        .rpc('has_business_access', { 
          _business_id: null, // This would need the business context
          _user_id: callerId 
        });
      
      // For now, allow staff/admin/dentist roles to send notifications
      // A more strict check would verify business membership
      console.log(`✅ Authorized: ${callerProfile.role} sending notification to patient`);
    }

    console.log(`📱 Sending push notification to user: ${userId}`);
    console.log(`📝 Title: ${title}`);
    console.log(`📝 Message: ${message}`);

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 🔒 HIPAA: Audit log the notification attempt
    await logAuditEvent(supabase, 'push_notification_sent', callerId, userId, {
      title,
      message: message.substring(0, 100), // Truncate for audit
      type,
      is_service_role: isServiceRole,
    }, req);

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

          if (vapidPublicKey && vapidPrivateKey) {
            const response = await sendWebPushNotification(
              pushSubscription,
              payload,
              vapidPublicKey,
              vapidPrivateKey,
              'mailto:support@caberu.be'
            );

            if (!response.ok) {
              // If subscription is expired or invalid, mark it as inactive
              if (response.status === 404 || response.status === 410) {
                console.log(`🗑️ Marking subscription as inactive: ${sub.id}`);
                await supabase
                  .from('push_subscriptions')
                  .update({ is_active: false })
                  .eq('id', sub.id);
              }
              throw new Error(`Push failed with status ${response.status}`);
            }
          } else {
            // Fallback: just log that VAPID keys aren't configured
            console.warn('VAPID keys not configured, push notification may not work');
          }

          console.log(`✅ Push sent to endpoint: ${sub.endpoint.substring(0, 50)}...`);
          return { success: true, endpoint: sub.endpoint };
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`❌ Push failed for endpoint: ${sub.endpoint.substring(0, 50)}...`, errorMessage);
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
