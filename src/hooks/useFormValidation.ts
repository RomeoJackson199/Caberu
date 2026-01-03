import { useState, useCallback, useRef, useEffect } from 'react';

export type ValidationRule<T = any> = {
  validate: (value: T) => boolean | Promise<boolean>;
  message: string;
};

export type FieldValidation = {
  value: any;
  error: string | null;
  isValid: boolean;
  isTouched: boolean;
  isValidating: boolean;
};

export type FormValidation<T extends Record<string, any>> = {
  [K in keyof T]: FieldValidation;
};

export interface UseFormValidationOptions<T extends Record<string, any>> {
  initialValues: T;
  validationRules: Partial<Record<keyof T, ValidationRule<T[keyof T]>[]>>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  debounceMs?: number;
}

/**
 * Enhanced Form Validation Hook
 *
 * Features:
 * - Real-time inline validation
 * - Debounced validation for async rules
 * - Touch tracking (only show errors after user interaction)
 * - Async validation support
 * - Field-level and form-level validation
 *
 * @example
 * const { fields, validateField, validateForm, isFormValid } = useFormValidation({
 *   initialValues: { email: '', password: '' },
 *   validationRules: {
 *     email: [
 *       { validate: (v) => v.includes('@'), message: 'Invalid email' }
 *     ],
 *     password: [
 *       { validate: (v) => v.length >= 8, message: 'Min 8 characters' }
 *     ]
 *   }
 * });
 */
export function useFormValidation<T extends Record<string, any>>({
  initialValues,
  validationRules,
  validateOnChange = true,
  validateOnBlur = true,
  debounceMs = 300
}: UseFormValidationOptions<T>) {
  const [fields, setFields] = useState<FormValidation<T>>(() => {
    const initial: any = {};
    for (const key in initialValues) {
      initial[key] = {
        value: initialValues[key],
        error: null,
        isValid: true,
        isTouched: false,
        isValidating: false
      };
    }
    return initial;
  });

  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const validateFieldSync = useCallback(
    async (fieldName: keyof T, value: any): Promise<string | null> => {
      const rules = validationRules[fieldName];
      if (!rules || rules.length === 0) return null;

      for (const rule of rules) {
        try {
          const isValid = await rule.validate(value);
          if (!isValid) {
            return rule.message;
          }
        } catch (error) {
          return 'Validation error occurred';
        }
      }

      return null;
    },
    [validationRules]
  );

  const validateField = useCallback(
    async (fieldName: keyof T, value: any, shouldDebounce = false) => {
      // Clear existing timer
      if (debounceTimers.current[fieldName as string]) {
        clearTimeout(debounceTimers.current[fieldName as string]);
      }

      const performValidation = async () => {
        setFields(prev => ({
          ...prev,
          [fieldName]: {
            ...prev[fieldName],
            isValidating: true
          }
        }));

        const error = await validateFieldSync(fieldName, value);

        setFields(prev => ({
          ...prev,
          [fieldName]: {
            ...prev[fieldName],
            error,
            isValid: error === null,
            isValidating: false
          }
        }));
      };

      if (shouldDebounce && debounceMs > 0) {
        debounceTimers.current[fieldName as string] = setTimeout(
          performValidation,
          debounceMs
        );
      } else {
        await performValidation();
      }
    },
    [validateFieldSync, debounceMs]
  );

  const setValue = useCallback(
    (fieldName: keyof T, value: any) => {
      setFields(prev => ({
        ...prev,
        [fieldName]: {
          ...prev[fieldName],
          value
        }
      }));

      if (validateOnChange && fields[fieldName].isTouched) {
        validateField(fieldName, value, true);
      }
    },
    [validateOnChange, validateField, fields]
  );

  const setTouched = useCallback((fieldName: keyof T, touched = true) => {
    setFields(prev => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        isTouched: touched
      }
    }));
  }, []);

  const handleBlur = useCallback(
    (fieldName: keyof T) => {
      setTouched(fieldName, true);
      if (validateOnBlur) {
        validateField(fieldName, fields[fieldName].value, false);
      }
    },
    [validateOnBlur, validateField, setTouched, fields]
  );

  const validateForm = useCallback(async (): Promise<boolean> => {
    const validationPromises: Promise<void>[] = [];

    for (const fieldName in fields) {
      validationPromises.push(
        validateField(fieldName as keyof T, fields[fieldName].value, false).then(() => {
          setTouched(fieldName as keyof T, true);
        })
      );
    }

    await Promise.all(validationPromises);

    // Check if all fields are valid
    return Object.values(fields).every((field: any) => field.isValid);
  }, [fields, validateField, setTouched]);

  const resetForm = useCallback(() => {
    const reset: any = {};
    for (const key in initialValues) {
      reset[key] = {
        value: initialValues[key],
        error: null,
        isValid: true,
        isTouched: false,
        isValidating: false
      };
    }
    setFields(reset);
  }, [initialValues]);

  const isFormValid = Object.values(fields).every((field: any) => field.isValid);

  const getFieldProps = useCallback(
    (fieldName: keyof T) => ({
      value: fields[fieldName].value,
      onChange: (e: any) => {
        const value = e.target ? e.target.value : e;
        setValue(fieldName, value);
      },
      onBlur: () => handleBlur(fieldName),
      error: fields[fieldName].isTouched ? fields[fieldName].error : null,
      isValidating: fields[fieldName].isValidating
    }),
    [fields, setValue, handleBlur]
  );

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(timer => clearTimeout(timer));
    };
  }, []);

  return {
    fields,
    setValue,
    setTouched,
    handleBlur,
    validateField,
    validateForm,
    resetForm,
    isFormValid,
    getFieldProps
  };
}
