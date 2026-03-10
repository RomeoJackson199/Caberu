// Performance monitoring and optimization utilities
import { logger } from '@/lib/logger';

export const performanceTracker = {
  // Track component render time
  trackRender: <T>(_componentName: string, renderFn: () => T): T => {
    const startTime = performance.now();
    const result = renderFn();
    void (performance.now() - startTime); // Duration available for logging
    return result;
  },

  // Track function execution time
  trackFunction: async <T>(functionName: string, asyncFn: () => Promise<T>): Promise<T> => {
    const startTime = performance.now();
    try {
      const result = await asyncFn();
      void (performance.now() - startTime); // Duration tracking
      return result;
    } catch (error) {
      const endTime = performance.now();
      logger.error(`❌ ${functionName} failed after ${(endTime - startTime).toFixed(2)}ms:`, error);
      throw error;
    }
  },

  // Monitor memory usage
  monitorMemory: () => {
    // Memory monitoring removed for production
  }
};

// Debounce function with TypeScript support
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle function with TypeScript support  
export function throttle<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Lazy load images with intersection observer
export const createImageLoader = () => {
  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        const dataSrc = img.getAttribute('data-src');
        if (dataSrc) {
          img.src = dataSrc;
          img.removeAttribute('data-src');
          imageObserver.unobserve(img);
        }
      }
    });
  });

  return {
    observe: (img: HTMLImageElement) => imageObserver.observe(img),
    disconnect: () => imageObserver.disconnect()
  };
};

// Virtual scrolling helper
export const calculateVisibleItems = (
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  totalItems: number,
  overscan = 5
) => {
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    totalItems - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  return { startIndex, endIndex };
};

// Bundle analyzer helper for development
export const analyzeBundleSize = () => {
  // This would typically integrate with webpack-bundle-analyzer
};