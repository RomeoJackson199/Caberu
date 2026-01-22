import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';

export const StatsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stats = [
    { value: '50%', label: 'Reduced No-Shows' },
    { value: '3x', label: 'Faster Scheduling' },
    { value: '99.9%', label: 'Uptime' },
    { value: '24/7', label: 'AI Support' },
  ];

  const fadeIn = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [100, 118], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1a1f35 50%, #1E293B 100%)',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        opacity: fadeIn * fadeOut,
        position: 'relative',
      }}
    >
      {/* Background particles */}
      <div
        style={{
          position: 'absolute',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08), transparent)',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${interpolate(frame, [0, 60], [0.5, 1.5])})`,
          opacity: interpolate(frame, [0, 40, 80], [0, 0.5, 0]),
        }}
      />

      {/* Title with enhanced animation */}
      <div
        style={{
          fontSize: '64px',
          fontWeight: 'bold',
          background: 'linear-gradient(to right, #ffffff, #e0e7ff)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textAlign: 'center',
          marginBottom: '90px',
          letterSpacing: '-1px',
          opacity: interpolate(frame, [0, 22], [0, 1], {
            extrapolateRight: 'clamp',
          }),
          transform: `translateY(${interpolate(frame, [0, 22], [40, 0], { extrapolateRight: 'clamp' })}px)`,
        }}
      >
        ⚡ Proven Results
      </div>

      {/* Stats Grid with enhanced styling */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '50px',
          maxWidth: '1500px',
          padding: '0 80px',
        }}
      >
        {stats.map((stat, index) => {
          const delay = index * 12;
          const scale = spring({
            frame: frame - delay - 15,
            fps,
            config: {
              damping: 15,
              stiffness: 100,
            },
          });

          const opacity = interpolate(
            frame,
            [15 + delay, 30 + delay],
            [0, 1],
            {
              extrapolateRight: 'clamp',
            }
          );

          const y = interpolate(
            frame,
            [15 + delay, 30 + delay],
            [50, 0],
            {
              extrapolateRight: 'clamp',
            }
          );

          return (
            <div
              key={index}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '48px 36px',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(30, 64, 175, 0.05))',
                borderRadius: '24px',
                border: '2px solid rgba(59, 130, 246, 0.2)',
                boxShadow: '0 10px 40px rgba(59, 130, 246, 0.15)',
                transform: `scale(${scale}) translateY(${y}px)`,
                opacity,
              }}
            >
              <div
                style={{
                  fontSize: '88px',
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  marginBottom: '24px',
                  letterSpacing: '-2px',
                  textShadow: '0 0 30px rgba(59, 130, 246, 0.5)',
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: '26px',
                  color: 'rgba(255, 255, 255, 0.9)',
                  textAlign: 'center',
                  fontWeight: '600',
                  lineHeight: 1.3,
                }}
              >
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Subtitle with enhanced animation */}
      <div
        style={{
          fontSize: '34px',
          color: 'rgba(255, 255, 255, 0.85)',
          textAlign: 'center',
          marginTop: '90px',
          fontWeight: '400',
          maxWidth: '900px',
          lineHeight: 1.4,
          opacity: interpolate(frame, [65, 85], [0, 1], {
            extrapolateRight: 'clamp',
          }),
          transform: `translateY(${interpolate(frame, [65, 85], [30, 0], { extrapolateRight: 'clamp' })}px)`,
        }}
      >
        Join hundreds of dental practices transforming their operations
      </div>
    </AbsoluteFill>
  );
};
