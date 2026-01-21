/**
 * Tests for sanitize.ts utility functions
 */

import {
  sanitizeHTML,
  sanitizeText,
  sanitizeAttribute,
  sanitizeURL,
  sanitizeRichText,
} from '../sanitize';

describe('sanitize.ts', () => {
  describe('sanitizeHTML', () => {
    it('should strip all HTML by default', () => {
      const dirty = '<script>alert("XSS")</script><p>Hello</p>';
      const clean = sanitizeHTML(dirty);
      expect(clean).not.toContain('<script>');
      expect(clean).not.toContain('<p>');
      expect(clean).toContain('Hello');
    });

    it('should allow specified tags', () => {
      const dirty = '<p>Hello</p><script>alert("XSS")</script>';
      const clean = sanitizeHTML(dirty, ['p']);
      expect(clean).toContain('<p>');
      expect(clean).not.toContain('<script>');
    });

    it('should keep text content when stripping tags', () => {
      const dirty = '<div>Important <strong>text</strong> content</div>';
      const clean = sanitizeHTML(dirty);
      expect(clean).toContain('Important');
      expect(clean).toContain('text');
      expect(clean).toContain('content');
      expect(clean).not.toContain('<div>');
      expect(clean).not.toContain('<strong>');
    });

    it('should handle empty strings', () => {
      expect(sanitizeHTML('')).toBe('');
      expect(sanitizeHTML(null as any)).toBe('');
      expect(sanitizeHTML(undefined as any)).toBe('');
    });

    it('should remove dangerous event handlers', () => {
      const dirty = '<div onclick="alert(1)">Click me</div>';
      const clean = sanitizeHTML(dirty, ['div']);
      expect(clean).not.toContain('onclick');
      expect(clean).toContain('Click me');
    });

    it('should remove javascript: URLs', () => {
      const dirty = '<a href="javascript:alert(1)">Link</a>';
      const clean = sanitizeHTML(dirty, ['a']);
      expect(clean).not.toContain('javascript:');
    });

    it('should handle nested malicious content', () => {
      const dirty = '<div><script>alert(1)</script><p>Safe</p></div>';
      const clean = sanitizeHTML(dirty, ['p']);
      expect(clean).not.toContain('<script>');
      expect(clean).toContain('Safe');
    });
  });

  describe('sanitizeText', () => {
    it('should strip all HTML tags', () => {
      const text = '<p>Hello <strong>World</strong></p>';
      const clean = sanitizeText(text);
      expect(clean).toBe('Hello World');
      expect(clean).not.toContain('<');
      expect(clean).not.toContain('>');
    });

    it('should decode HTML entities', () => {
      const text = '&lt;div&gt;Hello&lt;/div&gt;';
      const clean = sanitizeText(text);
      expect(clean).not.toContain('&lt;');
      expect(clean).not.toContain('&gt;');
    });

    it('should handle malicious scripts', () => {
      const text = '<script>alert("XSS")</script>Hello';
      const clean = sanitizeText(text);
      expect(clean).not.toContain('<script>');
      expect(clean).not.toContain('alert');
      expect(clean).toContain('Hello');
    });

    it('should handle empty strings', () => {
      expect(sanitizeText('')).toBe('');
      expect(sanitizeText(null as any)).toBe('');
      expect(sanitizeText(undefined as any)).toBe('');
    });

    it('should preserve plain text', () => {
      const text = 'This is plain text without any HTML';
      const clean = sanitizeText(text);
      expect(clean).toBe(text);
    });

    it('should handle special characters', () => {
      const text = 'Price: $100 & taxes';
      const clean = sanitizeText(text);
      expect(clean).toContain('$100');
      expect(clean).toContain('&');
    });
  });

  describe('sanitizeAttribute', () => {
    it('should escape HTML special characters', () => {
      const text = '<script>alert(1)</script>';
      const clean = sanitizeAttribute(text);
      expect(clean).toContain('&lt;');
      expect(clean).toContain('&gt;');
      expect(clean).not.toContain('<');
      expect(clean).not.toContain('>');
    });

    it('should escape quotes', () => {
      const text = 'Say "Hello"';
      const clean = sanitizeAttribute(text);
      expect(clean).toContain('&quot;');
      expect(clean).not.toContain('"');
    });

    it('should escape single quotes', () => {
      const text = "It's a test";
      const clean = sanitizeAttribute(text);
      expect(clean).toContain('&#x27;');
    });

    it('should escape ampersands', () => {
      const text = 'Tom & Jerry';
      const clean = sanitizeAttribute(text);
      expect(clean).toContain('&amp;');
    });

    it('should escape forward slashes', () => {
      const text = '</script>';
      const clean = sanitizeAttribute(text);
      expect(clean).toContain('&#x2F;');
    });

    it('should handle empty strings', () => {
      expect(sanitizeAttribute('')).toBe('');
      expect(sanitizeAttribute(null as any)).toBe('');
      expect(sanitizeAttribute(undefined as any)).toBe('');
    });

    it('should escape all dangerous characters together', () => {
      const text = `<div onclick="alert('XSS')" data-value="test">`;
      const clean = sanitizeAttribute(text);
      expect(clean).not.toContain('<');
      expect(clean).not.toContain('>');
      expect(clean).not.toContain('"');
      expect(clean).not.toContain("'");
    });
  });

  describe('sanitizeURL', () => {
    it('should allow safe HTTP URLs', () => {
      const url = 'https://example.com/page';
      expect(sanitizeURL(url)).toBe(url);
    });

    it('should block javascript: URLs', () => {
      const url = 'javascript:alert(1)';
      expect(sanitizeURL(url)).toBe('');
    });

    it('should block javascript: URLs with mixed case', () => {
      const url = 'JavaScript:alert(1)';
      expect(sanitizeURL(url)).toBe('');
    });

    it('should block data: URLs', () => {
      const url = 'data:text/html,<script>alert(1)</script>';
      expect(sanitizeURL(url)).toBe('');
    });

    it('should block vbscript: URLs', () => {
      const url = 'vbscript:msgbox(1)';
      expect(sanitizeURL(url)).toBe('');
    });

    it('should handle empty strings', () => {
      expect(sanitizeURL('')).toBe('');
      expect(sanitizeURL(null as any)).toBe('');
      expect(sanitizeURL(undefined as any)).toBe('');
    });

    it('should trim whitespace before checking', () => {
      const url = '  javascript:alert(1)  ';
      expect(sanitizeURL(url)).toBe('');
    });

    it('should allow URLs with query parameters', () => {
      const url = 'https://example.com/page?id=123&user=test';
      expect(sanitizeURL(url)).toBe(url);
    });

    it('should allow relative URLs', () => {
      const url = '/page/subpage';
      expect(sanitizeURL(url)).toBe(url);
    });

    it('should allow fragment identifiers', () => {
      const url = '#section-1';
      expect(sanitizeURL(url)).toBe(url);
    });
  });

  describe('sanitizeRichText', () => {
    it('should allow basic formatting tags', () => {
      const html = '<p>Hello <strong>World</strong></p>';
      const clean = sanitizeRichText(html);
      expect(clean).toContain('<p>');
      expect(clean).toContain('<strong>');
      expect(clean).toContain('Hello');
    });

    it('should allow safe links', () => {
      const html = '<a href="https://example.com">Link</a>';
      const clean = sanitizeRichText(html);
      expect(clean).toContain('<a');
      expect(clean).toContain('href=');
    });

    it('should allow lists', () => {
      const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const clean = sanitizeRichText(html);
      expect(clean).toContain('<ul>');
      expect(clean).toContain('<li>');
    });

    it('should remove script tags', () => {
      const html = '<p>Text</p><script>alert(1)</script>';
      const clean = sanitizeRichText(html);
      expect(clean).not.toContain('<script>');
      expect(clean).toContain('<p>');
    });

    it('should remove dangerous attributes', () => {
      const html = '<p onclick="alert(1)">Click me</p>';
      const clean = sanitizeRichText(html);
      expect(clean).not.toContain('onclick');
      expect(clean).toContain('Click me');
    });

    it('should not allow data attributes', () => {
      const html = '<div data-secret="value">Content</div>';
      const clean = sanitizeRichText(html);
      expect(clean).not.toContain('data-secret');
    });

    it('should remove disallowed tags but keep content', () => {
      const html = '<div>Hello</div><p>World</p>';
      const clean = sanitizeRichText(html);
      expect(clean).not.toContain('<div>');
      expect(clean).toContain('<p>');
      expect(clean).toContain('Hello');
      expect(clean).toContain('World');
    });

    it('should handle empty strings', () => {
      expect(sanitizeRichText('')).toBe('');
      expect(sanitizeRichText(null as any)).toBe('');
      expect(sanitizeRichText(undefined as any)).toBe('');
    });

    it('should allow emphasis tags', () => {
      const html = '<em>Italic</em> and <i>also italic</i>';
      const clean = sanitizeRichText(html);
      expect(clean).toContain('<em>');
      expect(clean).toContain('<i>');
    });
  });

  describe('XSS prevention', () => {
    it('should prevent XSS through event handlers', () => {
      const tests = [
        '<img src=x onerror=alert(1)>',
        '<body onload=alert(1)>',
        '<input onfocus=alert(1) autofocus>',
        '<select onfocus=alert(1) autofocus>',
      ];

      tests.forEach(test => {
        expect(sanitizeHTML(test)).not.toContain('alert');
        expect(sanitizeHTML(test)).not.toContain('onerror');
        expect(sanitizeHTML(test)).not.toContain('onload');
      });
    });

    it('should prevent XSS through javascript: protocol', () => {
      const tests = [
        '<a href="javascript:alert(1)">Click</a>',
        '<iframe src="javascript:alert(1)"></iframe>',
      ];

      tests.forEach(test => {
        expect(sanitizeHTML(test, ['a', 'iframe'])).not.toContain('javascript:');
      });
    });

    it('should prevent XSS through data: protocol', () => {
      const test = '<object data="data:text/html,<script>alert(1)</script>"></object>';
      expect(sanitizeHTML(test, ['object'])).not.toContain('data:');
    });
  });
});
