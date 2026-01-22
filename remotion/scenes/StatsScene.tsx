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

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      {/* Title */}
      <div
        style={{
          fontSize: '60px',
          fontWeight: 'bold',
          color: 'white',
          textAlign: 'center',
          marginBottom: '80px',
          opacity: interpolate(frame, [0, 20], [0, 1], {
            extrapolateRight: 'clamp',
          }),
        }}
      >
        Proven Results
      </div>

      {/* Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '60px',
          maxWidth: '1400px',
          padding: '0 80px',
        }}
      >
        {stats.map((stat, index) => {
          const delay = index * 15;
          const scale = spring({
            frame: frame - delay - 10,
            fps,
            config: {
              damping: 100,
            },
          });

          const opacity = interpolate(
            frame,
            [delay, delay + 20],
            [0, 1],
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
                padding: '40px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '20px',
                border: '2px solid rgba(255, 255, 255, 0.1)',
                transform: `scale(${scale})`,
                opacity,
              }}
            >
              <div
                style={{
                  fontSize: '80px',
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  marginBottom: '20px',
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: '28px',
                  color: 'rgba(255, 255, 255, 0.8)',
                  textAlign: 'center',
                }}
              >
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontSize: '32px',
          color: 'rgba(255, 255, 255, 0.7)',
          textAlign: 'center',
          marginTop: '80px',
          opacity: interpolate(frame, [60, 80], [0, 1], {
            extrapolateRight: 'clamp',
          }),
        }}
      >
        Join hundreds of dental practices transforming their operations
      </div>
    </AbsoluteFill>
  );
};
