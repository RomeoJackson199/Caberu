import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform, Variants } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface LiquidGlassProps {
  children: React.ReactNode;
  className?: string;
  intensity?: 'light' | 'medium' | 'strong' | 'ultra';
  variant?: 'default' | 'frosted' | 'vibrant' | 'tinted';
  interactive?: boolean;
  glow?: boolean;
  borderGlow?: boolean;
  animated?: boolean;
  tintColor?: string;
}

export const LiquidGlass = ({
  children,
  className,
  intensity = 'medium',
  variant = 'default',
  interactive = false,
  glow = false,
  borderGlow = false,
  animated = true,
  tintColor,
}: LiquidGlassProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isTouched, setIsTouched] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 300 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [5, -5]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-5, 5]), springConfig);

  useEffect(() => {
    if (!interactive || !ref.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      mouseX.set(x);
      mouseY.set(y);
    };

    const element = ref.current;
    element.addEventListener('mousemove', handleMouseMove);
    return () => element.removeEventListener('mousemove', handleMouseMove);
  }, [interactive, mouseX, mouseY]);

  const intensityClasses = {
    light: 'backdrop-blur-sm',
    medium: 'backdrop-blur-md',
    strong: 'backdrop-blur-xl',
    ultra: 'backdrop-blur-3xl',
  };

  const variantClasses = {
    default: 'bg-white/30 dark:bg-black/30 border-white/20 dark:border-white/10',
    frosted: 'bg-white/40 dark:bg-gray-900/40 border-white/30 dark:border-white/20',
    vibrant: 'bg-gradient-to-br from-white/50 via-white/30 to-white/20 dark:from-purple-900/30 dark:via-blue-900/20 dark:to-black/20 border-white/40',
    tinted: `bg-gradient-to-br ${tintColor || 'from-blue-500/20 via-purple-500/10 to-pink-500/20'} border-white/30`,
  };

  const glowClasses = glow
    ? 'shadow-[0_0_40px_rgba(255,255,255,0.1)] dark:shadow-[0_0_40px_rgba(139,92,246,0.2)]'
    : '';

  const borderGlowClasses = borderGlow
    ? 'before:absolute before:inset-0 before:rounded-[inherit] before:p-[1px] before:bg-gradient-to-br before:from-white/50 before:via-white/20 before:to-transparent before:-z-10 before:blur-sm'
    : '';

  const animationVariants: Variants = {
    initial: { opacity: 0, scale: 0.95, y: 10 },
    animate: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        damping: 20,
        stiffness: 300,
      },
    },
    hover: interactive
      ? {
          scale: 1.02,
          transition: {
            type: 'spring' as const,
            damping: 15,
            stiffness: 400,
          },
        }
      : {},
    tap: interactive
      ? {
          scale: 0.98,
          transition: {
            type: 'spring' as const,
            damping: 20,
            stiffness: 400,
          },
        }
      : {},
  };

  return (
    <motion.div
      ref={ref}
      className={cn(
        'relative rounded-2xl border overflow-hidden',
        intensityClasses[intensity],
        variantClasses[variant],
        glowClasses,
        borderGlowClasses,
        interactive && 'cursor-pointer transform-gpu',
        className
      )}
      initial={animated ? 'initial' : false}
      animate={animated ? 'animate' : false}
      whileHover={interactive ? 'hover' : undefined}
      whileTap={interactive ? 'tap' : undefined}
      style={
        interactive
          ? {
              rotateX,
              rotateY,
              transformStyle: 'preserve-3d',
            }
          : undefined
      }
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        mouseX.set(0);
        mouseY.set(0);
      }}
      onTouchStart={() => setIsTouched(true)}
      onTouchEnd={() => setIsTouched(false)}
      variants={animationVariants}
    >
      {/* Shimmer overlay for interactive mode */}
      {interactive && (isHovered || isTouched) && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>

      {/* Noise texture for glass effect */}
      <div
        className="absolute inset-0 opacity-[0.015] pointer-events-none mix-blend-soft-light"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </motion.div>
  );
};

export interface LiquidGlassCardProps extends LiquidGlassProps {
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

export const LiquidGlassCard = ({
  children,
  padding = 'md',
  ...props
}: LiquidGlassCardProps) => {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
  };

  return (
    <LiquidGlass {...props}>
      <div className={paddingClasses[padding]}>{children}</div>
    </LiquidGlass>
  );
};

export interface LiquidGlassButtonProps {
  children?: React.ReactNode;
  variant?: 'default' | 'frosted' | 'vibrant';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export const LiquidGlassButton = ({
  children,
  variant = 'default',
  size = 'md',
  fullWidth = false,
  leftIcon,
  rightIcon,
  className,
  disabled,
  onClick,
  type = 'button',
}: LiquidGlassButtonProps) => {
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <motion.button
      type={type}
      className={cn(
        'relative rounded-xl font-medium backdrop-blur-xl border transition-all duration-200',
        'active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
        'flex items-center justify-center gap-2',
        sizeClasses[size],
        fullWidth && 'w-full',
        variant === 'default' &&
          'bg-white/30 dark:bg-black/30 border-white/20 hover:bg-white/40 dark:hover:bg-black/40',
        variant === 'frosted' &&
          'bg-white/50 dark:bg-gray-900/50 border-white/30 hover:bg-white/60 dark:hover:bg-gray-900/60',
        variant === 'vibrant' &&
          'bg-gradient-to-br from-blue-500/40 via-purple-500/30 to-pink-500/40 border-white/40 hover:from-blue-500/50 hover:via-purple-500/40 hover:to-pink-500/50',
        className
      )}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      disabled={disabled}
      onClick={onClick}
    >
      {leftIcon && <span>{leftIcon}</span>}
      <span>{children}</span>
      {rightIcon && <span>{rightIcon}</span>}
    </motion.button>
  );
};
