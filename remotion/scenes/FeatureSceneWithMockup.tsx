import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from 'remotion';

interface FeatureSceneWithMockupProps {
  title: string;
  description: string;
  mockup: React.FC;
}

export const FeatureSceneWithMockup: React.FC<FeatureSceneWithMockupProps> = ({
  title,
  description,
  mockup: MockupComponent,
}) => {
  const frame = useCurrentFrame();

  const { fps } = useVideoConfig();

  // Fade in from black
  const fadeIn = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Title animation with spring
  const titleOpacity = interpolate(frame, [5, 22], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const titleY = interpolate(frame, [5, 22], [60, 0], {
    extrapolateRight: 'clamp',
  });

  const titleScale = interpolate(frame, [5, 22], [0.9, 1], {
    extrapolateRight: 'clamp',
  });

  // Mockup animation with smooth entrance
  const mockupOpacity = interpolate(frame, [12, 32], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const mockupScale = interpolate(frame, [12, 35], [0.85, 1], {
    extrapolateRight: 'clamp',
  });

  const mockupY = interpolate(frame, [12, 32], [40, 0], {
    extrapolateRight: 'clamp',
  });

  // Description animation
  const descOpacity = interpolate(frame, [28, 43], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const descY = interpolate(frame, [28, 43], [30, 0], {
    extrapolateRight: 'clamp',
  });

  // Fade out animation - smoother and earlier
  const fadeOut = interpolate(frame, [100, 118], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1a1f35 50%, #1E293B 100%)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        opacity: fadeOut * fadeIn,
        padding: '60px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {/* Animated background particles */}
      <div
        style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1), transparent)',
          top: '-100px',
          right: '-100px',
          opacity: interpolate(frame, [0, 40], [0, 0.5]),
          transform: `translateY(${Math.sin(frame / 20) * 10}px)`,
        }}
      />

      {/* Title with enhanced styling */}
      <div
        style={{
          fontSize: '60px',
          fontWeight: 'bold',
          background: 'linear-gradient(to right, #ffffff, #e0e7ff)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textAlign: 'center',
          marginBottom: '50px',
          opacity: titleOpacity,
          transform: `translateY(${titleY}px) scale(${titleScale})`,
          letterSpacing: '-1px',
          textShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        }}
      >
        {title}
      </div>

      {/* Mockup with smoother entrance */}
      <div
        style={{
          opacity: mockupOpacity,
          transform: `scale(${mockupScale}) translateY(${mockupY}px)`,
          marginBottom: '40px',
          filter: `drop-shadow(0 20px 40px rgba(0, 0, 0, 0.4))`,
        }}
      >
        <MockupComponent />
      </div>

      {/* Description with enhanced styling */}
      <div
        style={{
          fontSize: '34px',
          color: 'rgba(255, 255, 255, 0.9)',
          textAlign: 'center',
          maxWidth: '850px',
          lineHeight: 1.5,
          opacity: descOpacity,
          transform: `translateY(${descY}px)`,
          fontWeight: '400',
          textShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
        }}
      >
        {description}
      </div>
    </AbsoluteFill>
  );
};
