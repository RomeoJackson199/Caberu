/**
 * CSRF Protection Utility for Supabase Edge Functions
 * Validates Origin and Referer headers to prevent cross-site request forgery
 */

// Allowed origins for CSRF protection
const ALLOWED_ORIGINS = [
    'https://caberu.be',
    'https://www.caberu.be',
    'https://preview--dentibot.lovable.app',
    'https://dentibot.lovable.app',
    'http://localhost:5173', // Local dev
    'http://localhost:3000',
];

/**
 * Validate the Origin header for CSRF protection
 * @param request - The incoming request
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateCsrf(request: Request): { isValid: boolean; error?: string } {
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');

    // For non-browser requests (server-to-server), origin may be null
    // In that case, check if it's an internal Supabase call
    if (!origin && !referer) {
        // Allow if it's a service role key request (server-side)
        const authHeader = request.headers.get('authorization');
        if (authHeader?.includes('service_role')) {
            return { isValid: true };
        }
        // For anon key requests without origin, this might be suspicious
        // but we'll allow for now and log
        console.warn('CSRF: Request without Origin or Referer header');
        return { isValid: true }; // Be permissive for now, log for monitoring
    }

    // Validate origin against allowed list
    if (origin && ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed))) {
        return { isValid: true };
    }

    // Check referer as fallback
    if (referer && ALLOWED_ORIGINS.some(allowed => referer.startsWith(allowed))) {
        return { isValid: true };
    }

    console.error('CSRF: Invalid origin/referer', { origin, referer });
    return {
        isValid: false,
        error: 'Request origin not allowed'
    };
}

/**
 * CORS headers that should be used with CSRF protection
 * Uses specific origins instead of wildcard for security
 */
export const secureCorsHeaders = {
    'Access-Control-Allow-Origin': 'https://caberu.be',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
};

/**
 * Dynamic CORS headers based on request origin
 */
export function getCorsHeaders(request: Request): Record<string, string> {
    const origin = request.headers.get('origin');

    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        return {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            'Access-Control-Allow-Credentials': 'true',
        };
    }

    // Default to primary domain
    return secureCorsHeaders;
}
