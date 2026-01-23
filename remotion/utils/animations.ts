import { Easing, interpolate } from 'remotion';

/**
 * Premium Animation Utilities for Caberu Marketing Video
 * Inspired by: Linear, Vercel, Stripe, Arc Browser
 */

// Spring physics configurations
export const springConfigs = {
  snappy: { damping: 15, stiffness: 200 },
  smooth: { damping: 25, stiffness: 100 },
  bouncy: { damping: 10, stiffness: 150 },
  gentle: { damping: 30, stiffness: 80 },
  default: { damping: 20, stiffness: 120 },
};

// Custom easing functions
export const easings = {
  // Premium ease-out for modern SaaS feel
  premium: Easing.bezier(0.16, 1, 0.3, 1),
  // Smooth ease for camera movements
  smooth: Easing.bezier(0.4, 0, 0.2, 1),
  // Snappy ease for UI elements
  snappy: Easing.bezier(0.34, 1.56, 0.64, 1),
  // Soft ease for fades
  soft: Easing.bezier(0.25, 0.1, 0.25, 1),
  // Power ease for dramatic effects
  power: Easing.bezier(0.7, 0, 0.84, 0),
};

// Color palette
export const colors = {
  // Primary brand colors
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  accent: '#06b6d4',

  // Background colors
  bgDark: '#0a0a0f',
  bgNavy: '#0f172a',
  bgPurple: '#1e1b4b',

  // Gradients
  gradientBlue: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
  gradientPurple: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
  gradientCyan: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
  gradientMixed: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%)',

  // Text colors
  textWhite: '#ffffff',
  textMuted: 'rgba(255, 255, 255, 0.7)',
  textDim: 'rgba(255, 255, 255, 0.5)',

  // Glassmorphism
  glassWhite: 'rgba(255, 255, 255, 0.05)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
};

// Stagger animation helper
export const stagger = (
  frame: number,
  index: number,
  startFrame: number,
  staggerDelay: number = 3
) => {
  return frame - startFrame - index * staggerDelay;
};

// Fade in/out helper
export const fade = (
  frame: number,
  fadeInStart: number,
  fadeInEnd: number,
  fadeOutStart: number,
  fadeOutEnd: number
) => {
  const fadeIn = interpolate(frame, [fadeInStart, fadeInEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const fadeOut = interpolate(frame, [fadeOutStart, fadeOutEnd], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return Math.min(fadeIn, fadeOut);
};

// Scale with opacity helper (common animation pattern)
export const scaleWithOpacity = (
  frame: number,
  startFrame: number,
  duration: number = 15,
  fromScale: number = 0.8
) => {
  const progress = interpolate(
    frame,
    [startFrame, startFrame + duration],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: easings.premium,
    }
  );

  return {
    opacity: progress,
    scale: fromScale + (1 - fromScale) * progress,
  };
};

// Slide animation helper
export const slide = (
  frame: number,
  startFrame: number,
  duration: number = 20,
  direction: 'up' | 'down' | 'left' | 'right' = 'up',
  distance: number = 50
) => {
  const progress = interpolate(
    frame,
    [startFrame, startFrame + duration],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: easings.premium,
    }
  );

  const offset = distance * (1 - progress);

  switch (direction) {
    case 'up':
      return { x: 0, y: offset };
    case 'down':
      return { x: 0, y: -offset };
    case 'left':
      return { x: offset, y: 0 };
    case 'right':
      return { x: -offset, y: 0 };
  }
};

// 3D Camera position helper
export const orbit = (
  frame: number,
  startFrame: number,
  duration: number,
  radius: number = 5,
  height: number = 2,
  startAngle: number = 0,
  endAngle: number = Math.PI * 0.5
) => {
  const angle = interpolate(
    frame,
    [startFrame, startFrame + duration],
    [startAngle, endAngle],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: easings.smooth,
    }
  );

  return {
    x: Math.sin(angle) * radius,
    y: height,
    z: Math.cos(angle) * radius,
  };
};

// Particle system configuration
export const particleConfig = {
  count: 50,
  size: { min: 0.02, max: 0.08 },
  speed: { min: 0.001, max: 0.003 },
  colors: ['#3b82f6', '#8b5cf6', '#06b6d4', '#ffffff'],
  opacity: { min: 0.3, max: 0.8 },
};

// Generate random particles
export const generateParticles = (count: number, bounds: { x: number; y: number; z: number }) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    position: [
      (Math.random() - 0.5) * bounds.x * 2,
      (Math.random() - 0.5) * bounds.y * 2,
      (Math.random() - 0.5) * bounds.z * 2,
    ] as [number, number, number],
    size: particleConfig.size.min + Math.random() * (particleConfig.size.max - particleConfig.size.min),
    speed: particleConfig.speed.min + Math.random() * (particleConfig.speed.max - particleConfig.speed.min),
    color: particleConfig.colors[Math.floor(Math.random() * particleConfig.colors.length)],
    phase: Math.random() * Math.PI * 2,
  }));
};

// Counter animation helper
export const animateCounter = (
  frame: number,
  startFrame: number,
  duration: number,
  startValue: number,
  endValue: number
) => {
  const progress = interpolate(
    frame,
    [startFrame, startFrame + duration],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: easings.premium,
    }
  );

  return Math.round(startValue + (endValue - startValue) * progress);
};

// Text reveal helper (for kinetic typography)
export const revealText = (
  frame: number,
  startFrame: number,
  charCount: number,
  duration: number = 30
) => {
  const progress = interpolate(
    frame,
    [startFrame, startFrame + duration],
    [0, charCount],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: easings.smooth,
    }
  );

  return Math.floor(progress);
};
