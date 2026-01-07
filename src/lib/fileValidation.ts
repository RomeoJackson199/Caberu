/**
 * Secure file validation utilities for uploads
 * Prevents path traversal attacks and ensures file safety
 */

/**
 * Validates a file name for security issues
 * Prevents path traversal, null bytes, and other attacks
 */
export function validateFileName(fileName: string): { valid: boolean; error?: string } {
  // Check for path traversal attempts
  if (fileName.includes('..')) {
    return { valid: false, error: 'Invalid file name: path traversal detected' };
  }

  // Check for directory separators
  if (fileName.includes('/') || fileName.includes('\\')) {
    return { valid: false, error: 'Invalid file name: directory separators not allowed' };
  }

  // Check for null bytes (can be used to bypass extension checks)
  if (fileName.includes('\0')) {
    return { valid: false, error: 'Invalid file name: null bytes detected' };
  }

  // Check length (prevent DoS via extremely long names)
  if (fileName.length > 255) {
    return { valid: false, error: 'File name too long (max 255 characters)' };
  }

  // Check for empty name
  if (fileName.trim().length === 0) {
    return { valid: false, error: 'File name cannot be empty' };
  }

  // Check for hidden files (starts with .)
  if (fileName.startsWith('.')) {
    return { valid: false, error: 'Hidden files are not allowed' };
  }

  return { valid: true };
}

/**
 * Sanitizes a file name by removing/replacing dangerous characters
 * Use when you need a safe version of the filename
 */
export function sanitizeFileName(fileName: string): string {
  // Remove path separators and parent directory references
  let sanitized = fileName
    .replace(/\.\./g, '')
    .replace(/[/\\]/g, '-')
    .replace(/\0/g, '');

  // Remove leading dots (hidden files)
  sanitized = sanitized.replace(/^\.+/, '');

  // Truncate to max length
  if (sanitized.length > 255) {
    const ext = sanitized.split('.').pop() || '';
    const baseName = sanitized.slice(0, 255 - ext.length - 1);
    sanitized = `${baseName}.${ext}`;
  }

  // If completely empty after sanitization, use a default
  if (sanitized.trim().length === 0) {
    sanitized = 'unnamed-file';
  }

  return sanitized;
}

/**
 * Generates a secure file name using UUID to prevent enumeration
 */
export function generateSecureFileName(originalName: string): string {
  const ext = originalName.split('.').pop()?.toLowerCase() || 'bin';
  const uuid = crypto.randomUUID();
  return `${uuid}.${ext}`;
}

/**
 * Validates file MIME type against allowed types
 */
export function validateMimeType(
  mimeType: string, 
  allowedTypes: string[]
): { valid: boolean; error?: string } {
  if (!allowedTypes.includes(mimeType)) {
    return { 
      valid: false, 
      error: `File type '${mimeType}' is not allowed. Allowed types: ${allowedTypes.join(', ')}` 
    };
  }
  return { valid: true };
}

/**
 * Validates file size against maximum allowed size
 */
export function validateFileSize(
  sizeBytes: number, 
  maxSizeBytes: number
): { valid: boolean; error?: string } {
  if (sizeBytes > maxSizeBytes) {
    const maxSizeMB = (maxSizeBytes / (1024 * 1024)).toFixed(1);
    const actualSizeMB = (sizeBytes / (1024 * 1024)).toFixed(1);
    return { 
      valid: false, 
      error: `File too large (${actualSizeMB}MB). Maximum size is ${maxSizeMB}MB` 
    };
  }
  return { valid: true };
}

/**
 * Complete file validation for uploads
 */
export function validateUploadFile(
  file: File,
  options: {
    allowedMimeTypes?: string[];
    maxSizeBytes?: number;
  } = {}
): { valid: boolean; error?: string } {
  const { 
    allowedMimeTypes, 
    maxSizeBytes = 10 * 1024 * 1024 // 10MB default
  } = options;

  // Validate file name
  const nameValidation = validateFileName(file.name);
  if (!nameValidation.valid) {
    return nameValidation;
  }

  // Validate MIME type if restrictions provided
  if (allowedMimeTypes && allowedMimeTypes.length > 0) {
    const mimeValidation = validateMimeType(file.type, allowedMimeTypes);
    if (!mimeValidation.valid) {
      return mimeValidation;
    }
  }

  // Validate file size
  const sizeValidation = validateFileSize(file.size, maxSizeBytes);
  if (!sizeValidation.valid) {
    return sizeValidation;
  }

  return { valid: true };
}

// Common MIME type presets
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const ALLOWED_MEDICAL_IMAGING_TYPES = [
  'image/jpeg',
  'image/png',
  'image/dicom',
  'application/dicom',
];
