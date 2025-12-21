// Comprehensive analytics system for Caberu
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

interface AnalyticsEvent {
  user_id?: string;
  event_name: string;
  event_data: Record<string, any>;
}

// Core analytics events
export const ANALYTICS_EVENTS = {
  // Authentication events
  AUTH_LOGIN: 'auth_login',
  AUTH_LOGOUT: 'auth_logout',
  AUTH_SIGNUP: 'auth_signup',
  AUTH_GOOGLE_LOGIN: 'auth_google_login',

  // Appointment events
  APPOINTMENT_CREATE: 'appointment_create',
  APPOINTMENT_CANCEL: 'appointment_cancel',
  APPOINTMENT_CONFIRM: 'appointment_confirm',
  APPOINTMENT_COMPLETE: 'appointment_complete',
  APPOINTMENT_STATUS_CHANGE: 'appointment_status_change',

  // Assistant chat events
  ASSISTANT_BOOKING_STARTED: 'assistant_booking_started',
  ASSISTANT_BOOKING_CONFIRMED: 'assistant_booking_confirmed',
  ASSISTANT_BOOKING_CANCELLED: 'assistant_booking_cancelled',
  ASSISTANT_SYMPTOM_SUBMITTED: 'assistant_symptom_submitted',
  ASSISTANT_DENTIST_RECOMMENDED: 'assistant_dentist_recommended',

  // User journey events
  USER_ONBOARDING_STARTED: 'user_onboarding_started',
  USER_ONBOARDING_COMPLETED: 'user_onboarding_completed',
  USER_PROFILE_UPDATED: 'user_profile_updated',

  // Performance events
  PAGE_LOAD_TIME: 'page_load_time',
  API_REQUEST_TIME: 'api_request_time',
  ERROR_OCCURRED: 'error_occurred',

  // PWA events
  PWA_INSTALLED: 'pwa_installed',
  PWA_PROMPT_SHOWN: 'pwa_prompt_shown',
  PWA_PROMPT_DISMISSED: 'pwa_prompt_dismissed',

  // Accessibility events
  KEYBOARD_NAVIGATION_USED: 'keyboard_navigation_used',
  SCREEN_READER_DETECTED: 'screen_reader_detected',
  HIGH_CONTRAST_ENABLED: 'high_contrast_enabled',
} as const;

class AnalyticsManager {
  private isInitialized = false;
  private eventQueue: AnalyticsEvent[] = [];
  private consentGiven = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      // Check for user consent
      const consent = localStorage.getItem('analytics_consent');
      this.consentGiven = consent === 'true';

      // Initialize performance monitoring
      this.initializePerformanceMonitoring();

      // Initialize error tracking
      this.initializeErrorTracking();

      this.isInitialized = true;

