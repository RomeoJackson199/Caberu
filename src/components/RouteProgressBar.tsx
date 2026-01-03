import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Route Progress Bar Component
 *
 * Shows a smooth progress bar at the top of the page during route transitions
 * Provides visual feedback that the app is loading the next page
 */
export function RouteProgressBar() {
  const [progress, setProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Start progress animation on route change
    setIsAnimating(true);
    setProgress(0);

    // Simulate progress
    const timer1 = setTimeout(() => setProgress(30), 100);
    const timer2 = setTimeout(() => setProgress(60), 300);
    const timer3 = setTimeout(() => setProgress(90), 600);

    // Complete progress
    const timer4 = setTimeout(() => {
      setProgress(100);
      setTimeout(() => setIsAnimating(false), 300);
    }, 900);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [location.pathname]);

  return (
    <AnimatePresence>
      {isAnimating && (
        <motion.div
          className="fixed top-0 left-0 right-0 z-[100] h-1 bg-gradient-to-r from-primary via-secondary to-accent shadow-lg"
          initial={{ scaleX: 0, transformOrigin: 'left' }}
          animate={{ scaleX: progress / 100 }}
          exit={{ opacity: 0 }}
          transition={{
            scaleX: { duration: 0.3, ease: 'easeOut' },
            opacity: { duration: 0.2 }
          }}
        />
      )}
    </AnimatePresence>
  );
}
