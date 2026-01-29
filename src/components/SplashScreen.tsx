import { useEffect, useState } from 'react';

interface SplashScreenProps {
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
 * Displays a simple branded loading screen with logo, tagline, and solid background.
 * Hides immediately when the app is ready - no artificial delays.
 */
export function SplashScreen({
  isReady = true,
  onComplete,
  show = true
}: SplashScreenProps) {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    if (!show || isReady) {
      setVisible(false);
      onComplete?.();
    }
  }, [show, isReady, onComplete]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{
        backgroundColor: '#2563eb',
      }}
      role="status"
      aria-label="Loading application"
    >
      {/* Logo */}
      <div className="mb-6">
        <img
          src="/caberu-icon.png"
          alt="Caberu"
          className="w-24 h-24 sm:w-32 sm:h-32"
        />
      </div>

      {/* Brand Name */}
      <h1 className="text-3xl sm:text-4xl font-semibold text-white mb-2 tracking-tight">
        Caberu
      </h1>

      {/* Tagline */}
      <p className="text-sm sm:text-base text-white/70 text-center px-4">
        Healthcare Practice Management
      </p>
    </div>
  );
}

/**
 * Hook to manage splash screen state
 */
export function useSplashScreen() {
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
        onComplete={hideSplash}
      />
    ),
  };
}

export default SplashScreen;
