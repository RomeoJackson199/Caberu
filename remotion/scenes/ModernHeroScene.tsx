import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const ModernHeroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo animation with bounce
  const logoScale = spring({
    frame: frame - 5,
    fps,
    from: 0,
    to: 1,
    config: { damping: 10, stiffness: 150 },
  });

  const logoRotate = spring({
    frame: frame - 5,
    fps,
    from: -180,
    to: 0,
    config: { damping: 15, stiffness: 100 },
  });

  // Title animation
  const titleOpacity = interpolate(frame, [15, 30], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const titleY = spring({
    frame: frame - 15,
    fps,
    from: 60,
    to: 0,
    config: { damping: 18, stiffness: 80 },
  });

  // Subtitle animation
  const subtitleOpacity = interpolate(frame, [30, 45], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const subtitleY = spring({
    frame: frame - 30,
    fps,
    from: 40,
    to: 0,
    config: { damping: 18, stiffness: 80 },
  });

  // Feature pills
  const features = ['AI-Powered', '24/7 Automation', 'HIPAA Compliant'];

  // Fade out for transition
  const fadeOut = interpolate(frame, [75, 90], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #312e81 100%)',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: '"DM Sans", system-ui, sans-serif',
        opacity: fadeOut,
      }}
    >
      {/* Animated background elements */}
      <div
        style={{
          position: 'absolute',
          width: '1000px',
          height: '1000px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 60%)',
          top: '-300px',
          right: '-300px',
          transform: `scale(${1 + Math.sin(frame / 30) * 0.1})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '800px',
          height: '800px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 60%)',
          bottom: '-200px',
          left: '-200px',
          transform: `scale(${1 + Math.sin((frame + 20) / 25) * 0.08})`,
        }}
      />

      {/* Floating particles */}
      {[...Array(8)].map((_, i) => {
        const x = (i * 250) % 1920;
        const y = Math.sin((frame + i * 30) / 20) * 30 + (i * 135) % 1080;
        const opacity = 0.1 + Math.sin((frame + i * 20) / 15) * 0.05;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#3b82f6',
              opacity,
              boxShadow: '0 0 10px #3b82f6',
            }}
          />
        );
      })}

      {/* Content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 1,
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: '130px',
            height: '130px',
            borderRadius: '32px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '70px',
            marginBottom: '40px',
            transform: `scale(${logoScale}) rotate(${logoRotate}deg)`,
            boxShadow: '0 20px 60px rgba(59, 130, 246, 0.4)',
            border: '3px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          🦷
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: '100px',
            fontWeight: '800',
            background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 50%, #c7d2fe 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '20px',
            letterSpacing: '-4px',
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            textShadow: '0 4px 30px rgba(0, 0, 0, 0.3)',
          }}
        >
          Caberu
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: '36px',
            color: 'rgba(255, 255, 255, 0.9)',
            marginBottom: '45px',
            fontWeight: '500',
            opacity: subtitleOpacity,
            transform: `translateY(${subtitleY}px)`,
          }}
        >
          AI-Powered Dental Practice Management
        </div>

        {/* Feature pills */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
          }}
        >
          {features.map((feature, index) => {
            const pillOpacity = spring({
              frame: frame - 45 - index * 5,
              fps,
              config: { damping: 12, stiffness: 200 },
            });

            const pillScale = spring({
              frame: frame - 45 - index * 5,
              fps,
              from: 0.5,
              to: 1,
              config: { damping: 10, stiffness: 250 },
            });

            return (
              <div
                key={index}
                style={{
                  padding: '14px 28px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '50px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: '600',
                  opacity: pillOpacity,
                  transform: `scale(${pillScale})`,
                  backdropFilter: 'blur(10px)',
                }}
              >
                {feature}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
