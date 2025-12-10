/**
 * HTML/Text Sanitization Utility
 * Prevents XSS attacks by sanitizing user-generated content
 */

import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content with configurable allowed tags
 * @param dirty - The potentially unsafe HTML string
 * @param allowedTags - Optional array of allowed HTML tags
 * @returns Sanitized string with dangerous content removed
 */
export const sanitizeHTML = (dirty: string, allowedTags?: string[]): string => {
    if (!dirty) return '';

    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: allowedTags || [], // By default, strip ALL HTML
        ALLOWED_ATTR: [], // No attributes allowed by default
        KEEP_CONTENT: true, // Keep text content, just remove tags
        RETURN_DOM: false,
        RETURN_DOM_FRAGMENT: false,
    });
};

/**
 * Strip ALL HTML and return plain text only
 * Use for user-generated content like notes, descriptions, comments
 * @param text - The potentially unsafe text
 * @returns Plain text with all HTML removed
 */
export const sanitizeText = (text: string): string => {
    if (!text) return '';

    // First sanitize to remove any malicious content
    const sanitized = DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });

    // Also decode HTML entities
    const textarea = document.createElement('textarea');
    textarea.innerHTML = sanitized;
    return textarea.value;
};

/**
 * Sanitize for display in HTML attributes (like title, alt)
 * @param text - The potentially unsafe text
 * @returns Safe string for use in attributes
 */
export const sanitizeAttribute = (text: string): string => {
    if (!text) return '';

    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
};

/**
 * Sanitize URL to prevent javascript: and data: attacks
 * @param url - The potentially unsafe URL
 * @returns Safe URL or empty string if malicious
 */
export const sanitizeURL = (url: string): string => {
    if (!url) return '';

    const trimmed = url.trim().toLowerCase();

    // Block javascript: and data: URLs
    if (trimmed.startsWith('javascript:') ||
        trimmed.startsWith('data:') ||
        trimmed.startsWith('vbscript:')) {
        return '';
    }

    return url;
};

/**
 * Sanitize rich text content (allow basic formatting)
 * Use for content that needs formatting like descriptions
 */
export const sanitizeRichText = (html: string): string => {
    if (!html) return '';

    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
        ALLOWED_ATTR: ['href', 'target', 'rel'],
        ALLOW_DATA_ATTR: false,
    });
};

export default {
    sanitizeHTML,
    sanitizeText,
    sanitizeAttribute,
    sanitizeURL,
    sanitizeRichText,
};
