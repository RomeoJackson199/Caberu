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

  // Title animation
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const titleY = interpolate(frame, [0, 20], [50, 0], {
    extrapolateRight: 'clamp',
  });

  // Mockup animation
  const mockupOpacity = interpolate(frame, [10, 30], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const mockupScale = interpolate(frame, [10, 35], [0.8, 1], {
    extrapolateRight: 'clamp',
  });

  // Description animation
  const descOpacity = interpolate(frame, [25, 40], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Fade out animation
  const fadeOut = interpolate(frame, [95, 115], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        opacity: fadeOut,
        padding: '60px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Title */}
      <div
        style={{
          fontSize: '56px',
          fontWeight: 'bold',
          color: 'white',
          textAlign: 'center',
          marginBottom: '40px',
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
        }}
      >
        {title}
      </div>

      {/* Mockup */}
      <div
        style={{
          opacity: mockupOpacity,
          transform: `scale(${mockupScale})`,
          marginBottom: '30px',
        }}
      >
        <MockupComponent />
      </div>

      {/* Description */}
      <div
        style={{
          fontSize: '32px',
          color: 'rgba(255, 255, 255, 0.8)',
          textAlign: 'center',
          maxWidth: '800px',
          lineHeight: 1.5,
          opacity: descOpacity,
        }}
      >
        {description}
      </div>
    </AbsoluteFill>
  );
};
