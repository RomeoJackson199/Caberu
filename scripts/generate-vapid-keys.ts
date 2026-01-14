/**
 * VAPID Key Generator for Web Push Notifications
 *
 * Run with: npx ts-node scripts/generate-vapid-keys.ts
 * Or: deno run --allow-all scripts/generate-vapid-keys.ts
 *
 * This generates the VAPID keys needed for Web Push notifications.
 *
 * After running, set these secrets in Supabase:
 *   supabase secrets set VAPID_PUBLIC_KEY=<public_key>
 *   supabase secrets set VAPID_PRIVATE_KEY=<private_key>
 */

async function generateVapidKeys() {
  // Generate EC P-256 key pair
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );

  // Export public key in raw format (uncompressed point: 65 bytes)
  const publicKeyRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const publicKeyBytes = new Uint8Array(publicKeyRaw);

  // Export private key in PKCS8 format (for Web Crypto compatibility)
  const privateKeyPkcs8 = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
  const privateKeyBytes = new Uint8Array(privateKeyPkcs8);

  // Base64URL encode
  const base64UrlEncode = (bytes: Uint8Array): string => {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  const publicKey = base64UrlEncode(publicKeyBytes);
  const privateKey = base64UrlEncode(privateKeyBytes);

  console.log('\n=== VAPID Keys Generated ===\n');
  console.log('Public Key (use this for VAPID_PUBLIC_KEY):');
  console.log(publicKey);
  console.log('\nPrivate Key (use this for VAPID_PRIVATE_KEY):');
  console.log(privateKey);
  console.log('\n=== Setup Commands ===\n');
  console.log('Run these commands to set up the secrets in Supabase:\n');
  console.log(`supabase secrets set VAPID_PUBLIC_KEY="${publicKey}"`);
  console.log(`supabase secrets set VAPID_PRIVATE_KEY="${privateKey}"`);
  console.log('\n=== Important Notes ===\n');
  console.log('1. The PUBLIC key is safe to expose - it\'s used by browsers to subscribe');
  console.log('2. The PRIVATE key must be kept SECRET - store it only as an environment variable');
  console.log('3. If you regenerate keys, all existing subscriptions will stop working');
  console.log('4. Users will need to re-subscribe to push notifications with the new keys\n');
}

// Run if executed directly
generateVapidKeys().catch(console.error);
