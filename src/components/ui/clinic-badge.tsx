/**
 * ClinicBadge Component
 * Consistent clinic/business indicator for appointments, documents, payments, messages
 * Ensures clear data ownership visibility
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Building2 } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface ClinicBadgeProps {
  name: string;
  logoUrl?: string | null;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show the building icon when no logo */
  showIcon?: boolean;
  /** Additional class names */
  className?: string;
  /** Whether to show as a full badge with background */
  variant?: 'inline' | 'badge' | 'compact';
}

const sizeClasses = {
  sm: {
    container: 'text-xs gap-1',
    avatar: 'h-4 w-4',
    icon: 'h-3 w-3',
  },
  md: {
    container: 'text-sm gap-1.5',
    avatar: 'h-5 w-5',
    icon: 'h-3.5 w-3.5',
  },
  lg: {
    container: 'text-base gap-2',
    avatar: 'h-6 w-6',
    icon: 'h-4 w-4',
  },
};

export function ClinicBadge({
  name,
  logoUrl,
  size = 'sm',
  showIcon = true,
  className,
  variant = 'inline',
}: ClinicBadgeProps) {
  const sizes = sizeClasses[size];
  
  const initials = name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const content = (
    <>
      {logoUrl ? (
        <Avatar className={sizes.avatar}>
          <AvatarImage src={logoUrl} alt={name} className="object-cover" />
          <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
      ) : showIcon ? (
        <Building2 className={cn(sizes.icon, 'text-primary flex-shrink-0')} />
      ) : null}
      <span className="font-medium truncate">{name}</span>
    </>
  );

  if (variant === 'badge') {
    return (
      <div
        className={cn(
          'inline-flex items-center px-2 py-1 rounded-md',
          'bg-primary/5 border border-primary/10',
          sizes.container,
          className
        )}
      >
        {content}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'inline-flex items-center',
          'text-muted-foreground',
          sizes.container,
          className
        )}
      >
        {content}
      </div>
    );
  }

  // Default: inline
  return (
    <div
      className={cn(
        'inline-flex items-center',
        'text-foreground',
        sizes.container,
        className
      )}
    >
      {content}
    </div>
  );
}

/**
 * ClinicLabel - Simpler version just showing the name with an icon
 */
export function ClinicLabel({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-sm', className)}>
      <Building2 className="h-3.5 w-3.5 text-primary" />
      <span className="font-medium">{name}</span>
    </span>
  );
}
