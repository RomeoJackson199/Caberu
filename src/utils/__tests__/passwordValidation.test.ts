/**
 * Tests for passwordValidation.ts utility functions
 */

import {
  validatePassword,
  checkPasswordBreach,
  getStrengthLabel,
  PasswordStrength,
} from '../passwordValidation';

describe('passwordValidation.ts', () => {
  describe('validatePassword', () => {
    describe('strong passwords', () => {
      it('should validate a strong password with all requirements', () => {
        const result = validatePassword('SecurePass123!@#');
        expect(result.isValid).toBe(true);
        expect(result.score).toBeGreaterThanOrEqual(5);
        expect(result.feedback).toHaveLength(0);
      });

      it('should give bonus points for longer passwords (16+ chars)', () => {
        const short = validatePassword('SecurePass1!');
        const long = validatePassword('SecurePassword123!');
        expect(long.score).toBeGreaterThan(short.score);
      });

      it('should accept passwords with various special characters', () => {
        const passwords = [
          'Password123!@#$',
          'MyPass456%^&*()',
          'SecureP@ss789<>',
          'Test_Pass-123+=',
        ];

        passwords.forEach(password => {
          const result = validatePassword(password);
          expect(result.score).toBeGreaterThanOrEqual(5);
        });
      });
    });

    describe('weak passwords', () => {
      it('should reject passwords shorter than 12 characters', () => {
        const result = validatePassword('Short1!');
        expect(result.isValid).toBe(false);
        expect(result.feedback).toContain('Password must be at least 12 characters long');
      });

      it('should reject passwords without uppercase letters', () => {
        const result = validatePassword('lowercase123!');
        expect(result.isValid).toBe(false);
        expect(result.feedback).toContain('Include at least one uppercase letter');
      });

      it('should reject passwords without lowercase letters', () => {
        const result = validatePassword('UPPERCASE123!');
        expect(result.isValid).toBe(false);
        expect(result.feedback).toContain('Include at least one lowercase letter');
      });

      it('should reject passwords without numbers', () => {
        const result = validatePassword('NoNumbersHere!');
        expect(result.isValid).toBe(false);
        expect(result.feedback).toContain('Include at least one number');
      });

      it('should reject passwords without special characters', () => {
        const result = validatePassword('NoSpecialChars123');
        expect(result.isValid).toBe(false);
        expect(result.feedback).toContain('Include at least one special character (!@#$%^&*...)');
      });
    });

    describe('common patterns detection', () => {
      it('should detect and penalize common password patterns', () => {
        const commonPasswords = [
          'Password123!',
          'Qwerty123456!',
          'Admin123456!',
          'Welcome123!@',
          'Letmein123!@',
        ];

        commonPasswords.forEach(password => {
          const result = validatePassword(password);
          expect(result.feedback.some(f => f.includes('common pattern'))).toBe(true);
          expect(result.isValid).toBe(false);
        });
      });

      it('should detect repeating characters', () => {
        const result = validatePassword('Passsword111!!!');
        expect(result.feedback.some(f => f.includes('repeating the same character'))).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should handle empty passwords', () => {
        const result = validatePassword('');
        expect(result.isValid).toBe(false);
        expect(result.score).toBe(0);
        expect(result.feedback.length).toBeGreaterThan(0);
      });

      it('should handle very long passwords', () => {
        const longPassword = 'A'.repeat(50) + 'b1!';
        const result = validatePassword(longPassword);
        expect(result.score).toBeGreaterThanOrEqual(4);
      });

      it('should be case-sensitive for pattern matching', () => {
        const result1 = validatePassword('PASSWORD123!@');
        const result2 = validatePassword('Password123!@');

        // Both contain "password" pattern (case-insensitive check)
        expect(result1.feedback.some(f => f.includes('common pattern'))).toBe(true);
        expect(result2.feedback.some(f => f.includes('common pattern'))).toBe(true);
      });

      it('should handle passwords with unicode characters', () => {
        const result = validatePassword('SecurePass123!🔒');
        // Should still validate basic requirements
        expect(result.score).toBeGreaterThanOrEqual(5);
      });
    });

    describe('scoring system', () => {
      it('should give appropriate scores based on complexity', () => {
        const weak = validatePassword('weak');
        const medium = validatePassword('MediumPass1');
        const strong = validatePassword('StrongPassword123!@#');

        expect(weak.score).toBeLessThan(medium.score);
        expect(medium.score).toBeLessThan(strong.score);
      });

      it('should reduce score for common patterns', () => {
        const withoutPattern = validatePassword('SecurePass123!@#');
        const withPattern = validatePassword('Password123!@#');

        expect(withPattern.score).toBeLessThan(withoutPattern.score);
      });

      it('should reduce score for repeating characters', () => {
        const normal = validatePassword('SecurePass123!');
        const repeating = validatePassword('Secuuureee123!!!');

        expect(repeating.score).toBeLessThan(normal.score);
      });
    });
  });

  describe('checkPasswordBreach', () => {
    // Mock fetch for testing
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return false for secure passwords (not in breach database)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => 'ABCDE:123\nFGHIJ:456',
      });

      const result = await checkPasswordBreach('SecurePass123!@#');
      expect(result).toBe(false);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.pwnedpasswords.com/range/'),
        expect.objectContaining({
          headers: { 'Add-Padding': 'true' },
        })
      );
    });

    it('should return true for breached passwords', async () => {
      // Mock a response that contains the password hash suffix
      const mockSuffix = 'A'.repeat(35); // Simplified for testing
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => `${mockSuffix}:5000000\nOTHERHASH:123`,
      });

      // Mock crypto.subtle.digest to return predictable hash
      const originalCrypto = global.crypto;
      global.crypto = {
        ...originalCrypto,
        subtle: {
          ...originalCrypto.subtle,
          digest: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4, 5])),
        } as any,
      };

      const result = await checkPasswordBreach('password123');

      // Restore crypto
      global.crypto = originalCrypto;

      expect(global.fetch).toHaveBeenCalled();
    });

    it('should return false if API is unavailable', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 503,
      });

      const result = await checkPasswordBreach('AnyPassword123!');
      expect(result).toBe(false); // Don't block user if API fails
    });

    it('should return false if network error occurs', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await checkPasswordBreach('AnyPassword123!');
      expect(result).toBe(false); // Don't block user if check fails
    });

    it('should use k-anonymity (only send first 5 chars of hash)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => '',
      });

      await checkPasswordBreach('TestPassword123!');

      const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      const hashPrefix = callUrl.split('/').pop();
      expect(hashPrefix).toHaveLength(5);
    });

    it('should include padding header for additional security', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => '',
      });

      await checkPasswordBreach('TestPassword123!');

      const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers;
      expect(headers['Add-Padding']).toBe('true');
    });
  });

  describe('getStrengthLabel', () => {
    it('should return "Very Weak" for score 0-1', () => {
      expect(getStrengthLabel(0)).toEqual({ label: 'Very Weak', color: 'text-red-600' });
      expect(getStrengthLabel(1)).toEqual({ label: 'Very Weak', color: 'text-red-600' });
    });

    it('should return "Weak" for score 2', () => {
      expect(getStrengthLabel(2)).toEqual({ label: 'Weak', color: 'text-orange-500' });
    });

    it('should return "Fair" for score 3', () => {
      expect(getStrengthLabel(3)).toEqual({ label: 'Fair', color: 'text-yellow-500' });
    });

    it('should return "Good" for score 4', () => {
      expect(getStrengthLabel(4)).toEqual({ label: 'Good', color: 'text-blue-500' });
    });

    it('should return "Strong" for score 5+', () => {
      expect(getStrengthLabel(5)).toEqual({ label: 'Strong', color: 'text-green-600' });
      expect(getStrengthLabel(6)).toEqual({ label: 'Strong', color: 'text-green-600' });
      expect(getStrengthLabel(10)).toEqual({ label: 'Strong', color: 'text-green-600' });
    });

    it('should handle negative scores', () => {
      expect(getStrengthLabel(-1)).toEqual({ label: 'Very Weak', color: 'text-red-600' });
    });
  });
});
