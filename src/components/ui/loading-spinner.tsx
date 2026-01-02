import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Heart, Sparkles } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "default" | "card" | "overlay" | "minimal";
  message?: string;
  description?: string;
}

export function LoadingSpinner({ 
  size = "md", 
  variant = "default",
  message = "Loading...",
  description
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8",
    xl: "h-12 w-12"
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg", 
    xl: "text-xl"
  };

  const LoadingContent = () => (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        {/* Main spinner */}
        <Loader2 className={`${sizeClasses[size]} text-dental-primary animate-spin`} />
        
        {/* Decorative elements for larger sizes */}
        {(size === "lg" || size === "xl") && (
          <>
            <div className="absolute -top-2 -right-2">
              <Sparkles className="h-3 w-3 text-dental-accent animate-pulse" />
            </div>
            <div className="absolute -bottom-2 -left-2">
              <Heart className="h-3 w-3 text-dental-secondary animate-pulse" style={{ animationDelay: "0.5s" }} />
            </div>
          </>
        )}
      </div>
      
      <div className="text-center space-y-1">
        <p className={`font-medium text-dental-foreground ${textSizeClasses[size]}`}>
          {message}
        </p>
        {description && (
          <p className="text-sm text-dental-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </div>
  );

  switch (variant) {
    case "card":
      return (
        <Card className="glass-card">
          <CardContent className="flex items-center justify-center p-8">
            <LoadingContent />
          </CardContent>
        </Card>
      );

    case "overlay":
      return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="glass-card">
            <CardContent className="flex items-center justify-center p-8">
              <LoadingContent />
            </CardContent>
          </Card>
        </div>
      );

    case "minimal":
      return (
        <div className="flex items-center justify-center space-x-2">
          <Loader2 className={`${sizeClasses[size]} text-dental-primary animate-spin`} />
          <span className={`text-dental-muted-foreground ${textSizeClasses[size]}`}>
            {message}
          </span>
        </div>
      );

    default:
      return (
        <div className="flex items-center justify-center p-8">
          <LoadingContent />
        </div>
      );
  }
}