import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "./input";
import { Label } from "./label";
import { CharacterCounter } from "./character-counter";
import { AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";

interface FormFieldProps extends React.ComponentProps<"input"> {
  label?: string;
  error?: string;
  success?: boolean;
  hint?: string;
  validate?: (value: string) => string | undefined;
  onValidation?: (isValid: boolean) => void;
  showCharacterCount?: boolean; // Show character counter when maxLength is set
  showPasswordToggle?: boolean; // Show password visibility toggle for password fields
}

/**
 * FormField - Input with inline validation feedback
 * Shows error/success states below the field on blur
 */
const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  ({
    className,
    label,
    error: externalError,
    success,
    hint,
    validate,
    onValidation,
    onBlur,
    onChange,
    id,
    showCharacterCount = true,
    maxLength,
    showPasswordToggle = true,
    type,
    ...props
  }, ref) => {
    const [touched, setTouched] = React.useState(false);
    const [internalError, setInternalError] = React.useState<string | undefined>();
    const [value, setValue] = React.useState(props.value?.toString() || props.defaultValue?.toString() || "");
    const [showPassword, setShowPassword] = React.useState(false);

    const error = externalError || internalError;
    const showError = touched && error;
    const showSuccess = touched && success && !error && value;
    const fieldId = id || React.useId();
    const isPasswordField = type === "password";

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setTouched(true);
      
      if (validate) {
        const validationError = validate(e.target.value);
        setInternalError(validationError);
        onValidation?.(!validationError);
      }
      
      onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
      
      // Clear error while typing if there was one
      if (internalError && validate) {
        const validationError = validate(e.target.value);
        if (!validationError) {
          setInternalError(undefined);
          onValidation?.(true);
        }
      }
      
      onChange?.(e);
    };

    return (
      <div className="space-y-2">
        {label && (
          <Label 
            htmlFor={fieldId}
            className={cn(
              "text-sm font-medium transition-colors",
              showError && "text-destructive"
            )}
          >
            {label}
            {props.required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}
        
        <div className="relative">
          <Input
            ref={ref}
            id={fieldId}
            type={isPasswordField && showPassword ? "text" : type}
            className={cn(
              showError && "border-destructive focus-visible:ring-destructive/30",
              showSuccess && "border-green-500 focus-visible:ring-green-500/30",
              (isPasswordField && showPasswordToggle) && "pr-10",
              className
            )}
            onBlur={handleBlur}
            onChange={handleChange}
            maxLength={maxLength}
            aria-invalid={showError ? "true" : undefined}
            aria-describedby={
              showError ? `${fieldId}-error` :
              hint ? `${fieldId}-hint` :
              undefined
            }
            {...props}
          />

          {/* Right side icons container */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {/* Status icons */}
            {showError && (
              <AlertCircle className="h-4 w-4 text-destructive animate-in fade-in-50 zoom-in-95" aria-hidden="true" />
            )}
            {showSuccess && (
              <CheckCircle2 className="h-4 w-4 text-green-500 animate-in fade-in-50 zoom-in-95" aria-hidden="true" />
            )}

            {/* Password toggle button */}
            {isPasswordField && showPasswordToggle && !showError && !showSuccess && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={cn(
                  "text-muted-foreground hover:text-foreground transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm p-0.5",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                tabIndex={0}
                disabled={props.disabled}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        </div>
        
        {/* Bottom row: Error/Hint and Character Counter */}
        <div className="flex items-start justify-between gap-2 min-h-[20px]">
          <div className="flex-1">
            {/* Error message */}
            {showError && (
              <p
                id={`${fieldId}-error`}
                className="text-sm text-destructive flex items-center gap-1.5 animate-in fade-in-50 slide-in-from-top-1"
                role="alert"
              >
                {error}
              </p>
            )}

            {/* Hint text (only show if no error) */}
            {hint && !showError && (
              <p
                id={`${fieldId}-hint`}
                className="text-xs text-muted-foreground"
              >
                {hint}
              </p>
            )}
          </div>

          {/* Character Counter */}
          {showCharacterCount && maxLength && (
            <CharacterCounter
              current={value.length}
              max={maxLength}
              className="flex-shrink-0"
            />
          )}
        </div>
      </div>
    );
  }
);

FormField.displayName = "FormField";

// Common validation functions
export const validators = {
  required: (message = "This field is required") => 
    (value: string) => value.trim() ? undefined : message,
  
  email: (message = "Please enter a valid email") =>
    (value: string) => {
      if (!value.trim()) return undefined;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value) ? undefined : message;
    },
  
  minLength: (min: number, message?: string) =>
    (value: string) => {
      if (!value.trim()) return undefined;
      return value.length >= min 
        ? undefined 
        : message || `Must be at least ${min} characters`;
    },
  
  maxLength: (max: number, message?: string) =>
    (value: string) => {
      return value.length <= max 
        ? undefined 
        : message || `Must be less than ${max} characters`;
    },
  
  pattern: (regex: RegExp, message = "Invalid format") =>
    (value: string) => {
      if (!value.trim()) return undefined;
      return regex.test(value) ? undefined : message;
    },
  
  phone: (message = "Please enter a valid phone number") =>
    (value: string) => {
      if (!value.trim()) return undefined;
      const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/;
      return phoneRegex.test(value) ? undefined : message;
    },

  password: (message = "Password must be at least 8 characters with uppercase, lowercase, and number") =>
    (value: string) => {
      if (!value.trim()) return undefined;
      const hasMinLength = value.length >= 8;
      const hasUppercase = /[A-Z]/.test(value);
      const hasLowercase = /[a-z]/.test(value);
      const hasNumber = /[0-9]/.test(value);

      if (!hasMinLength) return "Password must be at least 8 characters";
      if (!hasUppercase) return "Password must contain an uppercase letter";
      if (!hasLowercase) return "Password must contain a lowercase letter";
      if (!hasNumber) return "Password must contain a number";

      return undefined;
    },

  // Combine multiple validators
  compose: (...validators: ((value: string) => string | undefined)[]) =>
    (value: string) => {
      for (const validate of validators) {
        const error = validate(value);
        if (error) return error;
      }
      return undefined;
    },
};

export { FormField };
