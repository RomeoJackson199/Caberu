/**
 * Shared CORS configuration for Edge Functions
 * SECURITY: Restrict origins to known domains instead of allowing all (*)
 */

// Allowed origins - add your production and staging domains here
const ALLOWED_ORIGINS = [
  'https://caberu.be',
  'https://www.caberu.be',
  'https://app.caberu.be',
  'https://dentibot.lovable.app',
  // Supabase Studio for development
  'https://supabase.com',
  // Local development
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

// Dynamic origin matching for Lovable preview domains
export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  
  // Check static list first
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  
  // Allow Lovable preview domains (*.lovableproject.com and *.lovable.app)
  if (origin.match(/^https:\/\/[a-z0-9-]+\.lovableproject\.com$/)) return true;
  if (origin.match(/^https:\/\/[a-z0-9-]+--[a-z0-9-]+\.lovable\.app$/)) return true;
  if (origin.match(/^https:\/\/[a-z0-9-]+\.lovable\.app$/)) return true;
  
  return false;
}

/**
 * Get CORS headers with proper origin validation
 * @param requestOrigin - The Origin header from the incoming request
 * @returns CORS headers object
 */
export function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  // Check if the request origin is in our allowed list (including dynamic Lovable domains)
  const origin = requestOrigin && isAllowedOrigin(requestOrigin)
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

// Legacy support - DEPRECATED: Use getCorsHeaders(origin) instead
// This exists only for backward compatibility during migration
// WARNING: Using '*' origin is a security risk - migrate to getCorsHeaders(origin) ASAP
/** @deprecated Use getCorsHeaders(origin) instead for proper origin validation */
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
  isAllowedOrigin,
  ALLOWED_ORIGINS,
};
