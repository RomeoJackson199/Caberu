import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "./input";
import { Label } from "./label";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface FormFieldProps extends React.ComponentProps<"input"> {
  label?: string;
  error?: string;
  success?: boolean;
  hint?: string;
  validate?: (value: string) => string | undefined;
  onValidation?: (isValid: boolean) => void;
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
    ...props 
  }, ref) => {
    const [touched, setTouched] = React.useState(false);
    const [internalError, setInternalError] = React.useState<string | undefined>();
    const [value, setValue] = React.useState(props.value?.toString() || props.defaultValue?.toString() || "");
    
    const error = externalError || internalError;
    const showError = touched && error;
    const showSuccess = touched && success && !error && value;
    const fieldId = id || React.useId();

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
            className={cn(
              showError && "border-destructive focus-visible:ring-destructive/30",
              showSuccess && "border-green-500 focus-visible:ring-green-500/30",
              className
            )}
            onBlur={handleBlur}
            onChange={handleChange}
            aria-invalid={showError ? "true" : undefined}
            aria-describedby={
              showError ? `${fieldId}-error` : 
              hint ? `${fieldId}-hint` : 
              undefined
            }
            {...props}
          />
          
          {/* Status icon */}
          {(showError || showSuccess) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              {showError && (
                <AlertCircle className="h-4 w-4 text-destructive animate-in fade-in-50 zoom-in-95" />
              )}
              {showSuccess && (
                <CheckCircle2 className="h-4 w-4 text-green-500 animate-in fade-in-50 zoom-in-95" />
              )}
            </div>
          )}
        </div>
        
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
