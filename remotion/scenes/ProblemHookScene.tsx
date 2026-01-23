import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

/**
 * ProblemHookScene - Quick chaos montage showing the problems before Caberu
 * Shows: phone ringing, missed appointments, paper chaos, frustrated receptionist
 */
export const ProblemHookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Shake effect for chaos
  const shakeX = Math.sin(frame * 2) * 3;
  const shakeY = Math.cos(frame * 1.5) * 2;

  // Problems appearing
  const problems = [
    { icon: '📞', text: 'Missed Calls', delay: 0 },
    { icon: '📅', text: 'No-Shows', delay: 8 },
    { icon: '📝', text: 'Paper Chaos', delay: 16 },
    { icon: '😤', text: 'Frustrated Staff', delay: 24 },
  ];

  // Red warning overlay pulse
  const warningPulse = Math.sin(frame / 4) * 0.1 + 0.15;

  // Transition out
  const fadeOut = interpolate(frame, [45, 60], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f1a 100%)',
        fontFamily: '"DM Sans", system-ui, sans-serif',
        opacity: fadeOut,
      }}
    >
      {/* Red warning overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `rgba(220, 38, 38, ${warningPulse})`,
          pointerEvents: 'none',
        }}
      />

      {/* Chaos elements flying around */}
      <div
        style={{
          position: 'absolute',
          transform: `translate(${shakeX}px, ${shakeY}px)`,
          width: '100%',
          height: '100%',
        }}
      >
        {/* Phone ringing animation */}
        <div
          style={{
            position: 'absolute',
            left: '15%',
            top: '20%',
            fontSize: '80px',
            transform: `rotate(${Math.sin(frame * 3) * 15}deg)`,
            filter: 'drop-shadow(0 0 20px rgba(239, 68, 68, 0.5))',
          }}
        >
          📞
        </div>

        {/* Calendar with X marks */}
        <div
          style={{
            position: 'absolute',
            right: '20%',
            top: '25%',
            fontSize: '70px',
            opacity: interpolate(frame, [5, 15], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          📅❌
        </div>

        {/* Papers flying */}
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${20 + i * 15}%`,
              top: `${30 + Math.sin(frame / 10 + i) * 20}%`,
              fontSize: '40px',
              transform: `rotate(${frame * 2 + i * 30}deg)`,
              opacity: 0.6,
            }}
          >
            📄
          </div>
        ))}

        {/* Stressed receptionist */}
        <div
          style={{
            position: 'absolute',
            left: '45%',
            bottom: '30%',
            fontSize: '100px',
            transform: `scale(${1 + Math.sin(frame / 5) * 0.05})`,
          }}
        >
          🤯
        </div>
      </div>

      {/* Problem cards appearing */}
      <div
        style={{
          position: 'absolute',
          bottom: '15%',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '24px',
        }}
      >
        {problems.map((problem, index) => {
          const scale = spring({
            frame: frame - problem.delay,
            fps,
            from: 0,
            to: 1,
            config: { damping: 10, stiffness: 200 },
          });

          const opacity = interpolate(frame, [problem.delay, problem.delay + 10], [0, 1], {
            extrapolateRight: 'clamp',
          });

          return (
            <div
              key={index}
              style={{
                padding: '16px 24px',
                background: 'rgba(220, 38, 38, 0.2)',
                border: '2px solid rgba(220, 38, 38, 0.5)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transform: `scale(${scale})`,
                opacity,
                boxShadow: '0 0 30px rgba(220, 38, 38, 0.3)',
              }}
            >
              <span style={{ fontSize: '28px' }}>{problem.icon}</span>
              <span style={{ color: '#fca5a5', fontSize: '18px', fontWeight: '600' }}>
                {problem.text}
              </span>
            </div>
          );
        })}
      </div>

      {/* "Sound familiar?" text */}
      <div
        style={{
          position: 'absolute',
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
          opacity: spring({
            frame: frame - 30,
            fps,
            from: 0,
            to: 1,
            config: { damping: 15 },
          }),
        }}
      >
        <div
          style={{
            fontSize: '48px',
            fontWeight: '700',
            color: '#ffffff',
            textShadow: '0 0 20px rgba(220, 38, 38, 0.5)',
          }}
        >
          Sound familiar?
        </div>
      </div>
    </AbsoluteFill>
  );
};
