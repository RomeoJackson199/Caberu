import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Inline CORS configuration
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

// ============================================================================
// Web Push Encryption Implementation (RFC 8291)
// ============================================================================

// Base64URL decode
function base64UrlDecode(input: string): Uint8Array {
  // Add padding if needed
  let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Base64URL encode
function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Concatenate Uint8Arrays
function concatUint8Arrays(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

// HKDF implementation using Web Crypto API
async function hkdf(
  ikm: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  // Import IKM as HKDF key - use ArrayBuffer to avoid TypeScript issues
  const key = await crypto.subtle.importKey(
    'raw',
    ikm.buffer.slice(ikm.byteOffset, ikm.byteOffset + ikm.byteLength) as ArrayBuffer,
    'HKDF',
    false,
    ['deriveBits']
  );

  // Derive bits
  const derived = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer,
      info: info.buffer.slice(info.byteOffset, info.byteOffset + info.byteLength) as ArrayBuffer,
    },
    key,
    length * 8
  );

  return new Uint8Array(derived);
}

// Create info for HKDF (Web Push specific)
function createInfo(type: string, clientPublicKey: Uint8Array, serverPublicKey: Uint8Array): Uint8Array {
  const encoder = new TextEncoder();
  const typeBytes = encoder.encode(type);

  // Format: "Content-Encoding: <type>\0" + "P-256\0" + client_key_length (2 bytes) + client_key + server_key_length (2 bytes) + server_key
  const parts = [
    encoder.encode('Content-Encoding: '),
    typeBytes,
    new Uint8Array([0]), // null byte
    encoder.encode('P-256'),
    new Uint8Array([0]), // null byte
    new Uint8Array([0, clientPublicKey.length]), // 2 byte length
    clientPublicKey,
    new Uint8Array([0, serverPublicKey.length]), // 2 byte length
    serverPublicKey,
  ];

  return concatUint8Arrays(...parts);
}

// Encrypt payload for Web Push (RFC 8291 / aes128gcm)
async function encryptPayload(
  payload: string,
  p256dhKey: string,
  authSecret: string
): Promise<{ encryptedPayload: Uint8Array; localPublicKey: Uint8Array }> {
  const encoder = new TextEncoder();
  const payloadBytes = encoder.encode(payload);

  // Decode client's public key and auth secret
  const clientPublicKeyBytes = base64UrlDecode(p256dhKey);
  const authSecretBytes = base64UrlDecode(authSecret);

  // Generate ephemeral ECDH key pair for this message
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  // Export the local public key in raw format
  const localPublicKeyRaw = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);
  const localPublicKeyBytes = new Uint8Array(localPublicKeyRaw);

  // Import the client's public key
  const clientPublicKey = await crypto.subtle.importKey(
    'raw',
    clientPublicKeyBytes.buffer.slice(clientPublicKeyBytes.byteOffset, clientPublicKeyBytes.byteOffset + clientPublicKeyBytes.byteLength) as ArrayBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // Perform ECDH to get shared secret
  const sharedSecretBuffer = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientPublicKey },
    localKeyPair.privateKey,
    256
  );
  const sharedSecret = new Uint8Array(sharedSecretBuffer);

  // Generate a random 16-byte salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Derive PRK using HKDF with auth secret as salt
  const authInfo = encoder.encode('Content-Encoding: auth\0');
  const prk = await hkdf(sharedSecret, authSecretBytes, authInfo, 32);

  // Derive content encryption key (CEK)
  const cekInfo = createInfo('aesgcm', clientPublicKeyBytes, localPublicKeyBytes);
  const cek = await hkdf(prk, salt, cekInfo, 16);

  // Derive nonce
  const nonceInfo = createInfo('nonce', clientPublicKeyBytes, localPublicKeyBytes);
  const nonce = await hkdf(prk, salt, nonceInfo, 12);

  // Add padding (RFC 8291 requires at least 2 bytes of padding)
  // Format: padding_length (1 byte) + padding + payload
  const paddingLength = 0; // Minimum padding
  const paddedPayload = concatUint8Arrays(
    new Uint8Array([paddingLength]),
    new Uint8Array(paddingLength),
    payloadBytes
  );

  // Import CEK for AES-GCM
  const aesKey = await crypto.subtle.importKey(
    'raw',
    cek.buffer.slice(cek.byteOffset, cek.byteOffset + cek.byteLength) as ArrayBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  // Encrypt with AES-128-GCM
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce.buffer.slice(nonce.byteOffset, nonce.byteOffset + nonce.byteLength) as ArrayBuffer },
    aesKey,
    paddedPayload.buffer.slice(paddedPayload.byteOffset, paddedPayload.byteOffset + paddedPayload.byteLength) as ArrayBuffer
  );

  // Build aes128gcm encrypted content encoding format
  // Format: salt (16 bytes) + record_size (4 bytes) + key_id_length (1 byte) + key_id (public key) + ciphertext
  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096, false); // Big endian

  const encryptedPayload = concatUint8Arrays(
    salt,
    recordSize,
    new Uint8Array([localPublicKeyBytes.length]),
    localPublicKeyBytes,
    new Uint8Array(ciphertext)
  );

  return { encryptedPayload, localPublicKey: localPublicKeyBytes };
}

