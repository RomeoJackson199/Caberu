/**
 * Tests for secureStorage.ts utility functions
 */

import {
  getSecureItem,
  setSecureItem,
  removeSecureItem,
  getPreference,
  setPreference,
  clearAuthSession,
  migrateToSessionStorage,
} from '../secureStorage';

describe('secureStorage.ts', () => {
  // Mock storage
  let sessionStorageMock: { [key: string]: string };
  let localStorageMock: { [key: string]: string };

  beforeEach(() => {
    // Clear mocks before each test
    sessionStorageMock = {};
    localStorageMock = {};

    // Mock sessionStorage
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: jest.fn((key: string) => sessionStorageMock[key] || null),
        setItem: jest.fn((key: string, value: string) => {
          sessionStorageMock[key] = value;
        }),
        removeItem: jest.fn((key: string) => {
          delete sessionStorageMock[key];
        }),
        clear: jest.fn(() => {
          sessionStorageMock = {};
        }),
      },
      writable: true,
    });

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key: string) => localStorageMock[key] || null),
        setItem: jest.fn((key: string, value: string) => {
          localStorageMock[key] = value;
        }),
        removeItem: jest.fn((key: string) => {
          delete localStorageMock[key];
        }),
        clear: jest.fn(() => {
          localStorageMock = {};
        }),
      },
      writable: true,
    });

    // Spy on console.error
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getSecureItem', () => {
    it('should retrieve item from sessionStorage', () => {
      sessionStorageMock['selected_business_id'] = 'test-123';
      const result = getSecureItem('selected_business_id');
      expect(result).toBe('test-123');
      expect(sessionStorage.getItem).toHaveBeenCalledWith('selected_business_id');
    });

    it('should return null for non-existent items', () => {
      const result = getSecureItem('selected_business_id');
      expect(result).toBeNull();
    });

    it('should check expiry for consent data', () => {
      const futureExpiry = Date.now() + 10000;
      const validConsent = JSON.stringify({
        value: 'accepted',
        expiresAt: futureExpiry,
      });
      sessionStorageMock['pending_practice_consent'] = validConsent;

      const result = getSecureItem('pending_practice_consent');
      expect(result).toBe(validConsent);
    });

    it('should remove expired consent data', () => {
      const pastExpiry = Date.now() - 10000;
      const expiredConsent = JSON.stringify({
        value: 'accepted',
        expiresAt: pastExpiry,
      });
      sessionStorageMock['pending_practice_consent'] = expiredConsent;

      const result = getSecureItem('pending_practice_consent');
      expect(result).toBeNull();
      expect(sessionStorage.removeItem).toHaveBeenCalledWith('pending_practice_consent');
    });

    it('should handle non-JSON consent data gracefully', () => {
      sessionStorageMock['pending_practice_consent'] = 'plain-string';
      const result = getSecureItem('pending_practice_consent');
      expect(result).toBe('plain-string');
    });

    it('should handle storage errors gracefully', () => {
      jest.spyOn(sessionStorage, 'getItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      const result = getSecureItem('selected_business_id');
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith('Failed to get secure item:', expect.any(Error));
    });
  });

  describe('setSecureItem', () => {
    it('should store item in sessionStorage without expiry', () => {
      setSecureItem('selected_business_id', 'test-123');
      expect(sessionStorage.setItem).toHaveBeenCalledWith('selected_business_id', 'test-123');
      expect(sessionStorageMock['selected_business_id']).toBe('test-123');
    });

    it('should store item with expiry as JSON', () => {
      const beforeTime = Date.now();
      setSecureItem('pending_practice_consent', 'accepted', 15);
      const afterTime = Date.now();

      expect(sessionStorage.setItem).toHaveBeenCalledWith(
        'pending_practice_consent',
        expect.any(String)
      );

      const stored = JSON.parse(sessionStorageMock['pending_practice_consent']);
      expect(stored.value).toBe('accepted');
      expect(stored.expiresAt).toBeGreaterThanOrEqual(beforeTime + 15 * 60 * 1000);
      expect(stored.expiresAt).toBeLessThanOrEqual(afterTime + 15 * 60 * 1000);
    });

    it('should calculate expiry correctly for different durations', () => {
      setSecureItem('auth_redirect_path', '/dashboard', 30);

      const stored = JSON.parse(sessionStorageMock['auth_redirect_path']);
      expect(stored.expiresAt).toBeGreaterThan(Date.now());
      expect(stored.expiresAt).toBeLessThanOrEqual(Date.now() + 30 * 60 * 1000 + 100); // +100ms tolerance
    });

    it('should handle storage errors gracefully', () => {
      jest.spyOn(sessionStorage, 'setItem').mockImplementation(() => {
        throw new Error('Storage full');
      });

      setSecureItem('selected_business_id', 'test');
      expect(console.error).toHaveBeenCalledWith('Failed to set secure item:', expect.any(Error));
    });
  });

  describe('removeSecureItem', () => {
    it('should remove item from sessionStorage', () => {
      sessionStorageMock['selected_business_id'] = 'test-123';
      removeSecureItem('selected_business_id');

      expect(sessionStorage.removeItem).toHaveBeenCalledWith('selected_business_id');
      expect(sessionStorageMock['selected_business_id']).toBeUndefined();
    });

    it('should handle removal of non-existent items', () => {
      removeSecureItem('selected_business_id');
      expect(sessionStorage.removeItem).toHaveBeenCalledWith('selected_business_id');
    });

    it('should handle storage errors gracefully', () => {
      jest.spyOn(sessionStorage, 'removeItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      removeSecureItem('selected_business_id');
      expect(console.error).toHaveBeenCalledWith('Failed to remove secure item:', expect.any(Error));
    });
  });

  describe('getPreference', () => {
    it('should retrieve preference from localStorage', () => {
      localStorageMock['theme'] = 'dark';
      const result = getPreference('theme');
      expect(result).toBe('dark');
      expect(localStorage.getItem).toHaveBeenCalledWith('theme');
    });

    it('should return null for non-existent preferences', () => {
      const result = getPreference('theme');
      expect(result).toBeNull();
    });

    it('should handle storage errors gracefully', () => {
      jest.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      const result = getPreference('theme');
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith('Failed to get preference:', expect.any(Error));
    });
  });

  describe('setPreference', () => {
    it('should store preference in localStorage', () => {
      setPreference('theme', 'dark');
      expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
      expect(localStorageMock['theme']).toBe('dark');
    });

    it('should handle storage errors gracefully', () => {
      jest.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('Storage full');
      });

      setPreference('theme', 'dark');
      expect(console.error).toHaveBeenCalledWith('Failed to set preference:', expect.any(Error));
    });
  });

  describe('clearAuthSession', () => {
    it('should clear all auth-sensitive session data', () => {
      sessionStorageMock['selected_business_id'] = 'test-123';
      sessionStorageMock['pending_practice_consent'] = 'accepted';
      sessionStorageMock['auth_redirect_path'] = '/dashboard';

      clearAuthSession();

      expect(sessionStorage.removeItem).toHaveBeenCalledWith('selected_business_id');
      expect(sessionStorage.removeItem).toHaveBeenCalledWith('pending_practice_consent');
      expect(sessionStorage.removeItem).toHaveBeenCalledWith('pending_patient_terms_consent');
      expect(sessionStorage.removeItem).toHaveBeenCalledWith('auth_redirect_path');

      expect(Object.keys(sessionStorageMock)).toHaveLength(0);
    });

    it('should not affect localStorage preferences', () => {
      localStorageMock['theme'] = 'dark';
      localStorageMock['preferred-language'] = 'en';

      clearAuthSession();

      expect(localStorageMock['theme']).toBe('dark');
      expect(localStorageMock['preferred-language']).toBe('en');
    });

    it('should handle storage errors gracefully', () => {
      jest.spyOn(sessionStorage, 'removeItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      clearAuthSession();
      expect(console.error).toHaveBeenCalledWith('Failed to clear auth session:', expect.any(Error));
    });
  });

  describe('migrateToSessionStorage', () => {
    it('should migrate auth-sensitive data from localStorage to sessionStorage', () => {
      localStorageMock['selected_business_id'] = 'test-123';
      localStorageMock['auth_redirect_path'] = '/dashboard';

      migrateToSessionStorage();

      expect(sessionStorageMock['selected_business_id']).toBe('test-123');
      expect(sessionStorageMock['auth_redirect_path']).toBe('/dashboard');
      expect(localStorageMock['selected_business_id']).toBeUndefined();
      expect(localStorageMock['auth_redirect_path']).toBeUndefined();
    });

    it('should not overwrite existing sessionStorage data', () => {
      localStorageMock['selected_business_id'] = 'old-value';
      sessionStorageMock['selected_business_id'] = 'new-value';

      migrateToSessionStorage();

      expect(sessionStorageMock['selected_business_id']).toBe('new-value');
      expect(localStorageMock['selected_business_id']).toBeUndefined();
    });

    it('should not affect non-sensitive localStorage preferences', () => {
      localStorageMock['theme'] = 'dark';
      localStorageMock['preferred-language'] = 'en';
      localStorageMock['selected_business_id'] = 'test-123';

      migrateToSessionStorage();

      expect(localStorageMock['theme']).toBe('dark');
      expect(localStorageMock['preferred-language']).toBe('en');
      expect(localStorageMock['selected_business_id']).toBeUndefined();
    });

    it('should handle empty localStorage', () => {
      migrateToSessionStorage();
      expect(Object.keys(sessionStorageMock)).toHaveLength(0);
    });

    it('should handle storage errors gracefully', () => {
      localStorageMock['selected_business_id'] = 'test-123';
      jest.spyOn(sessionStorage, 'setItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      migrateToSessionStorage();
      expect(console.error).toHaveBeenCalledWith('Failed to migrate storage:', expect.any(Error));
    });
  });

  describe('security compliance', () => {
    it('should use sessionStorage for auth-sensitive keys', () => {
      setSecureItem('selected_business_id', 'test');
      expect(sessionStorage.setItem).toHaveBeenCalled();
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });

    it('should use localStorage for non-sensitive preferences', () => {
      setPreference('theme', 'dark');
      expect(localStorage.setItem).toHaveBeenCalled();
      expect(sessionStorage.setItem).not.toHaveBeenCalled();
    });

    it('should clear auth data on clearAuthSession', () => {
      sessionStorageMock['selected_business_id'] = 'test';
      sessionStorageMock['pending_practice_consent'] = 'accepted';

      clearAuthSession();

      expect(sessionStorageMock['selected_business_id']).toBeUndefined();
      expect(sessionStorageMock['pending_practice_consent']).toBeUndefined();
    });
  });
});
