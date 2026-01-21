import { renderHook, act, waitFor } from '@testing-library/react';
import { useFormValidation } from '@/hooks/useFormValidation';

describe('useFormValidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('initializes with default values', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          initialValues: { email: '', password: '' },
          validationRules: {},
        })
      );

      expect(result.current.fields.email.value).toBe('');
      expect(result.current.fields.password.value).toBe('');
      expect(result.current.fields.email.isValid).toBe(true);
      expect(result.current.fields.email.isTouched).toBe(false);
      expect(result.current.isFormValid).toBe(true);
    });

    it('initializes with provided values', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          initialValues: { email: 'test@example.com', password: 'password123' },
          validationRules: {},
        })
      );

      expect(result.current.fields.email.value).toBe('test@example.com');
      expect(result.current.fields.password.value).toBe('password123');
    });
  });

  describe('Field Value Management', () => {
    it('updates field value', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          initialValues: { email: '' },
          validationRules: {},
        })
      );

      act(() => {
        result.current.setValue('email', 'test@example.com');
      });

      expect(result.current.fields.email.value).toBe('test@example.com');
    });

    it('marks field as touched', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          initialValues: { email: '' },
          validationRules: {},
        })
      );

      act(() => {
        result.current.setTouched('email', true);
      });

      expect(result.current.fields.email.isTouched).toBe(true);
    });

    it('handles blur event', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          initialValues: { email: '' },
          validationRules: {},
        })
      );

      act(() => {
        result.current.handleBlur('email');
      });

      expect(result.current.fields.email.isTouched).toBe(true);
    });
  });

  describe('Validation Rules', () => {
    it('validates field with single rule', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          initialValues: { email: '' },
          validationRules: {
            email: [
              {
                validate: (value) => (value as string).includes('@'),
                message: 'Invalid email',
              },
            ],
          },
        })
      );

      act(() => {
        result.current.setTouched('email', true);
      });

      await act(async () => {
        await result.current.validateField('email', 'invalid', false);
      });

      expect(result.current.fields.email.error).toBe('Invalid email');
      expect(result.current.fields.email.isValid).toBe(false);
    });

    it('validates field with multiple rules', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          initialValues: { password: '' },
          validationRules: {
            password: [
              {
                validate: (value) => (value as string).length >= 8,
                message: 'Min 8 characters',
              },
              {
                validate: (value) => /[A-Z]/.test(value as string),
                message: 'Must contain uppercase',
              },
            ],
          },
        })
      );

      await act(async () => {
        await result.current.validateField('password', 'short', false);
      });

      expect(result.current.fields.password.error).toBe('Min 8 characters');
    });

    it('clears error when validation passes', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          initialValues: { email: '' },
          validationRules: {
            email: [
              {
                validate: (value) => (value as string).includes('@'),
                message: 'Invalid email',
              },
            ],
          },
        })
      );

      await act(async () => {
        await result.current.validateField('email', 'valid@email.com', false);
      });

      expect(result.current.fields.email.error).toBe(null);
      expect(result.current.fields.email.isValid).toBe(true);
    });

    it('handles async validation rules', async () => {
      const asyncValidate = jest.fn().mockResolvedValue(false);

      const { result } = renderHook(() =>
        useFormValidation({
          initialValues: { username: '' },
          validationRules: {
            username: [
              {
                validate: asyncValidate,
                message: 'Username taken',
              },
            ],
          },
        })
      );

      await act(async () => {
        await result.current.validateField('username', 'testuser', false);
      });

      expect(asyncValidate).toHaveBeenCalledWith('testuser');
      expect(result.current.fields.username.error).toBe('Username taken');
    });

    it('handles validation errors gracefully', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          initialValues: { field: '' },
          validationRules: {
            field: [
              {
                validate: () => {
                  throw new Error('Validation failed');
                },
                message: 'Custom error',
              },
            ],
          },
        })
      );

      await act(async () => {
        await result.current.validateField('field', 'value', false);
      });

      expect(result.current.fields.field.error).toBe('Validation error occurred');
    });
  });

  describe('Debounced Validation', () => {
    it('debounces validation when requested', async () => {
      const validateFn = jest.fn().mockReturnValue(true);

      const { result } = renderHook(() =>
        useFormValidation({
          initialValues: { email: '' },
          validationRules: {
            email: [{ validate: validateFn, message: 'Error' }],
          },
          debounceMs: 300,
        })
      );

      act(() => {
        result.current.setTouched('email', true);
      });

      await act(async () => {
        result.current.validateField('email', 'test', true);
      });

      // Validation shouldn't be called immediately
      expect(validateFn).not.toHaveBeenCalled();

      // Fast-forward time
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(validateFn).toHaveBeenCalled();
      });
    });

    it('cancels previous debounced validation', async () => {
      const validateFn = jest.fn().mockReturnValue(true);

      const { result } = renderHook(() =>
        useFormValidation({
          initialValues: { email: '' },
          validationRules: {
            email: [{ validate: validateFn, message: 'Error' }],
          },
          debounceMs: 300,
        })
      );

      await act(async () => {
        result.current.validateField('email', 'test1', true);
        jest.advanceTimersByTime(100);
        result.current.validateField('email', 'test2', true);
        jest.advanceTimersByTime(300);
      });

      // Should only be called once for the latest value
      await waitFor(() => {
        expect(validateFn).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Validate on Change', () => {
    it('validates on change when enabled and field is touched', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          initialValues: { email: '' },
          validationRules: {
            email: [
              {
                validate: (value) => (value as string).includes('@'),
                message: 'Invalid email',
              },
            ],
          },
          validateOnChange: true,
        })
      );

      act(() => {
        result.current.setTouched('email', true);
      });

      act(() => {
        result.current.setValue('email', 'invalid');
      });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.fields.email.error).toBe('Invalid email');
      });
    });

    it('does not validate on change when field is not touched', () => {
      const validateFn = jest.fn().mockReturnValue(true);

      const { result } = renderHook(() =>
        useFormValidation({
          initialValues: { email: '' },
          validationRules: {
            email: [{ validate: validateFn, message: 'Error' }],
          },
          validateOnChange: true,
        })
      );

      act(() => {
        result.current.setValue('email', 'test');
      });

      // Should not validate since field is not touched
      expect(validateFn).not.toHaveBeenCalled();
    });

    it('does not validate on change when disabled', () => {
      const validateFn = jest.fn().mockReturnValue(true);

      const { result } = renderHook(() =>
        useFormValidation({
          initialValues: { email: '' },
          validationRules: {
            email: [{ validate: validateFn, message: 'Error' }],
          },
          validateOnChange: false,
        })
      );

      act(() => {
        result.current.setTouched('email', true);
        result.current.setValue('email', 'test');
      });

      expect(validateFn).not.toHaveBeenCalled();
    });
  });

  describe('Validate on Blur', () => {
    it('validates on blur when enabled', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          initialValues: { email: 'invalid' },
          validationRules: {
            email: [
              {
                validate: (value) => (value as string).includes('@'),
                message: 'Invalid email',
              },
            ],
          },
          validateOnBlur: true,
        })
      );

      await act(async () => {
        result.current.handleBlur('email');
      });

      await waitFor(() => {
        expect(result.current.fields.email.error).toBe('Invalid email');
      });
    });

    it('does not validate on blur when disabled', async () => {
      const validateFn = jest.fn().mockReturnValue(true);

      const { result } = renderHook(() =>
        useFormValidation({
          initialValues: { email: 'test' },
          validationRules: {
            email: [{ validate: validateFn, message: 'Error' }],
          },
          validateOnBlur: false,
        })
      );

      act(() => {
        result.current.handleBlur('email');
      });

      expect(validateFn).not.toHaveBeenCalled();
    });
  });

  describe('Form Validation', () => {
    it('validates all fields', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          initialValues: { email: 'invalid', password: 'short' },
          validationRules: {
            email: [
              {
                validate: (value) => (value as string).includes('@'),
                message: 'Invalid email',
              },
            ],
            password: [
              {
                validate: (value) => (value as string).length >= 8,
                message: 'Too short',
              },
            ],
          },
        })
      );

      let isValid = false;
      await act(async () => {
        isValid = await result.current.validateForm();
      });

      expect(isValid).toBe(false);
      expect(result.current.fields.email.error).toBe('Invalid email');
      expect(result.current.fields.password.error).toBe('Too short');
      expect(result.current.fields.email.isTouched).toBe(true);
      expect(result.current.fields.password.isTouched).toBe(true);
    });

    it('returns true when all fields are valid', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          initialValues: { email: 'test@example.com', password: 'password123' },
          validationRules: {
            email: [
              {
                validate: (value) => (value as string).includes('@'),
                message: 'Invalid email',
              },
            ],
            password: [
              {
                validate: (value) => (value as string).length >= 8,
                message: 'Too short',
              },
            ],
          },
        })
      );

      let isValid = false;
      await act(async () => {
        isValid = await result.current.validateForm();
      });

      expect(isValid).toBe(true);
      expect(result.current.isFormValid).toBe(true);
    });
  });

  describe('Reset Form', () => {
    it('resets form to initial values', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          initialValues: { email: 'initial@example.com' },
          validationRules: {},
        })
      );

      act(() => {
        result.current.setValue('email', 'changed@example.com');
        result.current.setTouched('email', true);
      });

      act(() => {
        result.current.resetForm();
      });

      expect(result.current.fields.email.value).toBe('initial@example.com');
      expect(result.current.fields.email.isTouched).toBe(false);
      expect(result.current.fields.email.error).toBe(null);
      expect(result.current.fields.email.isValid).toBe(true);
    });
  });

  describe('getFieldProps', () => {
    it('returns correct field props', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          initialValues: { email: 'test@example.com' },
          validationRules: {},
        })
      );

      const props = result.current.getFieldProps('email');

      expect(props.value).toBe('test@example.com');
      expect(typeof props.onChange).toBe('function');
      expect(typeof props.onBlur).toBe('function');
      expect(props.error).toBe(null);
      expect(props.isValidating).toBe(false);
    });

    it('handles onChange with event object', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          initialValues: { email: '' },
          validationRules: {},
        })
      );

      const props = result.current.getFieldProps('email');

      act(() => {
        props.onChange({ target: { value: 'new@example.com' } } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(result.current.fields.email.value).toBe('new@example.com');
    });

    it('handles onChange with direct value', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          initialValues: { email: '' },
          validationRules: {},
        })
      );

      const props = result.current.getFieldProps('email');

      act(() => {
        props.onChange('direct@example.com');
      });

      expect(result.current.fields.email.value).toBe('direct@example.com');
    });

    it('only shows error when field is touched', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          initialValues: { email: '' },
          validationRules: {
            email: [
              {
                validate: (value) => (value as string).includes('@'),
                message: 'Invalid email',
              },
            ],
          },
        })
      );

      act(() => {
        result.current.fields.email.error = 'Invalid email';
        result.current.fields.email.isValid = false;
      });

      const propsUntouched = result.current.getFieldProps('email');
      expect(propsUntouched.error).toBe(null);

      act(() => {
        result.current.setTouched('email', true);
      });

      const propsTouched = result.current.getFieldProps('email');
      expect(propsTouched.error).toBe('Invalid email');
    });
  });

  describe('Cleanup', () => {
    it('cleans up debounce timers on unmount', () => {
      const { result, unmount } = renderHook(() =>
        useFormValidation({
          initialValues: { email: '' },
          validationRules: {
            email: [
              {
                validate: () => true,
                message: 'Error',
              },
            ],
          },
          debounceMs: 300,
        })
      );

      act(() => {
        result.current.validateField('email', 'test', true);
      });

      unmount();

      // Should not throw error
      act(() => {
        jest.advanceTimersByTime(300);
      });
    });
  });
});
