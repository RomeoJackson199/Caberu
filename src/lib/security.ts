/**
 * Security utilities for input validation and sanitization
 */

// XSS Protection - sanitize HTML content
export const sanitizeHtml = (input: string): string => {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// SQL Injection Protection - basic input validation
export const sanitizeInput = (input: string): string => {
  // Remove potentially dangerous SQL characters and commands
  return input
    .replace(/['";\\]/g, '') // Remove quotes and backslashes
    .replace(/(-{2}|\/\*|\*\/|xp_|sp_)/gi, '') // Remove SQL comment patterns and stored procedures
    .trim();
};

// Email validation with enhanced security
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length <= 254; // RFC 5321 limit
};

// Phone number validation
export const validatePhone = (phone: string): boolean => {
  // Allow international formats
  const phoneRegex = /^\+?[\d\s\-()]{7,20}$/;
  return phoneRegex.test(phone);
};

// Name validation (prevent script injection)
export const validateName = (name: string): boolean => {
  // Only allow letters, spaces, hyphens, and apostrophes
  const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]{1,50}$/;
  return nameRegex.test(name);
};

// Password strength validation
export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  // At least one non-alphanumeric character (treat as special character)
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return { isValid: errors.length === 0, errors };
};

// Comprehensive input sanitization for forms
export const sanitizeFormData = <T extends Record<string, any>>(data: T): T => {
  const sanitized = { ...data } as any;
  
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'string') {
      // Trim whitespace
      sanitized[key] = sanitized[key].trim();
      
      // Basic XSS protection
      sanitized[key] = sanitizeHtml(sanitized[key]);
      
      // Remove null bytes
      sanitized[key] = sanitized[key].replace(/\0/g, '');
      
      // Limit length to prevent buffer overflow attacks
      if (sanitized[key].length > 10000) {
        sanitized[key] = sanitized[key].substring(0, 10000);
      }
    }
  });
  
  return sanitized as T;
};

// Rate limiting helper (client-side basic implementation)
export class ClientRateLimit {
  private attempts: Map<string, number[]> = new Map();
  
  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 15 * 60 * 1000 // 15 minutes
  ) {}
  
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(identifier) || [];
    
    // Clean old attempts
    const validAttempts = attempts.filter(time => now - time < this.windowMs);
    
    if (validAttempts.length >= this.maxAttempts) {
      return false;
    }
    
    validAttempts.push(now);
    this.attempts.set(identifier, validAttempts);
    return true;
  }
  
  getRemainingAttempts(identifier: string): number {
    const now = Date.now();
    const attempts = this.attempts.get(identifier) || [];
    const validAttempts = attempts.filter(time => now - time < this.windowMs);
    return Math.max(0, this.maxAttempts - validAttempts.length);
  }
  
  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

// Environment-based CORS configuration
export const getCorsHeaders = (environment?: string) => {
  if (environment === 'production') {
    const productionDomain = import.meta.env.VITE_PRODUCTION_DOMAIN || import.meta.env.VITE_APP_URL;
    if (!productionDomain) {
      console.warn('VITE_PRODUCTION_DOMAIN or VITE_APP_URL not set in environment variables. Using wildcard for CORS.');
    }
    return {
      'Access-Control-Allow-Origin': productionDomain || '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Max-Age': '86400', // 24 hours
    };
  }
  
  // Development/staging - more permissive
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };
};

// Enhanced error handling for edge functions
export const createSecureErrorResponse = (
  error: Error | string,
  statusCode: number = 500,
  environment?: string
) => {
  const isDevelopment = environment === 'development';
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  // In production, don't expose internal error details
  const publicMessage = isDevelopment 
    ? errorMessage 
    : statusCode === 401 
      ? 'Unauthorized' 
      : statusCode === 403 
        ? 'Forbidden' 
        : 'An error occurred';
  
  // Log full error in development only
  if (isDevelopment) {
    console.error('Secure Error:', error);
  }
  
  return new Response(
    JSON.stringify({ 
      error: publicMessage,
      success: false,
      ...(isDevelopment && { details: errorMessage })
    }),
    {
      status: statusCode,
      headers: {
        ...getCorsHeaders(environment),
        'Content-Type': 'application/json'
      }
    }
  );
};

// Input validation for common dental app fields
export const validateDentalFormData = (data: any) => {
  const errors: string[] = [];
  
  if (data.first_name && !validateName(data.first_name)) {
    errors.push('First name contains invalid characters');
  }
  
  if (data.last_name && !validateName(data.last_name)) {
    errors.push('Last name contains invalid characters');
  }
  
  if (data.email && !validateEmail(data.email)) {
    errors.push('Invalid email format');
  }
  
  if (data.phone && data.phone.length > 0 && !validatePhone(data.phone)) {
    errors.push('Invalid phone number format');
  }
  
  if (data.password) {
    const passwordValidation = validatePassword(data.password);
    if (!passwordValidation.isValid) {
      errors.push(...passwordValidation.errors);
    }
  }
  
  // Validate medical/dental specific fields
  if (data.symptoms && data.symptoms.length > 1000) {
    errors.push('Symptoms description is too long');
  }
  
  if (data.medical_history && data.medical_history.length > 5000) {
    errors.push('Medical history is too long');
  }
  
  if (data.reason && data.reason.length > 500) {
    errors.push('Appointment reason is too long');
  }
  
  return { isValid: errors.length === 0, errors };
};