import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';

interface HeroSceneProps {
  title: string;
}

export const HeroScene: React.FC<HeroSceneProps> = ({ title }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo animation
  const logoScale = spring({
    frame: frame - 10,
    fps,
    config: {
      damping: 100,
    },
  });

  const logoOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Title animation
  const titleOpacity = interpolate(frame, [30, 50], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const titleY = interpolate(frame, [30, 50], [50, 0], {
    extrapolateRight: 'clamp',
  });

  // Subtitle animation
  const subtitleOpacity = interpolate(frame, [50, 70], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const subtitleY = interpolate(frame, [50, 70], [30, 0], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Animated background circles */}
      <div
        style={{
          position: 'absolute',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.1)',
          top: '-200px',
          right: '-200px',
          opacity: interpolate(frame, [0, 60], [0, 0.5]),
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.1)',
          bottom: '-100px',
          left: '-100px',
          opacity: interpolate(frame, [0, 60], [0, 0.3]),
        }}
      />

      {/* Logo/Icon */}
      <div
        style={{
          fontSize: '120px',
          marginBottom: '40px',
          transform: `scale(${logoScale})`,
          opacity: logoOpacity,
        }}
      >
        🦷
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: '80px',
          fontWeight: 'bold',
          color: 'white',
          textAlign: 'center',
          marginBottom: '20px',
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
        }}
      >
        Caberu
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontSize: '36px',
          color: 'rgba(255, 255, 255, 0.9)',
          textAlign: 'center',
          maxWidth: '900px',
          lineHeight: 1.5,
          opacity: subtitleOpacity,
          transform: `translateY(${subtitleY}px)`,
        }}
      >
        {title}
      </div>

      {/* Tagline */}
      <div
        style={{
          fontSize: '28px',
          color: 'rgba(255, 255, 255, 0.8)',
          textAlign: 'center',
          marginTop: '30px',
          opacity: interpolate(frame, [80, 100], [0, 1], {
            extrapolateRight: 'clamp',
          }),
        }}
      >
        AI-Powered Dental Practice Management
      </div>
    </AbsoluteFill>
  );
};
