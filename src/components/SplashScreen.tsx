import { useEffect, useState } from 'react';

interface SplashScreenProps {
  /** Minimum time to show splash screen in ms (default: 1000) */
  minDuration?: number;
  /** Whether app is ready to show (loading complete) */
  isReady?: boolean;
  /** Callback when splash screen finishes */
  onComplete?: () => void;
  /** Show splash screen */
  show?: boolean;
}

/**
 * PWA Splash Screen Component
 *
 * Displays a branded loading screen that matches the iOS/Android PWA splash screens.
 * Provides a seamless transition from the native splash to the app.
 */
export function SplashScreen({
  minDuration = 1000,
  isReady = true,
  onComplete,
  show = true
}: SplashScreenProps) {
  const [visible, setVisible] = useState(show);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (!show) {
      setVisible(false);
      return;
    }

    const timer = setTimeout(() => {
      if (isReady) {
        setFadeOut(true);
        setTimeout(() => {
          setVisible(false);
          onComplete?.();
        }, 300); // Fade out duration
      }
    }, minDuration);

    return () => clearTimeout(timer);
  }, [show, isReady, minDuration, onComplete]);

  // Also trigger fade when isReady becomes true after minDuration
  useEffect(() => {
    if (isReady && show && !fadeOut) {
      const checkTimer = setTimeout(() => {
        setFadeOut(true);
        setTimeout(() => {
          setVisible(false);
          onComplete?.();
        }, 300);
      }, 100);
      return () => clearTimeout(checkTimer);
    }
  }, [isReady, show, fadeOut, onComplete]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-300 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
      }}
      role="status"
      aria-label="Loading application"
    >
      {/* Icon Container */}
      <div className="relative mb-8">
        {/* Background Circle */}
        <div
          className="absolute inset-0 rounded-full animate-pulse"
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            transform: 'scale(1.5)',
          }}
        />

        {/* Tooth Icon */}
        <div className="relative w-24 h-24 sm:w-32 sm:h-32">
          <svg
            viewBox="0 0 200 200"
            className="w-full h-full drop-shadow-lg"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="splashIconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1"/>
                <stop offset="100%" stopColor="#f0f0f0" stopOpacity="0.95"/>
              </linearGradient>
            </defs>
            <g transform="translate(22, 18) scale(1)">
              <path
                d="M60 0C26.9 0 0 26.9 0 60v60c0 22.1 11.9 40 30 40s30-17.9 30-40V80c0-11 9-20 20-20s20 9 20 20v40c0 22.1 11.9 40 30 40s30-17.9 30-40V60c0-33.1-26.9-60-60-60z"
                fill="url(#splashIconGradient)"
                className="animate-pulse"
                style={{ animationDuration: '2s' }}
              />
            </g>
          </svg>
        </div>
      </div>

      {/* Brand Name */}
      <h1
        className="text-3xl sm:text-4xl font-semibold text-white mb-2 tracking-tight"
        style={{ opacity: 0.95 }}
      >
        Caberu
      </h1>

      {/* Tagline */}
      <p
        className="text-sm sm:text-base text-white/70 text-center px-4"
      >
        Healthcare Practice Management
      </p>

      {/* Loading Indicator */}
      <div className="absolute bottom-12 sm:bottom-16">
        <div className="flex items-center gap-2">
          <div className="flex space-x-1">
            <div
              className="w-2 h-2 bg-white/60 rounded-full animate-bounce"
              style={{ animationDelay: '0ms' }}
            />
            <div
              className="w-2 h-2 bg-white/60 rounded-full animate-bounce"
              style={{ animationDelay: '150ms' }}
            />
            <div
              className="w-2 h-2 bg-white/60 rounded-full animate-bounce"
              style={{ animationDelay: '300ms' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to manage splash screen state
 */
export function useSplashScreen(minDuration = 1000) {
  const [showSplash, setShowSplash] = useState(true);
  const [appReady, setAppReady] = useState(false);

  const markReady = () => setAppReady(true);
  const hideSplash = () => setShowSplash(false);

  return {
    showSplash,
    appReady,
    markReady,
    hideSplash,
    SplashScreenComponent: () => (
      <SplashScreen
        show={showSplash}
        isReady={appReady}
        minDuration={minDuration}
        onComplete={hideSplash}
      />
    ),
  };
}

export default SplashScreen;
