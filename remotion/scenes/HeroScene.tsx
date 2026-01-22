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

  // Logo animation with bounce
  const logoScale = spring({
    frame: frame - 10,
    fps,
    config: {
      damping: 12,
      stiffness: 100,
      mass: 0.5,
    },
  });

  const logoOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const logoRotate = spring({
    frame: frame - 10,
    fps,
    from: -180,
    to: 0,
    config: {
      damping: 20,
    },
  });

  // Title animation with smooth slide
  const titleOpacity = interpolate(frame, [25, 45], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const titleY = spring({
    frame: frame - 25,
    fps,
    from: 80,
    to: 0,
    config: {
      damping: 20,
      stiffness: 80,
    },
  });

  const titleScale = spring({
    frame: frame - 25,
    fps,
    from: 0.8,
    to: 1,
    config: {
      damping: 15,
    },
  });

  // Subtitle animation
  const subtitleOpacity = interpolate(frame, [45, 65], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const subtitleY = spring({
    frame: frame - 45,
    fps,
    from: 50,
    to: 0,
    config: {
      damping: 20,
    },
  });

  // Tagline animation
  const taglineOpacity = interpolate(frame, [70, 90], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const taglineScale = interpolate(frame, [70, 90], [0.9, 1], {
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
      {/* Animated background circles with floating effect */}
      <div
        style={{
          position: 'absolute',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.05))',
          top: '-200px',
          right: '-200px',
          opacity: interpolate(frame, [0, 60], [0, 0.6]),
          transform: `translateY(${Math.sin(frame / 30) * 20}px) scale(${interpolate(frame, [0, 60], [0.8, 1])})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.03))',
          bottom: '-100px',
          left: '-100px',
          opacity: interpolate(frame, [0, 60], [0, 0.4]),
          transform: `translateY(${Math.sin((frame + 45) / 25) * 15}px) scale(${interpolate(frame, [0, 60], [0.8, 1])})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.1), transparent)',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${interpolate(frame, [0, 70], [0, 1.5])})`,
          opacity: interpolate(frame, [0, 50, 70], [0, 0.3, 0]),
        }}
      />

      {/* Logo/Icon with 3D effect */}
      <div
        style={{
          fontSize: '120px',
          marginBottom: '40px',
          transform: `scale(${logoScale}) rotate(${logoRotate}deg)`,
          opacity: logoOpacity,
          filter: `drop-shadow(0 10px 30px rgba(0, 0, 0, 0.3))`,
        }}
      >
        🦷
      </div>

      {/* Title with gradient and shadow */}
      <div
        style={{
          fontSize: '80px',
          fontWeight: 'bold',
          background: 'linear-gradient(to right, #ffffff, #e0e7ff)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textAlign: 'center',
          marginBottom: '20px',
          opacity: titleOpacity,
          transform: `translateY(${titleY}px) scale(${titleScale})`,
          filter: 'drop-shadow(0 4px 20px rgba(0, 0, 0, 0.2))',
          letterSpacing: '-2px',
        }}
      >
        Caberu
      </div>

      {/* Subtitle with smooth entrance */}
      <div
        style={{
          fontSize: '36px',
          color: 'rgba(255, 255, 255, 0.95)',
          textAlign: 'center',
          maxWidth: '900px',
          lineHeight: 1.5,
          opacity: subtitleOpacity,
          transform: `translateY(${subtitleY}px)`,
          fontWeight: '500',
        }}
      >
        {title}
      </div>

      {/* Tagline with scale animation */}
      <div
        style={{
          fontSize: '28px',
          color: 'rgba(255, 255, 255, 0.85)',
          textAlign: 'center',
          marginTop: '30px',
          opacity: taglineOpacity,
          transform: `scale(${taglineScale})`,
          fontWeight: '300',
        }}
      >
        AI-Powered Dental Practice Management
      </div>

      {/* Animated shine effect */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)',
          transform: `translateX(${interpolate(frame, [100, 130], [0, 300], { extrapolateRight: 'clamp' })}%)`,
        }}
      />
    </AbsoluteFill>
  );
};
