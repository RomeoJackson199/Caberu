/**
 * Centralized Animation Presets
 * Reduces framer-motion bundle impact by providing reusable animation configs
 */

// Simple fade animation
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

// Slide up with fade
export const slideUp = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: -20, opacity: 0 },
};

// Slide down with fade
export const slideDown = {
  initial: { y: -20, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: 20, opacity: 0 },
};

// Slide in from right
export const slideInRight = {
  initial: { x: 20, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: -20, opacity: 0 },
};

// Slide in from left
export const slideInLeft = {
  initial: { x: -20, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: 20, opacity: 0 },
};

// Scale with fade
export const scaleIn = {
  initial: { scale: 0.95, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.95, opacity: 0 },
};

// Pop in effect
export const popIn = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.8, opacity: 0 },
};

// Stagger container for children animations
export const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

// Stagger item (use with staggerContainer)
export const staggerItem = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1 },
};

// Spring transition presets
export const springTransition = {
  type: 'spring',
  damping: 25,
  stiffness: 300,
};

export const gentleSpring = {
  type: 'spring',
  damping: 30,
  stiffness: 200,
};

export const bouncySpring = {
  type: 'spring',
  damping: 15,
  stiffness: 400,
};

// Duration presets
export const durations = {
  fast: 0.15,
  normal: 0.3,
  slow: 0.5,
};

// Page transition variants
export const pageTransition = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.2 },
};

// List item hover
export const listItemHover = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
};

// Button press
export const buttonPress = {
  whileTap: { scale: 0.95 },
};

// Card hover
export const cardHover = {
  whileHover: { y: -4, boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)' },
};
