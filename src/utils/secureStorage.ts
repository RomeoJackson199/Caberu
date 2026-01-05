/**
 * Secure Storage Utility
 * Uses sessionStorage for auth-sensitive data (15-minute session timeout compliance)
 * Uses localStorage only for non-sensitive preferences
 * 
 * SECURITY: Never store auth tokens, session data, or sensitive PII in localStorage
 */

// Keys that MUST use sessionStorage (auth-sensitive)
const SESSION_STORAGE_KEYS = [
    'selected_business_id',
    'pending_practice_consent',
    'pending_patient_terms_consent',
    'auth_redirect_path',
] as const;

// Keys that can use localStorage (non-sensitive preferences)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const LOCAL_STORAGE_KEYS = [
    'preferred-language',
    'analytics_consent',
    'ai-chat-onboarding-seen',
    'dentist-tour-completed',
    'tour_completed_dentist',
    'psidebar:collapsed',
    'pd_section',
    'theme',
] as const;

type SessionStorageKey = typeof SESSION_STORAGE_KEYS[number];
type LocalStorageKey = typeof LOCAL_STORAGE_KEYS[number];

/**
 * Get item from the appropriate storage based on key type
 */
export function getSecureItem(key: SessionStorageKey): string | null {
    try {
        const value = sessionStorage.getItem(key);

        // Check for expiry on consent data
        if (value && key.includes('consent')) {
            try {
                const parsed = JSON.parse(value);
                if (parsed.expiresAt && parsed.expiresAt < Date.now()) {
                    sessionStorage.removeItem(key);
                    return null;
                }
            } catch {
                // Not JSON, return as-is
            }
        }

        return value;
    } catch (e) {
        console.error('Failed to get secure item:', e);
        return null;
    }
}

/**
 * Set item in sessionStorage with optional expiry
 */
export function setSecureItem(
    key: SessionStorageKey,
    value: string,
    expiryMinutes?: number
): void {
    try {
        if (expiryMinutes) {
            const data = {
                value,
                expiresAt: Date.now() + (expiryMinutes * 60 * 1000),
            };
            sessionStorage.setItem(key, JSON.stringify(data));
        } else {
            sessionStorage.setItem(key, value);
        }
    } catch (e) {
        console.error('Failed to set secure item:', e);
    }
}

/**
 * Remove item from sessionStorage
 */
export function removeSecureItem(key: SessionStorageKey): void {
    try {
        sessionStorage.removeItem(key);
    } catch (e) {
        console.error('Failed to remove secure item:', e);
    }
}

/**
 * Get preference from localStorage (non-sensitive data only)
 */
export function getPreference(key: LocalStorageKey): string | null {
    try {
        return localStorage.getItem(key);
    } catch (e) {
        console.error('Failed to get preference:', e);
        return null;
    }
}

/**
 * Set preference in localStorage (non-sensitive data only)
 */
export function setPreference(key: LocalStorageKey, value: string): void {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        console.error('Failed to set preference:', e);
    }
}

/**
 * Clear all auth-sensitive session data
 * Call this on logout
 */
export function clearAuthSession(): void {
    try {
        SESSION_STORAGE_KEYS.forEach(key => {
            sessionStorage.removeItem(key);
        });
    } catch (e) {
        console.error('Failed to clear auth session:', e);
    }
}

/**
 * Migrate any lingering localStorage auth data to sessionStorage
 * Call this on app init to clean up old data
 */
export function migrateToSessionStorage(): void {
    try {
        SESSION_STORAGE_KEYS.forEach(key => {
            const localValue = localStorage.getItem(key);
            if (localValue) {
                // Move to sessionStorage if not already there
                if (!sessionStorage.getItem(key)) {
                    sessionStorage.setItem(key, localValue);
                }
                // Always remove from localStorage
                localStorage.removeItem(key);
            }
        });
    } catch (e) {
        console.error('Failed to migrate storage:', e);
    }
}
