/**
 * BiometricAuthButton Component
 *
 * A button that triggers Face ID / Touch ID authentication.
 * Falls back to showing unavailability message on non-native platforms.
 */
import React from 'react';
import { Button } from '@/components/ui/button';
import { Fingerprint, ScanFace, Lock, Loader2 } from 'lucide-react';
import { useBiometricAuth, useDespiaNative } from '@/hooks/useDespia';
import { useHaptics } from '@/hooks/useDespia';
import { cn } from '@/lib/utils';

interface BiometricAuthButtonProps {
  onSuccess?: () => void;
  onFailure?: (error?: string) => void;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
  label?: string;
  disabled?: boolean;
}

export function BiometricAuthButton({
  onSuccess,
  onFailure,
  className,
  variant = 'default',
  size = 'default',
  showLabel = true,
  label = 'Authenticate',
  disabled = false,
}: BiometricAuthButtonProps) {
  const isNative = useDespiaNative();
  const { authenticate, isAuthenticating, lastResult } = useBiometricAuth();
  const haptics = useHaptics();

  const handleAuth = async () => {
    haptics.impact();

    const result = await authenticate();

    if (result.authenticated) {
      haptics.success();
      onSuccess?.();
    } else {
      haptics.error();
      onFailure?.(result.error);
    }
  };

  // Determine which icon to show based on device
  const BiometricIcon = lastResult?.biometryType === 'touchId' ? Fingerprint : ScanFace;

  if (!isNative) {
    return (
      <Button
        variant="outline"
        size={size}
        className={cn('opacity-50 cursor-not-allowed', className)}
        disabled
      >
        <Lock className="h-4 w-4 mr-2" />
        {showLabel && 'Biometrics unavailable'}
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleAuth}
      disabled={disabled || isAuthenticating}
      className={className}
    >
      {isAuthenticating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <BiometricIcon className="h-4 w-4" />
      )}
      {showLabel && size !== 'icon' && (
        <span className="ml-2">
          {isAuthenticating ? 'Authenticating...' : label}
        </span>
      )}
    </Button>
  );
}

export default BiometricAuthButton;
