/**
 * Password Validation Utility
 * Enforces strong password requirements and breach checking
 */

export interface PasswordStrength {
    score: number; // 0-5
    feedback: string[];
    isValid: boolean;
}

/**
 * Validate password strength
 * Requires: 12+ chars, uppercase, lowercase, number, special char
 */
export const validatePassword = (password: string): PasswordStrength => {
    const feedback: string[] = [];
    let score = 0;

    // Minimum length (12 characters)
    if (password.length < 12) {
        feedback.push('Password must be at least 12 characters long');
    } else {
        score += 1;
        if (password.length >= 16) score += 1; // Bonus for longer
    }

    // Uppercase letter
    if (!/[A-Z]/.test(password)) {
        feedback.push('Include at least one uppercase letter');
    } else {
        score += 1;
    }

    // Lowercase letter
    if (!/[a-z]/.test(password)) {
        feedback.push('Include at least one lowercase letter');
    } else {
        score += 1;
    }

    // Number
    if (!/[0-9]/.test(password)) {
        feedback.push('Include at least one number');
    } else {
        score += 1;
    }

    // Special character
    if (!/[!@#$%^&*(),.?":{}|<>_\-+=[\]\\\/`~]/.test(password)) {
        feedback.push('Include at least one special character (!@#$%^&*...)');
    } else {
        score += 1;
    }

    // Check against common passwords
    const commonPatterns = [
        'password', 'qwerty', '123456', 'admin', 'letmein',
        'welcome', 'monkey', 'dragon', 'master', 'login'
    ];

    const lowerPassword = password.toLowerCase();
    if (commonPatterns.some(pattern => lowerPassword.includes(pattern))) {
        feedback.push('Password contains a common pattern. Choose something more unique.');
        score = Math.max(0, score - 2);
    }

    // Check for sequential characters
    if (/(.)\1{2,}/.test(password)) {
        feedback.push('Avoid repeating the same character more than twice');
        score = Math.max(0, score - 1);
    }

    return {
        score,
        feedback,
        isValid: score >= 5 && feedback.length === 0
    };
};

/**
 * Check password against Have I Been Pwned API
 * Uses k-anonymity - only sends first 5 chars of SHA-1 hash
 */
export const checkPasswordBreach = async (password: string): Promise<boolean> => {
    try {
        // Convert password to SHA-1 hash
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-1', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

        // k-anonymity: only send first 5 chars (prefix)
        const prefix = hashHex.substring(0, 5);
        const suffix = hashHex.substring(5);

        // Query HIBP API
        const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
            headers: {
                'Add-Padding': 'true' // Adds padding to prevent timing attacks
            }
        });

        if (!response.ok) {
            console.warn('HIBP API unavailable');
            return false; // Don't block user if API fails
        }

        const hashes = await response.text();

        // Check if our suffix is in the response
        return hashes.split('\n').some(line => {
            const [hashSuffix] = line.split(':');
            return hashSuffix.trim() === suffix;
        });
    } catch (error) {
        console.error('Password breach check failed:', error);
        return false; // Don't block user if check fails
    }
};

/**
 * Get strength label for password score
 */
export const getStrengthLabel = (score: number): { label: string; color: string } => {
    if (score <= 1) return { label: 'Very Weak', color: 'text-red-600' };
    if (score <= 2) return { label: 'Weak', color: 'text-orange-500' };
    if (score <= 3) return { label: 'Fair', color: 'text-yellow-500' };
    if (score <= 4) return { label: 'Good', color: 'text-blue-500' };
    return { label: 'Strong', color: 'text-green-600' };
};

export default {
    validatePassword,
    checkPasswordBreach,
    getStrengthLabel,
};
