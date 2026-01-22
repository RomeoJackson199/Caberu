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
  size = 24,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = frame - startFrame;

  if (adjustedFrame < 0 || positions.length === 0) return null;

  // Find current position based on frame
  let currentX = positions[0].x;
  let currentY = positions[0].y;

  for (let i = 0; i < positions.length - 1; i++) {
    const current = positions[i];
    const next = positions[i + 1];

    if (adjustedFrame >= current.frame && adjustedFrame <= next.frame) {
      // Smooth spring-based interpolation between positions
      const progress = spring({
        frame: adjustedFrame - current.frame,
        fps,
        config: {
          damping: 28,
          stiffness: 180,
          mass: 0.8,
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

  // Check if we're in a click animation
  const isClicking = clickFrames.some(
    (clickFrame) => adjustedFrame >= clickFrame && adjustedFrame <= clickFrame + 12
  );

  const clickProgress = clickFrames.reduce((acc, clickFrame) => {
    if (adjustedFrame >= clickFrame && adjustedFrame <= clickFrame + 12) {
      const progress = (adjustedFrame - clickFrame) / 12;
      return Math.sin(progress * Math.PI);
    }
    return acc;
  }, 0);

  const cursorScale = 1 - clickProgress * 0.15;
  const rippleScale = clickProgress * 2;
  const rippleOpacity = 1 - clickProgress;

  return (
    <>
      {/* Click ripple effect */}
      {isClicking && (
        <div
          style={{
            position: 'absolute',
            left: currentX - 30,
            top: currentY - 30,
            width: 60,
            height: 60,
            borderRadius: '50%',
            border: '3px solid rgba(59, 130, 246, 0.6)',
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)',
            transform: `scale(${rippleScale})`,
            opacity: rippleOpacity,
            pointerEvents: 'none',
            zIndex: 10000,
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
          filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))',
        }}
      >
        {/* Modern cursor SVG */}
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
            strokeWidth="1.5"
          />
        </svg>
      </div>
    </>
  );
};
