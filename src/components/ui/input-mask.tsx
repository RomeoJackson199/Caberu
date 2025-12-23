import { forwardRef, useState, useCallback, ChangeEvent } from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

type MaskType = "phone" | "currency" | "date" | "time" | "creditCard" | "custom";

interface InputMaskProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  mask: MaskType;
  customMask?: string;
  prefix?: string;
  suffix?: string;
  onChange?: (value: string, rawValue: string) => void;
}

const masks: Record<Exclude<MaskType, "custom">, (value: string) => string> = {
  phone: (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  },
  
  currency: (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";
    const number = parseInt(digits, 10) / 100;
    return number.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  },
  
  date: (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  },
  
  time: (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  },
  
  creditCard: (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    const groups = digits.match(/.{1,4}/g) || [];
    return groups.join(" ");
  },
};

function applyCustomMask(value: string, mask: string): string {
  let result = "";
  let valueIndex = 0;
  
  for (let i = 0; i < mask.length && valueIndex < value.length; i++) {
    if (mask[i] === "#") {
      if (/\d/.test(value[valueIndex])) {
        result += value[valueIndex];
        valueIndex++;
      } else {
        valueIndex++;
        i--;
      }
    } else if (mask[i] === "A") {
      if (/[a-zA-Z]/.test(value[valueIndex])) {
        result += value[valueIndex];
        valueIndex++;
      } else {
        valueIndex++;
        i--;
      }
    } else {
      result += mask[i];
    }
  }
  
  return result;
}

export const InputMask = forwardRef<HTMLInputElement, InputMaskProps>(
  ({ mask, customMask, prefix = "", suffix = "", onChange, className, value, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState(() => {
      if (value) {
        const maskFn = mask === "custom" && customMask 
          ? (v: string) => applyCustomMask(v, customMask)
          : masks[mask as Exclude<MaskType, "custom">];
        return maskFn(String(value));
      }
      return "";
    });

    const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
      let inputValue = e.target.value;
      
      // Remove prefix/suffix for processing
      if (prefix && inputValue.startsWith(prefix)) {
        inputValue = inputValue.slice(prefix.length);
      }
      if (suffix && inputValue.endsWith(suffix)) {
        inputValue = inputValue.slice(0, -suffix.length);
      }
      
      const maskFn = mask === "custom" && customMask 
        ? (v: string) => applyCustomMask(v, customMask)
        : masks[mask as Exclude<MaskType, "custom">];
      
      const maskedValue = maskFn(inputValue);
      const rawValue = inputValue.replace(/\D/g, "");
      
      setDisplayValue(maskedValue);
      onChange?.(maskedValue, rawValue);
    }, [mask, customMask, prefix, suffix, onChange]);

    const fullDisplayValue = displayValue 
      ? `${prefix}${displayValue}${suffix}`
      : "";

    return (
      <Input
        ref={ref}
        value={fullDisplayValue}
        onChange={handleChange}
        className={cn(className)}
        {...props}
      />
    );
  }
);

InputMask.displayName = "InputMask";

// Preset components for common use cases
export const PhoneInput = forwardRef<HTMLInputElement, Omit<InputMaskProps, 'mask'>>(
  (props, ref) => (
    <InputMask ref={ref} mask="phone" placeholder="(555) 555-5555" {...props} />
  )
);
PhoneInput.displayName = "PhoneInput";

export const CurrencyInput = forwardRef<HTMLInputElement, Omit<InputMaskProps, 'mask'>>(
  (props, ref) => (
    <InputMask ref={ref} mask="currency" prefix="$" placeholder="$0.00" {...props} />
  )
);
CurrencyInput.displayName = "CurrencyInput";

export const DateInput = forwardRef<HTMLInputElement, Omit<InputMaskProps, 'mask'>>(
  (props, ref) => (
    <InputMask ref={ref} mask="date" placeholder="MM/DD/YYYY" {...props} />
  )
);
DateInput.displayName = "DateInput";

export const CreditCardInput = forwardRef<HTMLInputElement, Omit<InputMaskProps, 'mask'>>(
  (props, ref) => (
    <InputMask ref={ref} mask="creditCard" placeholder="1234 5678 9012 3456" {...props} />
  )
);
CreditCardInput.displayName = "CreditCardInput";
