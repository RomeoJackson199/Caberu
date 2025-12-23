import { useEffect, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion, AnimatePresence } from 'framer-motion';

// Mobile-specific styles and optimizations
export function MobileOptimizations() {
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile) {
      // Add mobile-specific styles
      document.documentElement.style.setProperty('--mobile-padding', '1rem');
      document.documentElement.style.setProperty('--mobile-text-size', '16px');
      
      // Prevent zoom on input focus
      const viewport = document.querySelector('meta[name=viewport]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
      }
      
      // Add touch-friendly styles
      const style = document.createElement('style');
      style.textContent = `
        /* Mobile-optimized touch targets */
        button, a, [role="button"] {
          min-height: 44px;
          min-width: 44px;
          touch-action: manipulation;
        }
        
        /* Smooth scrolling */
        * {
          -webkit-overflow-scrolling: touch;
        }
        
        /* Remove tap highlight */
        * {
          -webkit-tap-highlight-color: transparent;
        }
        
        /* Mobile-friendly inputs */
        input, textarea, select {
          font-size: 16px !important;
          border-radius: 12px;
          padding: 16px;
          min-height: 48px;
        }
        
        /* Safe area support */
        .safe-area-inset-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }
        
        /* Mobile card spacing */
        .mobile-card {
          margin: 0.75rem;
          border-radius: 16px;
          box-shadow: 0 4px 20px -4px rgba(0,0,0,0.1);
        }
        
        /* Mobile navigation */
        .mobile-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: hsl(var(--background) / 0.98);
          backdrop-filter: blur(16px);
          border-top: 1px solid hsl(var(--border) / 0.5);
          padding: 0.75rem;
          padding-bottom: calc(0.75rem + env(safe-area-inset-bottom));
          z-index: 50;
        }
        
        /* Mobile-optimized text */
        .mobile-text {
          font-size: 15px;
          line-height: 1.6;
        }
        
        /* Mobile-friendly modals */
        .mobile-modal {
          margin: 1rem;
          max-height: calc(100vh - 2rem);
          border-radius: 20px;
        }
        
        /* Prevent double-tap zoom */
        input, select, textarea, button {
          touch-action: manipulation;
        }
        
        /* Better mobile scrolling */
        body {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        /* Reduce motion for better performance */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        document.head.removeChild(style);
      };
    }
  }, [isMobile]);

  return null;
}

// Hook for mobile-specific behavior
export function useMobileOptimizations() {
  const isMobile = useIsMobile();
  
  return {
    isMobile,
    cardClass: isMobile ? 'mobile-card' : '',
    textClass: isMobile ? 'mobile-text' : '',
    modalClass: isMobile ? 'mobile-modal' : '',
    buttonSize: isMobile ? 'lg' : 'default' as const,
    spacing: isMobile ? 'space-y-4' : 'space-y-6',
    padding: isMobile ? 'p-4' : 'p-6',
    margin: isMobile ? 'm-2' : 'm-4',
    touchTargetClass: isMobile ? 'min-h-[44px] min-w-[44px]' : '',
    gestureEnabled: isMobile,
  };
}

/**
 * Mobile Floating Action Button
 */
interface MobileFABProps {
  icon: React.ReactNode;
  onClick: () => void;
  label?: string;
  position?: 'bottom-right' | 'bottom-center' | 'bottom-left';
  className?: string;
}

export function MobileFAB({ 
  icon, 
  onClick, 
  label,
  position = 'bottom-right',
  className 
}: MobileFABProps) {
  const positionClasses = {
    'bottom-right': 'right-4',
    'bottom-center': 'left-1/2 -translate-x-1/2',
    'bottom-left': 'left-4',
  };

  return (
    <motion.button
      className={`fixed bottom-20 ${positionClasses[position]} z-40 
                  flex items-center gap-2 px-4 py-3 rounded-full
                  bg-primary text-primary-foreground shadow-lg
                  active:scale-95 transition-transform ${className}`}
      onClick={onClick}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
    >
      {icon}
      {label && <span className="text-sm font-medium">{label}</span>}
    </motion.button>
  );
}

/**
 * Mobile Action Sheet
 */
interface ActionSheetOption {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
}

interface MobileActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  options: ActionSheetOption[];
  title?: string;
}

export function MobileActionSheet({ 
  isOpen, 
  onClose, 
  options,
  title 
}: MobileActionSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl shadow-2xl 
                       safe-area-inset-bottom border-t"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
            </div>
            
            {title && (
              <div className="px-6 py-3 border-b text-center">
                <span className="text-sm font-medium text-muted-foreground">{title}</span>
              </div>
            )}
            
            <div className="p-2">
              {options.map((option, index) => (
                <motion.button
                  key={option.label}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl text-left
                             active:bg-muted/50 transition-colors
                             ${option.destructive ? 'text-danger-600' : 'text-foreground'}`}
                  onClick={() => {
                    option.onClick();
                    onClose();
                  }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {option.icon}
                  <span className="font-medium">{option.label}</span>
                </motion.button>
              ))}
            </div>
            
            <div className="p-2 border-t">
              <motion.button
                className="w-full p-4 rounded-xl text-center font-semibold
                           active:bg-muted/50 transition-colors"
                onClick={onClose}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Pull indicator for scrollable content
 */
interface ScrollIndicatorProps {
  direction: 'up' | 'down';
  visible: boolean;
}

export function ScrollIndicator({ direction, visible }: ScrollIndicatorProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className={`absolute ${direction === 'up' ? 'top-0' : 'bottom-0'} 
                      left-0 right-0 h-12 pointer-events-none z-30
                      bg-gradient-to-${direction === 'up' ? 'b' : 't'} 
                      from-background to-transparent`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className={`absolute ${direction === 'up' ? 'top-2' : 'bottom-2'} 
                        left-1/2 -translate-x-1/2`}
            animate={{ y: direction === 'up' ? [0, -4, 0] : [0, 4, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <div className={`w-8 h-1 rounded-full bg-muted-foreground/30 
                            ${direction === 'down' ? 'rotate-180' : ''}`} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}