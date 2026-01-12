import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

export type TransitionType =
  | 'slide'
  | 'fade'
  | 'scale'
  | 'slideUp'
  | 'slideDown'
  | 'zoomFade'
  | 'liquidGlass';

export interface PageTransitionProps {
  children: React.ReactNode;
  type?: TransitionType;
  duration?: number;
  className?: string;
}

const transitions = {
  slide: {
    initial: { x: '100%', opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: '-100%', opacity: 0 },
  },
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  scale: {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 1.1, opacity: 0 },
  },
  slideUp: {
    initial: { y: '100%', opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: '-100%', opacity: 0 },
  },
  slideDown: {
    initial: { y: '-100%', opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: '100%', opacity: 0 },
  },
  zoomFade: {
    initial: { scale: 0.8, opacity: 0, filter: 'blur(10px)' },
    animate: { scale: 1, opacity: 1, filter: 'blur(0px)' },
    exit: { scale: 1.2, opacity: 0, filter: 'blur(10px)' },
  },
  liquidGlass: {
    initial: {
      scale: 0.95,
      opacity: 0,
      filter: 'blur(20px) brightness(1.2)',
      backdropFilter: 'blur(0px)',
    },
    animate: {
      scale: 1,
      opacity: 1,
      filter: 'blur(0px) brightness(1)',
      backdropFilter: 'blur(20px)',
    },
    exit: {
      scale: 1.05,
      opacity: 0,
      filter: 'blur(20px) brightness(0.8)',
      backdropFilter: 'blur(0px)',
    },
  },
};

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  type = 'liquidGlass',
  duration = 0.4,
  className,
}) => {
  const location = useLocation();
  const transition = transitions[type];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={transition.initial}
        animate={transition.animate}
        exit={transition.exit}
        transition={{
          type: 'spring',
          damping: 25,
          stiffness: 300,
          duration,
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export interface AnimatedPageProps {
  children: React.ReactNode;
  className?: string;
}

export const AnimatedPage: React.FC<AnimatedPageProps> = ({
  children,
  className,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        type: 'spring',
        damping: 25,
        stiffness: 300,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