// Create VAPID JWT for authorization
async function createVapidJWT(
  audience: string,
  subject: string,
  privateKeyBase64: string,
  publicKeyBase64: string
): Promise<string> {
  const header = { alg: 'ES256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: subject,
  };

  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Decode private key (expected in raw or PKCS8 format)
  const privateKeyBytes = base64UrlDecode(privateKeyBase64);

  // Import the key
  let key: CryptoKey;
  if (privateKeyBytes.length === 32) {
    // Raw EC private key (32 bytes = just the 'd' parameter)
    // We need to use JWK format with the public key components
    const publicKeyBytes = base64UrlDecode(publicKeyBase64);
    
    // Public key is 65 bytes: 0x04 + x (32 bytes) + y (32 bytes)
    if (publicKeyBytes.length !== 65 || publicKeyBytes[0] !== 0x04) {
      throw new Error('Invalid public key format for VAPID');
    }
    
    const x = publicKeyBytes.slice(1, 33);
    const y = publicKeyBytes.slice(33, 65);
    
    const jwk = {
      kty: 'EC',
      crv: 'P-256',
      x: base64UrlEncode(x),
      y: base64UrlEncode(y),
      d: base64UrlEncode(privateKeyBytes),
    };
    
    key = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );
  } else {
    // PKCS8 format
    key = await crypto.subtle.importKey(
      'pkcs8',
      privateKeyBytes.buffer.slice(privateKeyBytes.byteOffset, privateKeyBytes.byteOffset + privateKeyBytes.byteLength) as ArrayBuffer,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );
  }

  // Sign with ECDSA
  const signatureBuffer = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    encoder.encode(unsignedToken)
  );

  // Web Crypto returns DER-encoded signature, but JWT needs raw r||s format
  // DER format: 0x30 [total-length] 0x02 [r-length] [r] 0x02 [s-length] [s]
  const derSignature = new Uint8Array(signatureBuffer);
  let signature: Uint8Array;

  if (derSignature[0] === 0x30) {
    // DER encoded - convert to raw
    const rLength = derSignature[3];
    const rStart = 4;
    const rEnd = rStart + rLength;
    const sLength = derSignature[rEnd + 1];
    const sStart = rEnd + 2;

    // Extract r and s, removing any leading zeros
    let r = derSignature.slice(rStart, rEnd);
    let s = derSignature.slice(sStart, sStart + sLength);

    // Pad or trim to 32 bytes each
    if (r.length > 32) r = r.slice(r.length - 32);
    if (s.length > 32) s = s.slice(s.length - 32);

    const rPadded = new Uint8Array(32);
    const sPadded = new Uint8Array(32);
    rPadded.set(r, 32 - r.length);
    sPadded.set(s, 32 - s.length);

    signature = concatUint8Arrays(rPadded, sPadded);
  } else {
    // Already in raw format (64 bytes)
    signature = derSignature;
  }

  const signatureB64 = base64UrlEncode(signature);
  return `${unsignedToken}.${signatureB64}`;
}

