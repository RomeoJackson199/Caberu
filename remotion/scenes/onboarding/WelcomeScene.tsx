import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { colors, springConfigs } from '../../utils/animations';

/**
 * Welcome Scene - Logo reveal with particles converging
 * Duration: 120 frames (4 seconds @ 30fps)
 * Mobile-optimized: Designed for portrait display
 */
export const WelcomeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo entrance
  const logoScale = spring({
    frame: frame - 5,
    fps,
    from: 0,
    to: 1,
    config: { damping: 10, stiffness: 160 },
  });

  const logoRotate = spring({
    frame: frame - 5,
    fps,
    from: -180,
    to: 0,
    config: { damping: 14, stiffness: 100 },
  });

  const logoGlow = 0.4 + Math.sin(frame / 12) * 0.2;

  // Title animation
  const titleOpacity = interpolate(frame, [20, 35], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const titleY = spring({
    frame: frame - 20,
    fps,
    from: 40,
    to: 0,
    config: springConfigs.smooth,
  });

  // Tagline animation
  const taglineOpacity = interpolate(frame, [40, 55], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const taglineY = spring({
    frame: frame - 40,
    fps,
    from: 30,
    to: 0,
    config: springConfigs.smooth,
  });

  // Floating particles
  const particles = Array.from({ length: 20 }, (_, i) => {
    const angle = (i / 20) * Math.PI * 2;
    const radius = 120 + Math.sin(frame / 20 + i) * 30;
    const x = Math.cos(angle + frame * 0.01) * radius;
    const y = Math.sin(angle + frame * 0.01) * radius;
    const size = 3 + Math.sin(frame / 10 + i * 2) * 2;
    const opacity = 0.2 + Math.sin(frame / 15 + i) * 0.15;
    const particleColors = [colors.primary, colors.secondary, colors.accent];
    return { x, y, size, opacity, color: particleColors[i % 3] };
  });

  // Accent ring that expands
  const ringScale = spring({
    frame: frame - 10,
    fps,
    from: 0,
    to: 1,
    config: { damping: 20, stiffness: 80 },
  });
  const ringOpacity = interpolate(frame, [10, 30, 80, 110], [0, 0.3, 0.3, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: '"Inter", "DM Sans", system-ui, sans-serif',
      }}
    >
      {/* Ambient gradient orbs */}
      <div
        style={{
          position: 'absolute',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%)',
          top: '5%',
          right: '-10%',
          transform: `scale(${1 + Math.sin(frame / 25) * 0.1})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '250px',
          height: '250px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
          bottom: '10%',
          left: '-5%',
          transform: `scale(${1 + Math.sin((frame + 15) / 20) * 0.1})`,
        }}
      />

      {/* Floating particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `calc(50% + ${p.x}px)`,
            top: `calc(45% + ${p.y}px)`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: '50%',
            background: p.color,
            opacity: p.opacity,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
          }}
        />
      ))}

      {/* Expanding ring behind logo */}
      <div
        style={{
          position: 'absolute',
          top: '45%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${ringScale})`,
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          border: '2px solid rgba(59, 130, 246, 0.3)',
          opacity: ringOpacity,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '45%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${ringScale * 1.5})`,
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          opacity: ringOpacity * 0.6,
        }}
      />

      {/* Main content */}
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
            width: '100px',
            height: '100px',
            borderRadius: '28px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '52px',
            marginBottom: '28px',
            transform: `scale(${logoScale}) rotate(${logoRotate}deg)`,
            boxShadow: `0 16px 48px rgba(59, 130, 246, ${logoGlow}), 0 0 80px rgba(59, 130, 246, ${logoGlow * 0.4})`,
            border: '2px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          🦷
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: '52px',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 50%, #c7d2fe 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-2px',
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            marginBottom: '12px',
          }}
        >
          Caberu
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: '18px',
            fontWeight: 500,
            color: 'rgba(255, 255, 255, 0.8)',
            opacity: taglineOpacity,
            transform: `translateY(${taglineY}px)`,
            textAlign: 'center',
            maxWidth: '280px',
            lineHeight: 1.5,
          }}
        >
          Your dental health, simplified
        </div>
      </div>

      {/* Bottom gradient line */}
      <div
        style={{
          position: 'absolute',
          bottom: '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: interpolate(frame, [50, 80], [0, 120], { extrapolateRight: 'clamp' }),
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #3b82f6, #8b5cf6, transparent)',
          borderRadius: '1px',
        }}
      />
    </AbsoluteFill>
  );
};
