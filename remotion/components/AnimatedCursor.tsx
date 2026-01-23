import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

interface CursorPosition {
  x: number;
  y: number;
  frame: number;
}

interface AnimatedCursorProps {
  positions: CursorPosition[];
  clickFrames?: number[];
  startFrame?: number;
  size?: number;
}

export const AnimatedCursor: React.FC<AnimatedCursorProps> = ({
  positions,
  clickFrames = [],
  startFrame = 0,
  size = 28,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = frame - startFrame;

  if (adjustedFrame < 0 || positions.length === 0) return null;

  // Find current position based on frame with smoother spring interpolation
  let currentX = positions[0].x;
  let currentY = positions[0].y;

  for (let i = 0; i < positions.length - 1; i++) {
    const current = positions[i];
    const next = positions[i + 1];

    if (adjustedFrame >= current.frame && adjustedFrame <= next.frame) {
      // Enhanced spring physics for more natural movement
      const progress = spring({
        frame: adjustedFrame - current.frame,
        fps,
        config: {
          damping: 22,
          stiffness: 140,
          mass: 0.6,
        },
        durationInFrames: next.frame - current.frame,
      });

      currentX = interpolate(progress, [0, 1], [current.x, next.x]);
      currentY = interpolate(progress, [0, 1], [current.y, next.y]);
      break;
    } else if (adjustedFrame > next.frame) {
      currentX = next.x;
      currentY = next.y;
    }
  }

  // Check if we're in a click animation - extended duration for visibility
  const clickDuration = 18;
  const isClicking = clickFrames.some(
    (clickFrame) => adjustedFrame >= clickFrame && adjustedFrame <= clickFrame + clickDuration
  );

  // Get click animation progress for all active clicks
  let clickProgress = 0;
  let activeClickFrame = 0;
  clickFrames.forEach((clickFrame) => {
    if (adjustedFrame >= clickFrame && adjustedFrame <= clickFrame + clickDuration) {
      const progress = (adjustedFrame - clickFrame) / clickDuration;
      clickProgress = Math.sin(progress * Math.PI);
      activeClickFrame = clickFrame;
    }
  });

  const cursorScale = 1 - clickProgress * 0.2;

  // Primary ripple - larger and more visible
  const rippleScale = 1 + clickProgress * 2.5;
  const rippleOpacity = (1 - clickProgress) * 0.7;

  // Secondary outer ring - delayed for nice effect
  const outerRingProgress = Math.max(0, clickProgress - 0.2) / 0.8;
  const outerRingScale = 1 + outerRingProgress * 4;
  const outerRingOpacity = outerRingProgress > 0 ? (1 - outerRingProgress) * 0.4 : 0;

  // Glow effect on click
  const glowIntensity = clickProgress * 0.8;

  return (
    <>
      {/* Outer ring effect - secondary ripple */}
      {isClicking && (
        <div
          style={{
            position: 'absolute',
            left: currentX - 50,
            top: currentY - 50,
            width: 100,
            height: 100,
            borderRadius: '50%',
            border: '2px solid rgba(59, 130, 246, 0.4)',
            transform: `scale(${outerRingScale})`,
            opacity: outerRingOpacity,
            pointerEvents: 'none',
            zIndex: 9998,
          }}
        />
      )}

      {/* Primary click ripple effect - more prominent */}
      {isClicking && (
        <div
          style={{
            position: 'absolute',
            left: currentX - 40,
            top: currentY - 40,
            width: 80,
            height: 80,
            borderRadius: '50%',
            border: '3px solid rgba(59, 130, 246, 0.7)',
            background: `radial-gradient(circle, rgba(59, 130, 246, ${0.35 * rippleOpacity}) 0%, transparent 70%)`,
            transform: `scale(${rippleScale})`,
            opacity: rippleOpacity,
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        />
      )}

      {/* Click glow effect */}
      {isClicking && (
        <div
          style={{
            position: 'absolute',
            left: currentX - 25,
            top: currentY - 25,
            width: 50,
            height: 50,
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(59, 130, 246, ${glowIntensity}) 0%, transparent 60%)`,
            filter: 'blur(8px)',
            pointerEvents: 'none',
            zIndex: 9997,
          }}
        />
      )}

      {/* Cursor */}
      <div
        style={{
          position: 'absolute',
          left: currentX,
          top: currentY,
          width: 0,
          height: 0,
          transform: `scale(${cursorScale})`,
          pointerEvents: 'none',
          zIndex: 10001,
          filter: `drop-shadow(0 3px 6px rgba(0, 0, 0, 0.4))${isClicking ? ' drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))' : ''}`,
        }}
      >
        {/* Modern cursor SVG - slightly larger */}
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          style={{
            transform: 'translate(-2px, -2px)',
          }}
        >
          <path
            d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L6.35 2.85a.5.5 0 0 0-.85.36Z"
            fill="#ffffff"
            stroke="#1e293b"
            strokeWidth="1.8"
          />
          {/* Add subtle highlight for depth */}
          <path
            d="M6.5 4.5V18l3.5-3.5h5.5"
            fill="none"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="0.5"
          />
        </svg>
      </div>

      {/* Click indicator dot - appears briefly at click point */}
      {isClicking && clickProgress < 0.5 && (
        <div
          style={{
            position: 'absolute',
            left: currentX - 4,
            top: currentY - 4,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#3b82f6',
            opacity: 1 - clickProgress * 2,
            pointerEvents: 'none',
            zIndex: 10002,
          }}
        />
      )}
    </>
  );
};
