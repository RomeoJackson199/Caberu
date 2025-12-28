import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { performanceTracker } from './utils/performance'
import { notify } from './lib/notify'
import { logger } from '@/lib/logger';
import { initPerformanceMonitoring } from '@/lib/performance';

// Suppress ResizeObserver loop errors (benign browser warning)
const resizeObserverErr = (e: ErrorEvent) => {
  if (e.message === 'ResizeObserver loop completed with undelivered notifications.' ||
      e.message === 'ResizeObserver loop limit exceeded') {
    e.stopImmediatePropagation();
  }
};
window.addEventListener('error', resizeObserverErr);

// Initialize comprehensive performance monitoring
if (process.env.NODE_ENV === 'development') {
  performanceTracker.monitorMemory();
  initPerformanceMonitoring();
} else if (import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING) {
  // Enable in production if explicitly enabled
  initPerformanceMonitoring();
}

// Register service worker with better error handling
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available - show visible prompt
                notify.action('New app update available!', {
                  description: 'Click refresh to get the latest features',
                  actionLabel: 'Refresh',
                  onAction: () => {
                    // Send message to waiting worker to skip waiting
                    if (registration.waiting) {
                      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                    }
                  }
                });
              }
            });
          }
        });

        // Listen for controllerchange to reload when new SW takes over
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });
      })
      .catch((registrationError) => {
        console.error('Service worker registration failed:', registrationError);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);