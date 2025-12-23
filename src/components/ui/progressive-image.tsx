import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ProgressiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  placeholderSrc?: string;
  blurHash?: string;
  aspectRatio?: string;
}

/**
 * Progressive image loading component
 * Shows a placeholder while the full image loads
 */
export function ProgressiveImage({
  src,
  placeholderSrc,
  blurHash,
  aspectRatio = "16/9",
  className,
  alt = "",
  ...props
}: ProgressiveImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={imgRef}
      className={cn("relative overflow-hidden bg-muted", className)}
      style={{ aspectRatio }}
    >
      {/* Placeholder/Blur layer */}
      {!isLoaded && (
        <div
          className="absolute inset-0 animate-pulse bg-muted"
          style={
            blurHash
              ? {
                  backgroundImage: `url(${blurHash})`,
                  backgroundSize: "cover",
                  filter: "blur(20px)",
                  transform: "scale(1.1)",
                }
              : undefined
          }
        />
      )}

      {/* Low quality placeholder */}
      {placeholderSrc && !isLoaded && (
        <img
          src={placeholderSrc}
          alt=""
          className="absolute inset-0 w-full h-full object-cover blur-lg scale-105"
          aria-hidden="true"
        />
      )}

      {/* Main image - only load when in view */}
      {isInView && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-500",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          {...props}
        />
      )}
    </div>
  );
}

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  fallback?: React.ReactNode;
}

/**
 * Simple lazy loading image with fade-in effect
 */
export function LazyImage({
  src,
  className,
  fallback,
  alt = "",
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  if (hasError && fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className={cn("relative", className)}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-muted animate-pulse rounded-inherit" />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={cn(
          "transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0",
          className
        )}
        {...props}
      />
    </div>
  );
}
