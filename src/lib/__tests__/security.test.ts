/**
 * Tests for security.ts - Security utilities for input validation and sanitization
 */

// Mock Response class for Node.js environment
class MockResponse {
  status: number;
  body: string;
  headers: Map<string, string>;

  constructor(body: string, options?: { status?: number; headers?: Record<string, string> }) {
    this.body = body;
    this.status = options?.status || 200;
    this.headers = new Map(Object.entries(options?.headers || {}));
  }

  async json() {
    return JSON.parse(this.body);
  }
}

// @ts-ignore - Mock global Response
global.Response = MockResponse as unknown as typeof Response;

import {
  sanitizeHtml,
  sanitizeInput,
  validateEmail,
  validatePhone,
  validateName,
  validatePassword,
  sanitizeFormData,
  ClientRateLimit,
  getCorsHeaders,
  createSecureErrorResponse,
  validateDentalFormData,
} from '../security';

describe('security.ts', () => {
  describe('sanitizeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(sanitizeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
      );
    });

    it('should escape ampersands', () => {
      expect(sanitizeHtml('foo & bar')).toBe('foo &amp; bar');
    });

    it('should escape quotes', () => {
      expect(sanitizeHtml('"double" and \'single\'')).toBe(
        '&quot;double&quot; and &#x27;single&#x27;'
      );
    });

    it('should escape forward slashes', () => {
      expect(sanitizeHtml('path/to/file')).toBe('path&#x2F;to&#x2F;file');
    });

    it('should handle empty string', () => {
      expect(sanitizeHtml('')).toBe('');
    });

    it('should handle string without special characters', () => {
      expect(sanitizeHtml('Hello World')).toBe('Hello World');
    });
  });

  describe('sanitizeInput', () => {
    it('should remove SQL injection characters', () => {
      expect(sanitizeInput("Robert'; DROP TABLE users;--")).toBe('Robert DROP TABLE users');
    });

    it('should remove quotes and backslashes', () => {
      expect(sanitizeInput('test"value\'other\\slash')).toBe('testvalueotherslash');
    });

    it('should remove SQL comment patterns', () => {
      expect(sanitizeInput('value -- comment')).toBe('value  comment');
      expect(sanitizeInput('value /* comment */')).toBe('value  comment');
    });

    it('should remove stored procedure prefixes', () => {
      expect(sanitizeInput('xp_cmdshell')).toBe('cmdshell');
      expect(sanitizeInput('sp_executesql')).toBe('executesql');
    });

    it('should trim whitespace', () => {
      expect(sanitizeInput('  value  ')).toBe('value');
    });

    it('should handle empty string', () => {
      expect(sanitizeInput('')).toBe('');
    });
  });

  describe('validateEmail', () => {
    it('should accept valid email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('user+label@gmail.com')).toBe(true);
      expect(validateEmail('valid.email@subdomain.domain.org')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
      expect(validateEmail('test @example.com')).toBe(false);
    });

    it('should reject emails exceeding RFC 5321 limit', () => {
      const longEmail = 'a'.repeat(250) + '@test.com';
      expect(validateEmail(longEmail)).toBe(false);
    });

    it('should accept emails at the limit', () => {
      const validLongEmail = 'a'.repeat(240) + '@test.com';
      expect(validateEmail(validLongEmail)).toBe(true);
    });
  });

  describe('validatePhone', () => {
    it('should accept valid phone numbers', () => {
      expect(validatePhone('+1234567890')).toBe(true);
      expect(validatePhone('123-456-7890')).toBe(true);
      expect(validatePhone('(123) 456-7890')).toBe(true);
      expect(validatePhone('+32 471 12 34 56')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validatePhone('abc')).toBe(false);
      expect(validatePhone('12')).toBe(false);
      expect(validatePhone('')).toBe(false);
    });
  });

  describe('validateName', () => {
    it('should accept valid names', () => {
      expect(validateName('John')).toBe(true);
      expect(validateName('Mary Jane')).toBe(true);
      expect(validateName("O'Connor")).toBe(true);
      expect(validateName('Smith-Jones')).toBe(true);
      expect(validateName('François')).toBe(true);
      expect(validateName('Müller')).toBe(true);
    });

    it('should reject names with invalid characters', () => {
      expect(validateName('John123')).toBe(false);
      expect(validateName('User@name')).toBe(false);
      expect(validateName('<script>')).toBe(false);
    });

    it('should reject names that are too long', () => {
      const longName = 'A'.repeat(51);
      expect(validateName(longName)).toBe(false);
    });

    it('should reject empty names', () => {
      expect(validateName('')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should accept valid passwords', () => {
      const result = validatePassword('StrongP@ss1');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject passwords without uppercase', () => {
      const result = validatePassword('password1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject passwords without lowercase', () => {
      const result = validatePassword('PASSWORD1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject passwords without numbers', () => {
      const result = validatePassword('Password!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject passwords without special characters', () => {
      const result = validatePassword('Password1');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should reject passwords that are too short', () => {
      const result = validatePassword('Pa1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should return multiple errors for very weak passwords', () => {
      const result = validatePassword('weak');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('sanitizeFormData', () => {
    it('should sanitize string fields', () => {
      const data = {
        name: '  John  ',
        email: 'test@example.com',
        message: '<script>alert("xss")</script>',
      };
      const sanitized = sanitizeFormData(data);
      expect(sanitized.name).toBe('John');
      expect(sanitized.message).toContain('&lt;script&gt;');
    });

    it('should preserve non-string fields', () => {
      const data = {
        name: 'John',
        age: 30,
        active: true,
        items: [1, 2, 3],
      };
      const sanitized = sanitizeFormData(data);
      expect(sanitized.age).toBe(30);
      expect(sanitized.active).toBe(true);
      expect(sanitized.items).toEqual([1, 2, 3]);
    });

    it('should remove null bytes', () => {
      const data = { name: 'John\x00Doe' };
      const sanitized = sanitizeFormData(data);
      expect(sanitized.name).toBe('JohnDoe');
    });

    it('should truncate very long strings', () => {
      const data = { content: 'a'.repeat(15000) };
      const sanitized = sanitizeFormData(data);
      expect(sanitized.content.length).toBe(10000);
    });
  });

  describe('ClientRateLimit', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should allow requests within limit', () => {
      const limiter = new ClientRateLimit(3, 60000);
      expect(limiter.isAllowed('user1')).toBe(true);
      expect(limiter.isAllowed('user1')).toBe(true);
      expect(limiter.isAllowed('user1')).toBe(true);
    });

    it('should block requests exceeding limit', () => {
      const limiter = new ClientRateLimit(3, 60000);
      expect(limiter.isAllowed('user1')).toBe(true);
      expect(limiter.isAllowed('user1')).toBe(true);
      expect(limiter.isAllowed('user1')).toBe(true);
      expect(limiter.isAllowed('user1')).toBe(false);
    });

    it('should track different identifiers separately', () => {
      const limiter = new ClientRateLimit(2, 60000);
      expect(limiter.isAllowed('user1')).toBe(true);
      expect(limiter.isAllowed('user1')).toBe(true);
      expect(limiter.isAllowed('user1')).toBe(false);
      expect(limiter.isAllowed('user2')).toBe(true);
    });

    it('should reset after window expires', () => {
      const limiter = new ClientRateLimit(2, 60000);
      expect(limiter.isAllowed('user1')).toBe(true);
      expect(limiter.isAllowed('user1')).toBe(true);
      expect(limiter.isAllowed('user1')).toBe(false);

      jest.advanceTimersByTime(61000);

      expect(limiter.isAllowed('user1')).toBe(true);
    });

    it('should return correct remaining attempts', () => {
      const limiter = new ClientRateLimit(5, 60000);
      expect(limiter.getRemainingAttempts('user1')).toBe(5);
      limiter.isAllowed('user1');
      expect(limiter.getRemainingAttempts('user1')).toBe(4);
      limiter.isAllowed('user1');
      limiter.isAllowed('user1');
      expect(limiter.getRemainingAttempts('user1')).toBe(2);
    });

    it('should reset attempts for specific identifier', () => {
      const limiter = new ClientRateLimit(3, 60000);
      limiter.isAllowed('user1');
      limiter.isAllowed('user1');
      expect(limiter.getRemainingAttempts('user1')).toBe(1);

      limiter.reset('user1');
      expect(limiter.getRemainingAttempts('user1')).toBe(3);
    });

    it('should use default values', () => {
      const limiter = new ClientRateLimit();
      // Default is 5 attempts
      expect(limiter.getRemainingAttempts('user1')).toBe(5);
    });
  });

  describe('getCorsHeaders', () => {
    it('should return restrictive headers for production', () => {
      const headers = getCorsHeaders('production');
      expect(headers['Access-Control-Allow-Origin']).not.toBe('*');
      expect(headers['Access-Control-Max-Age']).toBe('86400');
    });

    it('should return permissive headers for development', () => {
      const headers = getCorsHeaders('development');
      expect(headers['Access-Control-Allow-Origin']).toBe('*');
    });

    it('should return permissive headers when no environment specified', () => {
      const headers = getCorsHeaders();
      expect(headers['Access-Control-Allow-Origin']).toBe('*');
    });

    it('should include required headers', () => {
      const headers = getCorsHeaders();
      expect(headers['Access-Control-Allow-Headers']).toContain('authorization');
      expect(headers['Access-Control-Allow-Methods']).toContain('GET');
      expect(headers['Access-Control-Allow-Methods']).toContain('POST');
    });
  });

  describe('createSecureErrorResponse', () => {
    it('should create response with correct status code', () => {
      const response = createSecureErrorResponse('Test error', 400);
      expect(response.status).toBe(400);
    });

    it('should hide error details in production', async () => {
      const response = createSecureErrorResponse('Internal details', 500, 'production');
      const body = await response.json();
      expect(body.error).toBe('An error occurred');
      expect(body.details).toBeUndefined();
    });

    it('should show error details in development', async () => {
      const response = createSecureErrorResponse('Detailed error', 500, 'development');
      const body = await response.json();
      expect(body.error).toBe('Detailed error');
      expect(body.details).toBe('Detailed error');
    });

    it('should return Unauthorized for 401 status', async () => {
      const response = createSecureErrorResponse('Auth failed', 401, 'production');
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('should return Forbidden for 403 status', async () => {
      const response = createSecureErrorResponse('Access denied', 403, 'production');
      const body = await response.json();
      expect(body.error).toBe('Forbidden');
    });

    it('should handle Error objects', async () => {
      const error = new Error('Something went wrong');
      const response = createSecureErrorResponse(error, 500, 'development');
      const body = await response.json();
      expect(body.error).toBe('Something went wrong');
    });

    it('should include CORS headers', () => {
      const response = createSecureErrorResponse('Error', 500);
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('validateDentalFormData', () => {
    it('should validate correct form data', () => {
      const data = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        phone: '+32471123456',
      };
      const result = validateDentalFormData(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid first name', () => {
      const data = { first_name: 'John123' };
      const result = validateDentalFormData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('First name contains invalid characters');
    });

    it('should reject invalid last name', () => {
      const data = { last_name: '<script>' };
      const result = validateDentalFormData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Last name contains invalid characters');
    });

    it('should reject invalid email', () => {
      const data = { email: 'invalid-email' };
      const result = validateDentalFormData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });

    it('should reject invalid phone', () => {
      const data = { phone: 'abc' };
      const result = validateDentalFormData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid phone number format');
    });

    it('should allow empty phone', () => {
      const data = { phone: '' };
      const result = validateDentalFormData(data);
      expect(result.isValid).toBe(true);
    });

    it('should validate password requirements', () => {
      const data = { password: 'weak' };
      const result = validateDentalFormData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Password'))).toBe(true);
    });

    it('should reject too long symptoms', () => {
      const data = { symptoms: 'a'.repeat(1001) };
      const result = validateDentalFormData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Symptoms description is too long');
    });

    it('should reject too long medical history', () => {
      const data = { medical_history: 'a'.repeat(5001) };
      const result = validateDentalFormData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Medical history is too long');
    });

    it('should reject too long reason', () => {
      const data = { reason: 'a'.repeat(501) };
      const result = validateDentalFormData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Appointment reason is too long');
    });
  });
});
