import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

interface FeatureHighlightProps {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  startFrame?: number;
  style?: 'pulse' | 'spotlight' | 'outline' | 'glow';
}

/**
 * FeatureHighlight - Highlights UI elements during screen demos
 * Creates attention-grabbing effects on specific features
 */
export const FeatureHighlight: React.FC<FeatureHighlightProps> = ({
  x,
  y,
  width,
  height,
  label,
  startFrame = 0,
  style = 'pulse',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = frame - startFrame;

  if (adjustedFrame < 0) return null;

  const opacity = spring({
    frame: adjustedFrame,
    fps,
    from: 0,
    to: 1,
    config: { damping: 15, stiffness: 100 },
  });

  const renderHighlight = () => {
    switch (style) {
      case 'pulse': {
        const pulseScale = 1 + Math.sin(adjustedFrame / 8) * 0.05;
        const pulseOpacity = 0.5 + Math.sin(adjustedFrame / 8) * 0.3;
        
        return (
          <>
            {/* Outer pulse ring */}
            <div
              style={{
                position: 'absolute',
                left: x - 10,
                top: y - 10,
                width: width + 20,
                height: height + 20,
                border: '3px solid rgba(59, 130, 246, 0.6)',
                borderRadius: '12px',
                transform: `scale(${pulseScale})`,
                opacity: pulseOpacity * opacity,
                boxShadow: '0 0 30px rgba(59, 130, 246, 0.4)',
              }}
            />
            {/* Inner highlight */}
            <div
              style={{
                position: 'absolute',
                left: x,
                top: y,
                width,
                height,
                background: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '8px',
                opacity: opacity,
              }}
            />
          </>
        );
      }
      case 'spotlight': {
        return (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(circle at ${x + width / 2}px ${y + height / 2}px, transparent ${Math.max(width, height) / 2}px, rgba(0, 0, 0, 0.7) ${Math.max(width, height)}px)`,
              opacity: opacity,
              pointerEvents: 'none',
            }}
          />
        );
      }
      case 'outline': {
        const dashOffset = adjustedFrame * 2;
        
        return (
          <svg
            style={{
              position: 'absolute',
              left: x - 5,
              top: y - 5,
              width: width + 10,
              height: height + 10,
              overflow: 'visible',
              opacity: opacity,
              pointerEvents: 'none',
            }}
          >
            <rect
              x="2"
              y="2"
              width={width + 6}
              height={height + 6}
              rx="8"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="3"
              strokeDasharray="10 5"
              strokeDashoffset={dashOffset}
            />
          </svg>
        );
      }
      case 'glow': {
        const glowIntensity = 0.5 + Math.sin(adjustedFrame / 10) * 0.3;
        
        return (
          <div
            style={{
              position: 'absolute',
              left: x - 20,
              top: y - 20,
              width: width + 40,
              height: height + 40,
              borderRadius: '16px',
              background: `radial-gradient(circle, rgba(139, 92, 246, ${glowIntensity * 0.4}) 0%, transparent 70%)`,
              opacity: opacity,
              pointerEvents: 'none',
            }}
          />
        );
      }
      default:
        return null;
    }
  };

  return (
    <>
      {renderHighlight()}
      {label && (
        <div
          style={{
            position: 'absolute',
            left: x + width / 2,
            top: y - 40,
            transform: 'translateX(-50%)',
            padding: '8px 16px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            borderRadius: '20px',
            color: 'white',
            fontSize: '14px',
            fontWeight: '600',
            fontFamily: '"Inter", system-ui, sans-serif',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)',
            opacity: spring({
              frame: adjustedFrame - 10,
              fps,
              from: 0,
              to: 1,
              config: { damping: 15 },
            }),
            zIndex: 1000,
          }}
        >
          {label}
        </div>
      )}
    </>
  );
};