// Send Web Push notification with proper encryption
async function sendWebPushNotification(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<Response> {
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.host}`;

  // Encrypt the payload
  const { encryptedPayload } = await encryptPayload(
    payload,
    subscription.keys.p256dh,
    subscription.keys.auth
  );

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/octet-stream',
    'Content-Encoding': 'aes128gcm',
    'TTL': '86400',
  };

  // Add VAPID authorization
  if (vapidPublicKey && vapidPrivateKey) {
    try {
      const jwt = await createVapidJWT(audience, vapidSubject, vapidPrivateKey, vapidPublicKey);
      headers['Authorization'] = `vapid t=${jwt}, k=${vapidPublicKey}`;
    } catch (e) {
      console.warn('Failed to create VAPID JWT:', e);
      // Continue without VAPID - some push services don't require it
    }
  }

  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers,
    body: encryptedPayload.buffer.slice(encryptedPayload.byteOffset, encryptedPayload.byteOffset + encryptedPayload.byteLength) as ArrayBuffer,
  });

  return response;
}

// Audit logging helper for HIPAA compliance
async function logAuditEvent(
  supabase: any,
  action: string,
  callerId: string | null,
  targetUserId: string,
  details: Record<string, any>,
  req: Request
) {
  try {
    // record_id is now TEXT type, so we can pass string directly
    await supabase.from('audit_logs').insert({
      user_id: callerId,
      action: action,
      table_name: 'push_subscriptions',
      record_id: targetUserId, // TEXT column accepts strings
      changes: {
        ...details,
        target_user_id: targetUserId,
        timestamp: new Date().toISOString(),
      },
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || null,
      user_agent: req.headers.get('user-agent') || null,
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
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

    // Authentication check
    const authHeader = req.headers.get('authorization');
    let callerId: string | null = null;
    let isServiceRole = false;

    if (authHeader?.includes(supabaseServiceKey || '')) {
      isServiceRole = true;
      console.log('🔐 Service role access - internal trigger');
    } else if (authHeader) {
      const userClient = createClient(supabaseUrl, supabaseAnonKey || supabaseServiceKey, {
        global: { headers: { Authorization: authHeader } }
      });

      const { data: { user }, error: authError } = await userClient.auth.getUser();

      if (authError || !user) {
        console.error('🚫 Authentication failed:', authError?.message);

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

    // Authorization check
    if (!isServiceRole && callerId !== userId) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

      console.log(`✅ Authorized: ${callerProfile.role} sending notification to patient`);
    }

    console.log(`📱 Sending push notification to user: ${userId}`);
    console.log(`📝 Title: ${title}`);
    console.log(`📝 Message: ${message}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Audit log the notification attempt
    await logAuditEvent(supabase, 'push_notification_sent', callerId, userId, {
      title,
      message: message.substring(0, 100),
      type,
      is_service_role: isServiceRole,
    }, req);

    // Check user's notification preferences
    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('push_enabled, quiet_hours_start, quiet_hours_end')
      .eq('user_id', userId)
      .single();

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
      body: message,
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

    // Check if VAPID keys are configured
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('❌ VAPID keys not configured');
      return new Response(JSON.stringify({
        error: 'VAPID keys not configured on server',
        success: false
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

          const response = await sendWebPushNotification(
            pushSubscription,
            payload,
            vapidPublicKey,
            vapidPrivateKey,
            'mailto:support@caberu.be'
          );

          console.log(`Push response status: ${response.status} for endpoint: ${sub.endpoint.substring(0, 50)}...`);

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Push error response: ${errorText}`);

            // If subscription is expired or invalid, mark it as inactive
            if (response.status === 404 || response.status === 410) {
              console.log(`🗑️ Marking subscription as inactive: ${sub.id}`);
              await supabase
                .from('push_subscriptions')
                .update({ is_active: false })
                .eq('id', sub.id);
            }
            throw new Error(`Push failed with status ${response.status}: ${errorText}`);
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
    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map(r => r.reason?.message || 'Unknown error');

    console.log(`📊 Push notification results: ${successful} sent, ${failed} failed`);
    if (errors.length > 0) {
      console.log(`📊 Errors: ${errors.join(', ')}`);
    }

    return new Response(JSON.stringify({
      success: successful > 0,
      message: `Push notifications sent`,
      sent: successful,
      failed: failed,
      total: subscriptions.length,
      errors: errors.length > 0 ? errors : undefined
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