      // Process queued events
      await this.processEventQueue();
    } catch (error) {
      logger.error('Failed to initialize analytics:', error);
    }
  }

  private initializePerformanceMonitoring() {
    if (typeof window !== 'undefined' && 'performance' in window) {
      // Monitor page load time
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          if (navigation) {
            this.track(ANALYTICS_EVENTS.PAGE_LOAD_TIME, {
              load_time: navigation.loadEventEnd - navigation.loadEventStart,
              dom_content_loaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
              url: window.location.pathname,
            });
          }
        }, 0);
      });

      // Monitor LCP (Largest Contentful Paint)
      if ('PerformanceObserver' in window) {
        try {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];

            this.track('lcp_measured', {
              value: lastEntry.startTime,
              url: window.location.pathname,
            });
          });

          observer.observe({ type: 'largest-contentful-paint', buffered: true });
        } catch (e) {
          // Silently fail if observer not supported
        }
      }
    }
  }

  private initializeErrorTracking() {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.track(ANALYTICS_EVENTS.ERROR_OCCURRED, {
          error_message: event.message,
          error_source: event.filename,
          error_line: event.lineno,
          error_column: event.colno,
          stack_trace: event.error?.stack,
          url: window.location.pathname,
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.track(ANALYTICS_EVENTS.ERROR_OCCURRED, {
          error_message: event.reason?.message || 'Unhandled promise rejection',
          error_type: 'promise_rejection',
          stack_trace: event.reason?.stack,
          url: window.location.pathname,
        });
      });
    }
  }

  async setConsent(consent: boolean) {
    this.consentGiven = consent;
    localStorage.setItem('analytics_consent', consent.toString());

    if (consent && this.eventQueue.length > 0) {
      await this.processEventQueue();
    } else if (!consent) {
      // Clear queue if consent withdrawn
      this.eventQueue = [];
    }
  }

  async track(eventName: string, eventData: Record<string, any> = {}) {
    if (!this.consentGiven) {
      return; // Don't track if no consent
    }

    const event: AnalyticsEvent = {
      event_name: eventName,
      event_data: {
        ...eventData,
        timestamp: Date.now(),
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.pathname : undefined,
        referrer: typeof document !== 'undefined' ? document.referrer : undefined,
      },
    };

    // Add user_id if available
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        event.user_id = user.id;
      }
    } catch (e) {
      // Continue without user ID
    }

    if (!this.isInitialized) {
      this.eventQueue.push(event);
      return;
    }

    await this.sendEvent(event);
  }

  private async sendEvent(event: AnalyticsEvent) {
    try {
      const { error } = await supabase
        .from('analytics_events')
        .insert({
          user_id: event.user_id,
          event_name: event.event_name,
          event_data: event.event_data,
        });

      if (error) {
        logger.error('Failed to send analytics event:', error);
        // Fallback to debug logging
        logger.debug('[Analytics]', event.event_name, event.event_data);
      }
    } catch (error) {
      logger.error('Analytics error:', error);
      // Fallback to debug logging
      logger.debug('[Analytics]', event.event_name, event.event_data);
    }
  }

  private async processEventQueue() {
    if (!this.consentGiven || this.eventQueue.length === 0) {
      return;
    }

    const eventsToProcess = [...this.eventQueue];
    this.eventQueue = [];

    for (const event of eventsToProcess) {
      await this.sendEvent(event);
    }
  }

  // Convenience methods for common events
  async trackPageView(page: string) {
    await this.track('page_view', { page });
  }

  async trackUserAction(action: string, details: Record<string, any> = {}) {
    await this.track('user_action', { action, ...details });
  }

  async trackPerformance(metric: string, value: number, url?: string) {
    await this.track('performance_metric', {
      metric,
      value,
      url: url || (typeof window !== 'undefined' ? window.location.pathname : undefined),
    });
  }

  // Accessibility tracking
  async trackAccessibilityUsage(feature: string, details: Record<string, any> = {}) {
    await this.track('accessibility_used', { feature, ...details });
  }

  // A/B Testing support
  async trackExperiment(experimentName: string, variant: string, converted: boolean = false) {
    await this.track('experiment_event', {
      experiment_name: experimentName,
      variant,
      converted,
    });
  }
}

// Global analytics instance
export const analytics = new AnalyticsManager();

// Utility functions for common tracking patterns
export async function trackAppointmentFlow(step: string, data: Record<string, any> = {}) {
  await analytics.track('appointment_flow', { step, ...data });
}

export async function trackChatInteraction(action: string, data: Record<string, any> = {}) {
  await analytics.track('chat_interaction', { action, ...data });
}

export async function trackAuthEvent(event: string, method?: string) {
  await analytics.track(event, { method });
}

export async function trackError(error: Error, context: string = '') {
  await analytics.track(ANALYTICS_EVENTS.ERROR_OCCURRED, {
    error_message: error.message,
    error_name: error.name,
    stack_trace: error.stack,
    context,
  });
}

// Performance tracking helpers
export async function measureAsync<T>(
  fn: () => Promise<T>,
  eventName: string,
  context: Record<string, any> = {}
): Promise<T> {
  const start = performance.now();

  try {
    const result = await fn();
    const duration = performance.now() - start;

    await analytics.track(eventName, {
      duration,
      success: true,
      ...context,
    });

    return result;
  } catch (error) {
    const duration = performance.now() - start;

    await analytics.track(eventName, {
      duration,
      success: false,
      error_message: error instanceof Error ? error.message : 'Unknown error',
      ...context,
    });

    throw error;
  }
}

// Export the analytics manager as default
export default analytics;