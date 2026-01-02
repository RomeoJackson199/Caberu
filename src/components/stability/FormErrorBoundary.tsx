import React, { Component, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { logger } from '@/lib/logger';
import { reportError } from '@/lib/error-handling/reporting';

interface Props {
  children: ReactNode;
  formName?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

/**
 * Lightweight error boundary specifically for form components
 * Shows inline error message without disrupting the entire page
 */
export class FormErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { formName = 'Unknown Form' } = this.props;

    logger.error(`FormErrorBoundary [${formName}] caught error:`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    reportError({
      error_type: 'FormError',
      error_message: `${formName}: ${error.message}`,
      stack_trace: error.stack,
      severity: 'medium',
      metadata: {
        formName,
        componentStack: errorInfo.componentStack,
      },
    });

    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Alert variant="destructive" className="my-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Form Error</AlertTitle>
          <AlertDescription className="space-y-3">
            <p className="text-sm">
              There was an error loading this form. Please try again.
            </p>
            {this.state.error && process.env.NODE_ENV === 'development' && (
              <p className="text-xs font-mono bg-destructive/10 p-2 rounded">
                {this.state.error.message}
              </p>
            )}
            <Button
              onClick={this.handleReset}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              <RotateCcw className="h-3 w-3 mr-2" />
              Reset Form
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap form components with error boundary
 */
export function withFormErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  formName?: string
): React.FC<P> {
  const WithBoundary: React.FC<P> = (props) => (
    <FormErrorBoundary formName={formName}>
      <WrappedComponent {...props} />
    </FormErrorBoundary>
  );

  WithBoundary.displayName = `WithFormErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithBoundary;
}
