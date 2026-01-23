import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

interface KineticTextProps {
  text: string;
  style?: 'slide-up' | 'slide-left' | 'typewriter' | 'bounce' | 'glitch' | 'split';
  startFrame?: number;
  color?: string;
  fontSize?: number;
  fontWeight?: number;
  delay?: number;
  gradient?: string;
}

/**
 * KineticText - Animated text overlays for modern SaaS videos
 * Creates dynamic text animations for labels, titles, and callouts
 */
export const KineticText: React.FC<KineticTextProps> = ({
  text,
  style = 'slide-up',
  startFrame = 0,
  color = '#ffffff',
  fontSize = 24,
  fontWeight = 700,
  delay = 0,
  gradient,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = frame - startFrame - delay;

  if (adjustedFrame < 0) return null;

  const words = text.split(' ');
  
  const getAnimationStyle = () => {
    switch (style) {
      case 'slide-up': {
        const progress = spring({
          frame: adjustedFrame,
          fps,
          from: 0,
          to: 1,
          config: { damping: 12, stiffness: 150 },
        });
        return {
          opacity: progress,
          transform: `translateY(${(1 - progress) * 30}px)`,
        };
      }
      case 'slide-left': {
        const progress = spring({
          frame: adjustedFrame,
          fps,
          from: 0,
          to: 1,
          config: { damping: 15, stiffness: 120 },
        });
        return {
          opacity: progress,
          transform: `translateX(${(1 - progress) * 50}px)`,
        };
      }
      case 'bounce': {
        const progress = spring({
          frame: adjustedFrame,
          fps,
          from: 0,
          to: 1,
          config: { damping: 8, stiffness: 200 },
        });
        const scale = spring({
          frame: adjustedFrame,
          fps,
          from: 0.5,
          to: 1,
          config: { damping: 8, stiffness: 200 },
        });
        return {
          opacity: progress,
          transform: `scale(${scale})`,
        };
      }
      case 'glitch': {
        const progress = interpolate(adjustedFrame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
        const glitchX = adjustedFrame < 8 ? Math.sin(adjustedFrame * 10) * 3 : 0;
        const glitchY = adjustedFrame < 8 ? Math.cos(adjustedFrame * 8) * 2 : 0;
        return {
          opacity: progress,
          transform: `translate(${glitchX}px, ${glitchY}px)`,
          textShadow: adjustedFrame < 8 
            ? `2px 0 #ff0000, -2px 0 #00ffff`
            : 'none',
        };
      }
      case 'typewriter': {
        const charsToShow = Math.floor(adjustedFrame / 2);
        const displayText = text.substring(0, charsToShow);
        const cursor = adjustedFrame % 20 < 10 ? '|' : '';
        return {
          content: displayText + cursor,
        };
      }
      default:
        return { opacity: 1 };
    }
  };

  const animStyle = getAnimationStyle();

  // Handle typewriter separately
  if (style === 'typewriter') {
    const charsToShow = Math.floor(adjustedFrame / 2);
    const displayText = text.substring(0, charsToShow);
    const cursor = adjustedFrame % 20 < 10 ? '|' : '';
    
    return (
      <span
        style={{
          color,
          fontSize,
          fontWeight,
          fontFamily: '"Inter", "DM Sans", system-ui, sans-serif',
          background: gradient,
          backgroundClip: gradient ? 'text' : undefined,
          WebkitBackgroundClip: gradient ? 'text' : undefined,
          WebkitTextFillColor: gradient ? 'transparent' : undefined,
        }}
      >
        {displayText}
        <span style={{ opacity: 0.8 }}>{cursor}</span>
      </span>
    );
  }

  // Handle split animation (word by word)
  if (style === 'split') {
    return (
      <span style={{ display: 'inline-flex', gap: '8px' }}>
        {words.map((word, index) => {
          const wordProgress = spring({
            frame: adjustedFrame - index * 4,
            fps,
            from: 0,
            to: 1,
            config: { damping: 12, stiffness: 150 },
          });
          
          return (
            <span
              key={index}
              style={{
                color,
                fontSize,
                fontWeight,
                fontFamily: '"Inter", "DM Sans", system-ui, sans-serif',
                opacity: wordProgress,
                transform: `translateY(${(1 - wordProgress) * 20}px)`,
                display: 'inline-block',
                background: gradient,
                backgroundClip: gradient ? 'text' : undefined,
                WebkitBackgroundClip: gradient ? 'text' : undefined,
                WebkitTextFillColor: gradient ? 'transparent' : undefined,
              }}
            >
              {word}
            </span>
          );
        })}
      </span>
    );
  }

  return (
    <span
      style={{
        color,
        fontSize,
        fontWeight,
        fontFamily: '"Inter", "DM Sans", system-ui, sans-serif',
        display: 'inline-block',
        background: gradient,
        backgroundClip: gradient ? 'text' : undefined,
        WebkitBackgroundClip: gradient ? 'text' : undefined,
        WebkitTextFillColor: gradient ? 'transparent' : undefined,
        ...animStyle,
      }}
    >
      {text}
    </span>
  );
};
