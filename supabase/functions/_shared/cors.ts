/**
 * Shared CORS configuration for Edge Functions
 * SECURITY: Restrict origins to known domains instead of allowing all (*)
 */

// Allowed origins - add your production and staging domains here
const ALLOWED_ORIGINS = [
  'https://caberu.be',
  'https://www.caberu.be',
  'https://app.caberu.be',
  // Supabase Studio for development
  'https://supabase.com',
  // Local development
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

/**
 * Get CORS headers with proper origin validation
 * @param requestOrigin - The Origin header from the incoming request
 * @returns CORS headers object
 */
export function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  // Check if the request origin is in our allowed list
  const origin = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)
    ? requestOrigin
    : ALLOWED_ORIGINS[0]; // Default to primary domain

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
  };
}

/**
 * Handle CORS preflight request
 * @param req - The incoming request
 * @returns Response for OPTIONS request, or null if not a preflight
 */
export function handleCorsPreflightSafe(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.get('Origin');
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    });
  }
  return null;
}

/**
 * Create a JSON response with proper CORS headers
 * @param data - Response data
 * @param status - HTTP status code
 * @param requestOrigin - Origin header from request
 * @returns Response with CORS headers
 */
export function jsonResponseSafe(
  data: unknown,
  status: number,
  requestOrigin: string | null
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...getCorsHeaders(requestOrigin),
      'Content-Type': 'application/json',
    },
  });
}

// Legacy support - for gradual migration
// TODO: Remove after all functions are updated to use safe versions
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

export default {
  getCorsHeaders,
  handleCorsPreflightSafe,
  jsonResponseSafe,
  corsHeaders,
  ALLOWED_ORIGINS,
};
