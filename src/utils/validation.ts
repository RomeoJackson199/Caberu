export const isValidImageUrl = (url: string): boolean => {
    if (!url) return false;
    // Allow data:image for base64 (e.g. from local file readers before upload)
    if (url.startsWith('data:image/')) return true;

    try {
        const parsed = new URL(url);
        // Whitelist domains
        const allowedDomains = [
            'supabase.co',
            'supabase.in',
            'amazonaws.com', // typical S3
            'googleusercontent.com', // fast google images
            'unsplash.com'
        ];

        // Check if domain ends with any allowed domain (to allow subdomains)
        const isAllowedDomain = allowedDomains.some(domain =>
            parsed.hostname === domain || parsed.hostname.endsWith('.' + domain) || parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
        );

        if (!isAllowedDomain) return false;

        // Extension validation could be added here in the future
        // For now, we trust URLs from allowed domains (Supabase storage)
        return true;
    } catch {
        return false;
    }
};

export const sanitizeProfileUrl = (url?: string): string | undefined => {
    if (!url) return undefined;
    return isValidImageUrl(url) ? url : undefined;
};
