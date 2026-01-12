import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/use-haptics';

export interface SegmentedControlOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  value,
  onChange,
  className,
  size = 'md',
  fullWidth = false,
}) => {
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const haptics = useHaptics();

  const sizeClasses = {
    sm: 'h-8 text-sm',
    md: 'h-10 text-base',
    lg: 'h-12 text-lg',
  };

  const paddingClasses = {
    sm: 'p-1',
    md: 'p-1.5',
    lg: 'p-2',
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const selectedIndex = options.findIndex((opt) => opt.value === value);
    const selectedButton = containerRef.current.children[selectedIndex + 1] as HTMLElement;

    if (selectedButton) {
      setIndicatorStyle({
        left: selectedButton.offsetLeft,
        width: selectedButton.offsetWidth,
      });
    }
  }, [value, options]);

  const handleChange = (newValue: string) => {
    const option = options.find((opt) => opt.value === newValue);
    if (option?.disabled) return;

    haptics.selection();
    onChange(newValue);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative backdrop-blur-xl bg-gray-200/80 dark:bg-gray-800/80 rounded-xl inline-flex items-center',
        sizeClasses[size],
        paddingClasses[size],
        fullWidth && 'w-full',
        className
      )}
    >
      {/* Animated indicator */}
      <motion.div
        className="absolute backdrop-blur-xl bg-white dark:bg-gray-700 rounded-lg shadow-md border border-gray-300/50 dark:border-gray-600/50"
        style={{
          height: `calc(100% - ${size === 'sm' ? '8px' : size === 'md' ? '12px' : '16px'})`,
        }}
        animate={indicatorStyle}
        transition={{
          type: 'spring',
          damping: 25,
          stiffness: 400,
        }}
      />

      {/* Options */}
      {options.map((option) => {
        const isSelected = option.value === value;

        return (
          <button
            key={option.value}
            onClick={() => handleChange(option.value)}
            disabled={option.disabled}
            className={cn(
              'relative z-10 flex items-center justify-center gap-2 px-4 font-medium transition-colors rounded-lg',
              fullWidth && 'flex-1',
              isSelected
                ? 'text-gray-900 dark:text-gray-100'
                : 'text-gray-600 dark:text-gray-400',
              option.disabled && 'opacity-40 cursor-not-allowed'
            )}
          >
            {option.icon && (
              <span className="w-4 h-4 flex items-center justify-center">
                {option.icon}
              </span>
            )}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default SegmentedControl;
