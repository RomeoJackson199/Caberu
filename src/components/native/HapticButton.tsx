/**
 * HapticButton Component
 *
 * A button that provides haptic feedback on press.
 * Automatically falls back to web vibration API if available.
 */
import React from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { useHaptics, type HapticType } from '@/hooks/useDespia';
import { cn } from '@/lib/utils';

interface HapticButtonProps extends ButtonProps {
  hapticType?: HapticType;
  hapticOnClick?: boolean;
}

export function HapticButton({
  hapticType = 'light',
  hapticOnClick = true,
  onClick,
  children,
  className,
  ...props
}: HapticButtonProps) {
  const haptics = useHaptics();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (hapticOnClick) {
      haptics.trigger(hapticType);
    }
    onClick?.(e);
  };

  return (
    <Button
      onClick={handleClick}
      className={cn(className)}
      {...props}
    >
      {children}
    </Button>
  );
}

// Pre-configured haptic button variants
export function SuccessButton(props: Omit<HapticButtonProps, 'hapticType'>) {
  return <HapticButton hapticType="success" {...props} />;
}

export function WarningButton(props: Omit<HapticButtonProps, 'hapticType'>) {
  return <HapticButton hapticType="warning" {...props} />;
}

export function ErrorButton(props: Omit<HapticButtonProps, 'hapticType'>) {
  return <HapticButton hapticType="error" {...props} />;
}

export function ImpactButton(props: Omit<HapticButtonProps, 'hapticType'>) {
  return <HapticButton hapticType="heavy" {...props} />;
}

export default HapticButton;
