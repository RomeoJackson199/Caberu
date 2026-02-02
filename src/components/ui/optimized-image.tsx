/**
 * OptimizedImage Component
 * Provides lazy loading, skeleton placeholders, and error handling for images
 */

import React, { useState, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ImageOff } from 'lucide-react';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Image source URL */
  src: string;
  /** Alt text for accessibility */
  alt: string;
  /** Whether to load eagerly (above the fold) */
  priority?: boolean;
  /** Fallback content when image fails to load */
  fallback?: React.ReactNode;
  /** Whether to show skeleton while loading */
  showSkeleton?: boolean;
  /** Container className */
  containerClassName?: string;
  /** Aspect ratio for skeleton (e.g., "1/1", "16/9") */
  aspectRatio?: string;
}

export const OptimizedImage = React.memo<OptimizedImageProps>(({
  src,
  alt,
  priority = false,
  fallback,
  showSkeleton = true,
  containerClassName,
  aspectRatio,
  className,
  ...props
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const handleLoad = useCallback(() => {
    setLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setError(true);
    setLoaded(true);
  }, []);

  if (error) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return (
      <div 
        className={cn(
          "flex items-center justify-center bg-muted rounded-lg",
          containerClassName
        )}
        style={aspectRatio ? { aspectRatio } : undefined}
        role="img"
        aria-label={`Failed to load: ${alt}`}
      >
        <ImageOff className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div 
      className={cn("relative", containerClassName)}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {/* Skeleton placeholder */}
      {showSkeleton && !loaded && (
        <Skeleton className="absolute inset-0 rounded-lg" />
      )}
      
      {/* Actual image */}
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          "transition-opacity duration-300",
          !loaded && "opacity-0",
          loaded && "opacity-100",
          className
        )}
        {...props}
      />
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

/**
 * Avatar-specific optimized image
 */
interface OptimizedAvatarProps {
  src?: string | null;
  alt: string;
  fallbackText: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const OptimizedAvatar = React.memo<OptimizedAvatarProps>(({
  src,
  alt,
  fallbackText,
  size = 'md',
  className,
}) => {
  const [error, setError] = useState(false);
  
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-lg',
  };

  if (!src || error) {
    return (
      <div 
        className={cn(
          "rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center font-medium",
          sizeClasses[size],
          className
        )}
        role="img"
        aria-label={alt}
      >
        {fallbackText.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setError(true)}
      className={cn(
        "rounded-full object-cover",
        sizeClasses[size],
        className
      )}
    />
  );
});

OptimizedAvatar.displayName = 'OptimizedAvatar';

export default OptimizedImage;
