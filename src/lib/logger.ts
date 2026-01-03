/**
 * Centralized logging utility for the application
 * Prevents console statements from running in production
 * Supports integration with error tracking services
 */

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isTest = process.env.NODE_ENV === 'test';

  /**
   * General logging - only in development
   */
  log(...args: unknown[]): void {
    if (this.isDevelopment) {
      console.log('[LOG]', ...args);
    }
  }

  /**
   * Informational messages - only in development
   */
  info(...args: unknown[]): void {
    if (this.isDevelopment) {
      console.info('[INFO]', ...args);
    }
  }

  /**
   * Warning messages - in development and production
   */
  warn(...args: unknown[]): void {
    if (this.isDevelopment) {
      console.warn('[WARN]', ...args);
    } else {
      // In production, send to error tracking service
      this.sendToErrorTracking('warn', args);
    }
  }

  /**
   * Error messages - always logged
   */
  error(...args: unknown[]): void {
    if (this.isDevelopment) {
      console.error('[ERROR]', ...args);
    } else {
      // In production, send to error tracking service
      this.sendToErrorTracking('error', args);
    }
  }

  /**
   * Debug messages - only in development
   */
  debug(...args: unknown[]): void {
    if (this.isDevelopment) {
      console.debug('[DEBUG]', ...args);
    }
  }

  /**
   * Log with context for better debugging
   */
  logWithContext(level: LogLevel, message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      level,
      message,
      ...context,
    };

    if (this.isDevelopment) {
      console[level](`[${level.toUpperCase()}]`, logData);
    } else if (level === 'error' || level === 'warn') {
      this.sendToErrorTracking(level, [logData]);
    }
  }

  /**
   * Send logs to error tracking service (e.g., Sentry, LogRocket)
   * Implement this when you integrate an error tracking service
   */
  private sendToErrorTracking(level: string, data: unknown[]): void {
    // Integration point for error tracking services
    // To enable Sentry, install @sentry/react and uncomment:
    //
    // import * as Sentry from '@sentry/react';
    //
    // if (level === 'error') {
    //   const errorData = data[0];
    //   if (errorData instanceof Error) {
    //     Sentry.captureException(errorData, {
    //       extra: { additionalData: data.slice(1) }
    //     });
    //   } else {
    //     Sentry.captureException(new Error(JSON.stringify(errorData)));
    //   }
    // } else if (level === 'warn') {
    //   Sentry.captureMessage(JSON.stringify(data), 'warning');
    // }

    // For production use without Sentry, consider:
    // - LogRocket: https://logrocket.com/
    // - Datadog: https://www.datadoghq.com/
    // - Custom endpoint to your backend logging service

    // Store critical errors in localStorage as fallback for debugging
    if (level === 'error' && typeof window !== 'undefined') {
      try {
        const errors = JSON.parse(localStorage.getItem('app_errors') || '[]');
        errors.push({
          timestamp: new Date().toISOString(),
          level,
          data: data.map(d => d instanceof Error ? d.message : d)
        });
        // Keep only last 50 errors
        localStorage.setItem('app_errors', JSON.stringify(errors.slice(-50)));
      } catch (e) {
        // Silently fail if localStorage is unavailable
      }
    }
  }

  /**
   * Performance timing utility
   */
  time(label: string): void {
    if (this.isDevelopment) {
      console.time(label);
    }
  }

  /**
   * End performance timing
   */
  timeEnd(label: string): void {
    if (this.isDevelopment) {
      console.timeEnd(label);
    }
  }

  /**
   * Group related log messages
   */
  group(label: string): void {
    if (this.isDevelopment) {
      console.group(label);
    }
  }

  /**
   * End log group
   */
  groupEnd(): void {
    if (this.isDevelopment) {
      console.groupEnd();
    }
  }

  /**
   * Log table data (useful for arrays of objects)
   */
  table(data: unknown): void {
    if (this.isDevelopment) {
      console.table(data);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions
export const log = logger.log.bind(logger);
export const info = logger.info.bind(logger);
export const warn = logger.warn.bind(logger);
export const error = logger.error.bind(logger);
export const debug = logger.debug.bind(logger);
export const logWithContext = logger.logWithContext.bind(logger);
