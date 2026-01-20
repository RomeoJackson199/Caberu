/**
 * Sanitized Form Hook
 * Automatically sanitizes PHI and user-generated content
 */

import { useState, useCallback, useMemo } from 'react';
import { sanitizeText, sanitizeRichText, sanitizeAttribute } from '@/utils/sanitize';

type SanitizeType = 'text' | 'richText' | 'attribute' | 'none';

interface FieldConfig {
  type?: SanitizeType;
  maxLength?: number;
  required?: boolean;
}

type FormConfig<T> = {
  [K in keyof T]?: FieldConfig;
};

interface ValidationError {
  field: string;
  message: string;
}

interface UseSanitizedFormResult<T> {
  values: T;
  errors: ValidationError[];
  setField: <K extends keyof T>(field: K, value: T[K]) => void;
  setFields: (updates: Partial<T>) => void;
  reset: (newValues?: T) => void;
  validate: () => boolean;
  getSanitizedValues: () => T;
  isDirty: boolean;
  isValid: boolean;
}

const sanitizers: Record<SanitizeType, (value: string) => string> = {
  text: sanitizeText,
  richText: sanitizeRichText,
  attribute: sanitizeAttribute,
  none: (v) => v,
};

/**
 * Hook for managing form state with automatic sanitization
 * Specifically designed for PHI (Protected Health Information) forms
 * 
 * @param initialValues - Initial form values
 * @param config - Field configuration for sanitization and validation
 */
export function useSanitizedForm<T extends Record<string, any>>(
  initialValues: T,
  config: FormConfig<T> = {}
): UseSanitizedFormResult<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [touched, setTouched] = useState<Set<keyof T>>(new Set());

  // Sanitize a single value based on field config
  const sanitizeValue = useCallback(
    <K extends keyof T>(field: K, value: T[K]): T[K] => {
      if (typeof value !== 'string') return value;
      
      const fieldConfig = config[field];
      const sanitizeType = fieldConfig?.type || 'text';
      const maxLength = fieldConfig?.maxLength;
      
      let sanitized = sanitizers[sanitizeType](value);
      
      // Apply max length if configured
      if (maxLength && sanitized.length > maxLength) {
        sanitized = sanitized.slice(0, maxLength);
      }
      
      return sanitized as T[K];
    },
    [config]
  );

  // Set a single field with sanitization
  const setField = useCallback(
    <K extends keyof T>(field: K, value: T[K]) => {
      const sanitized = sanitizeValue(field, value);
      setValues((prev) => ({ ...prev, [field]: sanitized }));
      setTouched((prev) => new Set(prev).add(field));
    },
    [sanitizeValue]
  );

  // Set multiple fields at once
  const setFields = useCallback(
    (updates: Partial<T>) => {
      const sanitizedUpdates: Partial<T> = {};
      const newTouched = new Set(touched);
      
      for (const [field, value] of Object.entries(updates)) {
        const key = field as keyof T;
        sanitizedUpdates[key] = sanitizeValue(key, value as T[keyof T]);
        newTouched.add(key);
      }
      
      setValues((prev) => ({ ...prev, ...sanitizedUpdates }));
      setTouched(newTouched);
    },
    [sanitizeValue, touched]
  );

  // Reset form to initial or new values
  const reset = useCallback(
    (newValues?: T) => {
      setValues(newValues || initialValues);
      setTouched(new Set());
    },
    [initialValues]
  );

  // Validate all fields
  const validate = useCallback((): boolean => {
    const errors: ValidationError[] = [];
    
    for (const [field, fieldConfig] of Object.entries(config)) {
      const value = values[field as keyof T];
      
      if (fieldConfig?.required && (!value || (typeof value === 'string' && !value.trim()))) {
        errors.push({ field, message: `${field} is required` });
      }
      
      if (fieldConfig?.maxLength && typeof value === 'string' && value.length > fieldConfig.maxLength) {
        errors.push({ field, message: `${field} exceeds maximum length of ${fieldConfig.maxLength}` });
      }
    }
    
    return errors.length === 0;
  }, [values, config]);

  // Get current validation errors
  const errors = useMemo((): ValidationError[] => {
    const result: ValidationError[] = [];
    
    for (const [field, fieldConfig] of Object.entries(config)) {
      const value = values[field as keyof T];
      
      // Only show errors for touched fields
      if (!touched.has(field as keyof T)) continue;
      
      if (fieldConfig?.required && (!value || (typeof value === 'string' && !value.trim()))) {
        result.push({ field, message: `${field} is required` });
      }
      
      if (fieldConfig?.maxLength && typeof value === 'string' && value.length > fieldConfig.maxLength) {
        result.push({ field, message: `${field} exceeds maximum length of ${fieldConfig.maxLength}` });
      }
    }
    
    return result;
  }, [values, config, touched]);

  // Get fully sanitized values for submission
  const getSanitizedValues = useCallback((): T => {
    const result = { ...values };
    
    for (const field of Object.keys(values)) {
      const key = field as keyof T;
      result[key] = sanitizeValue(key, values[key]);
    }
    
    return result;
  }, [values, sanitizeValue]);

  // Check if form has been modified
  const isDirty = useMemo(() => {
    return touched.size > 0 && JSON.stringify(values) !== JSON.stringify(initialValues);
  }, [values, initialValues, touched]);

  // Check if form is valid
  const isValid = useMemo(() => {
    for (const [field, fieldConfig] of Object.entries(config)) {
      const value = values[field as keyof T];
      
      if (fieldConfig?.required && (!value || (typeof value === 'string' && !value.trim()))) {
        return false;
      }
    }
    return true;
  }, [values, config]);

  return {
    values,
    errors,
    setField,
    setFields,
    reset,
    validate,
    getSanitizedValues,
    isDirty,
    isValid,
  };
}

/**
 * Pre-configured form configs for common PHI forms
 */
export const PHI_FORM_CONFIGS = {
  patientProfile: {
    first_name: { type: 'text' as const, maxLength: 100, required: true },
    last_name: { type: 'text' as const, maxLength: 100, required: true },
    email: { type: 'text' as const, maxLength: 255, required: true },
    phone: { type: 'text' as const, maxLength: 20 },
    address: { type: 'text' as const, maxLength: 500 },
    medical_history: { type: 'text' as const, maxLength: 5000 },
    emergency_contact: { type: 'text' as const, maxLength: 200 },
  },
  clinicalNote: {
    title: { type: 'text' as const, maxLength: 200, required: true },
    content: { type: 'text' as const, maxLength: 10000, required: true },
    note_type: { type: 'none' as const },
  },
  treatmentPlan: {
    title: { type: 'text' as const, maxLength: 200, required: true },
    description: { type: 'text' as const, maxLength: 5000 },
    diagnosis: { type: 'text' as const, maxLength: 2000 },
    notes: { type: 'text' as const, maxLength: 5000 },
  },
};
