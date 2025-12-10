import { supabase } from '@/integrations/supabase/client';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

interface ReportErrorParams {
  error_type: string;
  error_message: string;
  stack_trace?: string;
  severity?: ErrorSeverity;
  metadata?: Record<string, unknown>;
  url?: string;
}

export async function reportError(params: ReportErrorParams) {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    // Only query session_business if we have a valid user ID
    let businessId: string | null = null;
    if (userId) {
      const { data: businessData } = await supabase
        .from('session_business')
        .select('business_id')
        .eq('user_id', userId)
        .maybeSingle();
      businessId = businessData?.business_id || null;
    }

    await supabase.from('system_errors').insert({
      error_type: params.error_type,
      error_message: params.error_message,
      stack_trace: params.stack_trace || null,
      severity: params.severity || 'medium',
      user_id: userId || null,
      business_id: businessId,
      url: params.url || window.location.href,
      user_agent: navigator.userAgent,
      metadata: params.metadata || null,
    });
  } catch (err) {
    // Silently fail - don't want error reporting to break the app
    console.error('Failed to report error:', err);
  }
}

// Initialize global error handlers
export function initializeErrorReporting() {
  // Prevent double-initialization
  if ((window as any).__error_reporting_initialized__) return;
  (window as any).__error_reporting_initialized__ = true;

  // Simple dedupe to avoid spammy duplicates (30s window)
  const DEDUPE_WINDOW_MS = 30_000;
  const seen = new Map<string, number>();
  const shouldReport = (key: string) => {
    const now = Date.now();
    const last = seen.get(key) || 0;
    if (now - last < DEDUPE_WINDOW_MS) return false;
    seen.set(key, now);
    return true;
  };

  const safeSerialize = (values: any[]) => {
    try {
      return values.map((v) => {
        if (v instanceof Error) {
          return { name: v.name, message: v.message, stack: v.stack };
        }
        if (typeof v === 'string') return v;
        try { return JSON.parse(JSON.stringify(v)); } catch { return String(v); }
      });
    } catch {
      return ['[unserializable args]'];
    }
  };

  // Patch console methods to capture console errors/warnings as system errors
  const originalError = console.error.bind(console);
  const originalWarn = console.warn.bind(console);

  console.error = (...args: any[]) => {
    try {
      const message = args
        .map((a) => (a instanceof Error ? a.message : typeof a === 'string' ? a : (() => { try { return JSON.stringify(a); } catch { return String(a); } })()))
        .join(' ');
      const stack = (args.find((a) => a instanceof Error) as Error | undefined)?.stack;
      const key = `console.error:${message}`;

      // Avoid recursion on our own reporting failures
      if (shouldReport(key) && !message?.includes('Failed to report error')) {
        reportError({
          error_type: 'ConsoleError',
          error_message: message || 'console.error called',
          stack_trace: stack,
          severity: 'high',
          metadata: { consoleArgs: safeSerialize(args) },
        });
      }
    } catch {
      // Silently ignore - avoid infinite recursion if error reporting fails
    }
    // Always forward to original console
    originalError(...args);
  };

  console.warn = (...args: any[]) => {
    try {
      const message = args
        .map((a) => (a instanceof Error ? a.message : typeof a === 'string' ? a : (() => { try { return JSON.stringify(a); } catch { return String(a); } })()))
        .join(' ');
      const key = `console.warn:${message}`;
      if (shouldReport(key)) {
        reportError({
          error_type: 'ConsoleWarning',
          error_message: message || 'console.warn called',
          severity: 'medium',
          metadata: { consoleArgs: safeSerialize(args) },
        });
      }
    } catch {
      // Silently ignore - avoid infinite recursion if error reporting fails
    }
    originalWarn(...args);
  };

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    reportError({
      error_type: 'UnhandledPromiseRejection',
      error_message: event.reason?.message || String(event.reason),
      stack_trace: event.reason?.stack,
      severity: 'high',
      metadata: {
        reason: event.reason,
      },
    });
  });

  // Catch global errors
  window.addEventListener('error', (event) => {
    reportError({
      error_type: event.error?.name || 'GlobalError',
      error_message: event.message,
      stack_trace: event.error?.stack,
      severity: 'high',
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });
}
