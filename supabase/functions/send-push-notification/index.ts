import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Web Push requires these headers
const webPushHeaders = {
  "Content-Type": "application/octet-stream",
  "Content-Encoding": "aes128gcm",
  "TTL": "86400",
};

interface PushPayload {
  title: string;
  message: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  notification_id?: string;
  type?: string;
  requireInteraction?: boolean;
}

interface PushSubscription {
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");

    if (!vapidPrivateKey || !vapidPublicKey) {
      console.error("VAPID keys not configured");
      return new Response(
        JSON.stringify({
          error: "Push notifications not configured",
          details: "VAPID keys are missing. Please configure VAPID_PRIVATE_KEY and VAPID_PUBLIC_KEY in your Supabase secrets."
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, payload } = await req.json() as {
      user_id: string;
      payload: PushPayload;
    };

    if (!user_id || !payload) {
      return new Response(
        JSON.stringify({ error: "Missing user_id or payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get active push subscriptions for this user
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh_key, auth_key")
      .eq("user_id", user_id)
      .eq("is_active", true);

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "No active push subscriptions for this user",
          sent: 0
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare the notification payload
    const notificationPayload = JSON.stringify({
      title: payload.title,
      message: payload.message,
      body: payload.message,
      url: payload.url || "/",
      icon: payload.icon || "/logo.png",
      badge: payload.badge || "/badge.png",
      tag: payload.tag || "notification",
      notification_id: payload.notification_id,
      type: payload.type,
      requireInteraction: payload.requireInteraction || false,
    });

    // Send to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub: PushSubscription) => {
        try {
          // Use the web-push library approach with crypto
          const response = await sendWebPush(
            sub,
            notificationPayload,
            vapidPublicKey,
            vapidPrivateKey,
            supabaseUrl
          );
          return { endpoint: sub.endpoint, success: true, status: response.status };
        } catch (error) {
          console.error(`Failed to send to ${sub.endpoint}:`, error);

          // If subscription is invalid (410 Gone), mark as inactive
          if (error instanceof Response && error.status === 410) {
            await supabase
              .from("push_subscriptions")
              .update({ is_active: false })
              .eq("endpoint", sub.endpoint);
          }

          return { endpoint: sub.endpoint, success: false, error: String(error) };
        }
      })
    );

    const successful = results.filter(
      (r) => r.status === "fulfilled" && (r.value as any).success
    ).length;

    return new Response(
      JSON.stringify({
        success: true,
        sent: successful,
        total: subscriptions.length,
        results: results.map((r) =>
          r.status === "fulfilled" ? r.value : { success: false, error: r.reason }
        ),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Push notification error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper function to send Web Push notification
async function sendWebPush(
  subscription: PushSubscription,
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  audience: string
): Promise<Response> {
  const endpoint = subscription.endpoint;
  const p256dh = subscription.p256dh_key;
  const auth = subscription.auth_key;

  // Parse the endpoint URL to get the origin for the JWT audience
  const endpointUrl = new URL(endpoint);
  const aud = endpointUrl.origin;

  // Create JWT for VAPID authentication
  const jwt = await createVapidJwt(aud, vapidPublicKey, vapidPrivateKey);

  // Encrypt the payload using Web Push encryption
  const encryptedPayload = await encryptPayload(payload, p256dh, auth);

  // Send the push notification
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `vapid t=${jwt}, k=${vapidPublicKey}`,
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      "TTL": "86400",
    },
    body: encryptedPayload,
  });

  if (!response.ok) {
    throw response;
  }

  return response;
}

// Create VAPID JWT token
async function createVapidJwt(
  aud: string,
  publicKey: string,
  privateKey: string
): Promise<string> {
  const header = {
    typ: "JWT",
    alg: "ES256",
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud,
    exp: now + 86400, // 24 hours
    sub: "mailto:support@caberu.com",
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  // Import the private key and sign
  const keyData = base64UrlDecode(privateKey);
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const encodedSignature = base64UrlEncode(new Uint8Array(signature));
  return `${unsignedToken}.${encodedSignature}`;
}

// Encrypt payload for Web Push (simplified - in production use web-push library)
async function encryptPayload(
  payload: string,
  p256dh: string,
  auth: string
): Promise<Uint8Array> {
  // For a complete implementation, this would need full Web Push encryption
  // This is a simplified version - consider using a web-push library
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);

  // Generate a random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // For now, return a simple encrypted payload structure
  // In production, implement full aes128gcm encryption per RFC 8291
  const result = new Uint8Array(salt.length + data.length + 1);
  result.set(salt, 0);
  result[salt.length] = data.length;
  result.set(data, salt.length + 1);

  return result;
}

function base64UrlEncode(data: string | Uint8Array): string {
  const str = typeof data === "string"
    ? btoa(data)
    : btoa(String.fromCharCode(...data));
  return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}
