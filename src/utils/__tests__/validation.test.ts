/**
 * Tests for validation.ts utility functions
 */

import { isValidImageUrl, sanitizeProfileUrl } from '../validation';

describe('validation.ts', () => {
  describe('isValidImageUrl', () => {
    describe('valid URLs', () => {
      it('should accept valid Supabase URLs', () => {
        expect(isValidImageUrl('https://test.supabase.co/storage/image.jpg')).toBe(true);
        expect(isValidImageUrl('https://subdomain.supabase.in/path/image.png')).toBe(true);
      });

      it('should accept valid S3 URLs', () => {
        expect(isValidImageUrl('https://bucket.s3.amazonaws.com/image.jpg')).toBe(true);
        expect(isValidImageUrl('https://s3.amazonaws.com/bucket/image.png')).toBe(true);
      });

      it('should accept valid Google image URLs', () => {
        expect(isValidImageUrl('https://lh3.googleusercontent.com/image.jpg')).toBe(true);
      });

      it('should accept valid Unsplash URLs', () => {
        expect(isValidImageUrl('https://images.unsplash.com/photo-123')).toBe(true);
        expect(isValidImageUrl('https://unsplash.com/photos/abc')).toBe(true);
      });

      it('should accept localhost URLs', () => {
        expect(isValidImageUrl('http://localhost:3000/image.jpg')).toBe(true);
        expect(isValidImageUrl('http://127.0.0.1:8080/image.png')).toBe(true);
      });

      it('should accept data:image URLs (base64)', () => {
        expect(isValidImageUrl('data:image/png;base64,iVBORw0KGgoAAAANS')).toBe(true);
        expect(isValidImageUrl('data:image/jpeg;base64,/9j/4AAQSkZJRg')).toBe(true);
        expect(isValidImageUrl('data:image/gif;base64,R0lGODlh')).toBe(true);
      });

      it('should accept URLs without file extensions from trusted domains', () => {
        // Dynamic serving URLs without extensions but from trusted domains
        expect(isValidImageUrl('https://test.supabase.co/storage/v1/render/image?id=123')).toBe(true);
        expect(isValidImageUrl('https://images.unsplash.com/photo-123')).toBe(true);
      });
    });

    describe('invalid URLs', () => {
      it('should reject empty or null URLs', () => {
        expect(isValidImageUrl('')).toBe(false);
        expect(isValidImageUrl(null as any)).toBe(false);
        expect(isValidImageUrl(undefined as any)).toBe(false);
      });

      it('should reject URLs from untrusted domains', () => {
        expect(isValidImageUrl('https://evil.com/malware.jpg')).toBe(false);
        expect(isValidImageUrl('https://random-site.org/image.png')).toBe(false);
      });

      it('should reject malformed URLs', () => {
        expect(isValidImageUrl('not-a-url')).toBe(false);
        expect(isValidImageUrl('javascript:alert(1)')).toBe(false);
        expect(isValidImageUrl('file:///etc/passwd')).toBe(false);
      });

      it('should reject non-HTTP(S) protocols', () => {
        expect(isValidImageUrl('ftp://example.com/image.jpg')).toBe(false);
        expect(isValidImageUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should handle URLs with query parameters', () => {
        expect(isValidImageUrl('https://test.supabase.co/image.jpg?token=abc&size=large')).toBe(true);
      });

      it('should handle URLs with fragments', () => {
        expect(isValidImageUrl('https://test.supabase.co/image.jpg#section')).toBe(true);
      });

      it('should be case-insensitive for protocols', () => {
        expect(isValidImageUrl('HTTPS://test.supabase.co/image.jpg')).toBe(true);
        expect(isValidImageUrl('HtTpS://test.supabase.co/image.jpg')).toBe(true);
      });

      it('should handle subdomains correctly', () => {
        expect(isValidImageUrl('https://cdn.project.supabase.co/image.jpg')).toBe(true);
        expect(isValidImageUrl('https://my-bucket.s3.amazonaws.com/image.jpg')).toBe(true);
      });

      it('should handle URLs with port numbers', () => {
        expect(isValidImageUrl('http://localhost:3000/image.jpg')).toBe(true);
        expect(isValidImageUrl('http://127.0.0.1:8080/test.png')).toBe(true);
      });

      it('should handle URLs with special characters in path', () => {
        expect(isValidImageUrl('https://test.supabase.co/path/image%20with%20spaces.jpg')).toBe(true);
        expect(isValidImageUrl('https://test.supabase.co/path/image-with-dashes.jpg')).toBe(true);
      });
    });

    describe('security concerns', () => {
      it('should reject javascript: protocol', () => {
        expect(isValidImageUrl('javascript:alert(1)')).toBe(false);
        expect(isValidImageUrl('JavaScript:void(0)')).toBe(false);
      });

      it('should reject data: URLs that are not images', () => {
        expect(isValidImageUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
        expect(isValidImageUrl('data:application/javascript,alert(1)')).toBe(false);
      });

      it('should accept data:image URLs', () => {
        expect(isValidImageUrl('data:image/png;base64,abc')).toBe(true);
        expect(isValidImageUrl('data:image/svg+xml,<svg></svg>')).toBe(true);
      });
    });
  });

  describe('sanitizeProfileUrl', () => {
    it('should return valid URLs unchanged', () => {
      const validUrl = 'https://test.supabase.co/image.jpg';
      expect(sanitizeProfileUrl(validUrl)).toBe(validUrl);
    });

    it('should return undefined for invalid URLs', () => {
      expect(sanitizeProfileUrl('https://evil.com/image.jpg')).toBeUndefined();
      expect(sanitizeProfileUrl('javascript:alert(1)')).toBeUndefined();
      expect(sanitizeProfileUrl('not-a-url')).toBeUndefined();
    });

    it('should return undefined for empty or null input', () => {
      expect(sanitizeProfileUrl('')).toBeUndefined();
      expect(sanitizeProfileUrl(undefined)).toBeUndefined();
      expect(sanitizeProfileUrl(null as any)).toBeUndefined();
    });

    it('should preserve valid data:image URLs', () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANS';
      expect(sanitizeProfileUrl(dataUrl)).toBe(dataUrl);
    });

    it('should filter out malicious URLs', () => {
      expect(sanitizeProfileUrl('file:///etc/passwd')).toBeUndefined();
      expect(sanitizeProfileUrl('ftp://example.com/image.jpg')).toBeUndefined();
    });
  });
});
