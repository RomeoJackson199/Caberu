import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

interface SpeedLinesProps {
  direction?: 'horizontal' | 'vertical' | 'radial';
  color?: string;
  intensity?: number;
  startFrame?: number;
  duration?: number;
}

/**
 * SpeedLines - Creates motion blur/speed line effects for transitions
 * Adds energy and momentum to scene changes
 */
export const SpeedLines: React.FC<SpeedLinesProps> = ({
  direction = 'horizontal',
  color = 'rgba(255, 255, 255, 0.1)',
  intensity = 1,
  startFrame = 0,
  duration = 15,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = frame - startFrame;

  if (adjustedFrame < 0 || adjustedFrame > duration) return null;

  const progress = adjustedFrame / duration;
  const opacity = Math.sin(progress * Math.PI) * intensity;

  const lines = Array.from({ length: 20 }, (_, i) => ({
    offset: (i / 20) * 100,
    width: 2 + Math.random() * 4,
    speed: 0.5 + Math.random() * 0.5,
  }));

  if (direction === 'radial') {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        {lines.map((line, i) => {
          const angle = (i / lines.length) * 360;
          const length = interpolate(adjustedFrame, [0, duration], [0, 800]);
          
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: `${length}px`,
                height: `${line.width}px`,
                background: `linear-gradient(90deg, ${color}, transparent)`,
                transform: `rotate(${angle}deg)`,
                transformOrigin: '0 50%',
                opacity: opacity * line.speed,
              }}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {lines.map((line, i) => {
        const movement = interpolate(adjustedFrame, [0, duration], [0, 2000 * line.speed]);
        
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              ...(direction === 'horizontal' 
                ? {
                    top: `${line.offset}%`,
                    left: 0,
                    right: 0,
                    height: `${line.width}px`,
                    background: `linear-gradient(90deg, transparent, ${color} 30%, ${color} 70%, transparent)`,
                    transform: `translateX(${movement}px)`,
                  }
                : {
                    left: `${line.offset}%`,
                    top: 0,
                    bottom: 0,
                    width: `${line.width}px`,
                    background: `linear-gradient(180deg, transparent, ${color} 30%, ${color} 70%, transparent)`,
                    transform: `translateY(${movement}px)`,
                  }
              ),
              opacity: opacity * line.speed,
            }}
          />
        );
      })}
    </div>
  );
};
