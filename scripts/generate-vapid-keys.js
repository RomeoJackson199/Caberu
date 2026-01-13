#!/usr/bin/env node
/**
 * Generate VAPID keys for Web Push Notifications
 *
 * Usage: node scripts/generate-vapid-keys.js
 *
 * After generating:
 * 1. Add VITE_VAPID_PUBLIC_KEY to your .env file
 * 2. Add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to your Supabase Edge Function secrets:
 *    - Go to Supabase Dashboard > Project Settings > Edge Functions
 *    - Add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY as secrets
 */

import crypto from 'crypto';

function generateVapidKeys() {
  // Generate P-256 key pair
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'P-256',
  });

  // Export keys in the format needed for Web Push
  const publicKeyBuffer = publicKey.export({ type: 'spki', format: 'der' });
  const privateKeyBuffer = privateKey.export({ type: 'pkcs8', format: 'der' });

  // The public key for Web Push is the uncompressed point (65 bytes)
  // Skip the ASN.1 header to get just the key data
  const publicKeyUncompressed = publicKeyBuffer.slice(-65);

  // Convert to URL-safe base64
  const publicKeyBase64 = publicKeyUncompressed
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const privateKeyBase64 = privateKeyBuffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return {
    publicKey: publicKeyBase64,
    privateKey: privateKeyBase64,
  };
}

const keys = generateVapidKeys();

console.log('\n========================================');
console.log('  VAPID Keys Generated Successfully!');
console.log('========================================\n');

console.log('Add these to your configuration:\n');

console.log('1. In your .env file (client-side):');
console.log('----------------------------------------');
console.log(`VITE_VAPID_PUBLIC_KEY=${keys.publicKey}\n`);

console.log('2. In Supabase Edge Function Secrets:');
console.log('----------------------------------------');
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}\n`);

console.log('To add secrets to Supabase:');
console.log('1. Go to https://supabase.com/dashboard/project/_/settings/functions');
console.log('2. Under "Edge Function Secrets", add both keys');
console.log('3. Redeploy your Edge Functions\n');
