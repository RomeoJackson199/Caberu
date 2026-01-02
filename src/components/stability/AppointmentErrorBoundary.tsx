import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { logger } from '@/lib/logger';
import { reportError } from '@/lib/error-handling/reporting';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  context?: 'booking' | 'management' | 'payment' | 'general';
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

/**
 * Domain-specific error boundary for appointment-related components
 * Provides contextual error messages and recovery options
 */
export class AppointmentErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { context = 'general' } = this.props;

    logger.error(`AppointmentErrorBoundary [${context}] caught error:`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // Report to system errors table with context
    reportError({
      error_type: `Appointment${context.charAt(0).toUpperCase() + context.slice(1)}Error`,
      error_message: error.message,
      stack_trace: error.stack,
      severity: 'high',
      metadata: {
        componentStack: errorInfo.componentStack,
        context,
      },
    });

    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    this.props.onReset?.();
  };

  getContextualMessage() {
    const { context } = this.props;

    switch (context) {
      case 'booking':
        return {
          title: 'Booking Error',
          description: 'We encountered an issue while processing your appointment booking. Your information has been saved, and you can try again.',
          action: 'Try Booking Again',
        };
      case 'management':
        return {
          title: 'Calendar Error',
          description: 'There was a problem loading your appointments. Please refresh to try again.',
          action: 'Refresh Calendar',
        };
      case 'payment':
        return {
          title: 'Payment Error',
          description: 'We encountered an issue processing your payment. No charges have been made. Please try again or contact support.',
          action: 'Try Again',
        };
      default:
        return {
          title: 'Something Went Wrong',
          description: 'We encountered an unexpected error. Please try again.',
          action: 'Try Again',
        };
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const contextMessage = this.getContextualMessage();

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-destructive/50">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <CardTitle className="text-xl">{contextMessage.title}</CardTitle>
              <CardDescription className="text-sm">
                {contextMessage.description}
                {this.state.error && process.env.NODE_ENV === 'development' && (
                  <div className="mt-3 p-2 bg-muted rounded text-xs font-mono text-left">
                    {this.state.error.message}
                  </div>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={this.handleReset}
                className="w-full"
                variant="default"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {contextMessage.action}
              </Button>
              <Button
                onClick={() => window.location.href = '/'}
                variant="outline"
                className="w-full"
              >
                <Home className="w-4 h-4 mr-2" />
                Go to Home
              </Button>
              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="mt-4 p-3 bg-muted rounded text-xs">
                  <summary className="cursor-pointer font-medium mb-2">
                    Error Details (Development Only)
                  </summary>
                  <pre className="whitespace-pre-wrap break-words max-h-64 overflow-auto">
                    {this.state.error?.toString()}
                    {'\n\n'}
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap components with appointment error boundary
 */
export function withAppointmentErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  context: Props['context'] = 'general'
): React.FC<P> {
  const WithBoundary: React.FC<P> = (props) => (
    <AppointmentErrorBoundary context={context}>
      <WrappedComponent {...props} />
    </AppointmentErrorBoundary>
  );

  WithBoundary.displayName = `WithAppointmentErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithBoundary;
}
