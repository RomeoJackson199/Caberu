import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

/**
 * ProblemHookScenePro - Professional chaos montage (4 seconds)
 * Uses clean UI cards + typography instead of emoji spam
 * Modern SaaS style: dark, intense, but polished
 */
export const ProblemHookScenePro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Subtle shake that increases
  const shakeIntensity = interpolate(frame, [0, 60], [0, 1], { extrapolateRight: 'clamp' });
  const shakeX = Math.sin(frame * 2.5) * 4 * shakeIntensity;
  const shakeY = Math.cos(frame * 2) * 3 * shakeIntensity;

  // Problems as clean notification cards
  const notifications = [
    { text: 'Missed call from Patient #247', time: '2 min ago', type: 'error' as const, delay: 0 },
    { text: 'Double booking: Dr. Peters at 14:00', time: '5 min ago', type: 'warning' as const, delay: 8 },
    { text: 'Patient complaint: 45min wait time', time: '12 min ago', type: 'error' as const, delay: 16 },
    { text: 'Insurance form incomplete - Vanderberg', time: '18 min ago', type: 'warning' as const, delay: 24 },
    { text: 'Staff overtime alert: 3 employees', time: '22 min ago', type: 'error' as const, delay: 32 },
    { text: 'Missed call from Patient #189', time: '25 min ago', type: 'error' as const, delay: 38 },
  ];

  const typeColors = {
    error: { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.4)', dot: '#ef4444' },
    warning: { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.4)', dot: '#f59e0b' },
  };

  // Red pulse overlay
  const warningPulse = Math.sin(frame / 3) * 0.08 + 0.12;

  // Zoom in slightly
  const zoomScale = interpolate(frame, [0, 40], [1.05, 1], { extrapolateRight: 'clamp' });

  // Fade out
  const fadeOut = interpolate(frame, [100, 120], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Counter animation for missed calls stat
  const missedCalls = Math.round(
    interpolate(frame, [50, 90], [0, 47], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  );

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #0f0f12 0%, #0a0a0e 50%, #0f0f12 100%)',
        fontFamily: '"Inter", "SF Pro Display", system-ui, sans-serif',
        opacity: fadeOut,
        transform: `scale(${zoomScale})`,
      }}
    >
      {/* Grid pattern background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          opacity: 0.6,
        }}
      />

      {/* Red warning pulse overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% 40%, rgba(220, 38, 38, ${warningPulse}) 0%, transparent 60%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Main content area with shake */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translate(${shakeX}px, ${shakeY}px)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Left side - Dashboard mockup with chaos */}
        <div
          style={{
            width: '55%',
            height: '80%',
            background: 'rgba(15, 23, 42, 0.6)',
            borderRadius: '16px',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            padding: '24px',
            position: 'relative',
            overflow: 'hidden',
            marginLeft: '5%',
          }}
        >
          {/* Mock header bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '20px',
              paddingBottom: '16px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }} />
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b' }} />
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#22c55e' }} />
            <div style={{ flex: 1 }} />
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', fontWeight: 500 }}>
              Practice Dashboard
            </span>
          </div>

          {/* Notification stack */}
          {notifications.map((notif, i) => {
            const scale = spring({
              frame: frame - notif.delay,
              fps,
              from: 0,
              to: 1,
              config: { damping: 10, stiffness: 200 },
            });

            const slideX = spring({
              frame: frame - notif.delay,
              fps,
              from: -40,
              to: 0,
              config: { damping: 12, stiffness: 150 },
            });

            const colors = typeColors[notif.type];

            return (
              <div
                key={i}
                style={{
                  marginBottom: '10px',
                  padding: '14px 18px',
                  background: colors.bg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  opacity: scale,
                  transform: `translateX(${slideX}px) scale(${0.95 + scale * 0.05})`,
                }}
              >
                {/* Status dot */}
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: colors.dot,
                    boxShadow: `0 0 8px ${colors.dot}`,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: 600 }}>
                    {notif.text}
                  </div>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', flexShrink: 0 }}>
                  {notif.time}
                </span>
              </div>
            );
          })}

          {/* Red scan line */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: '2px',
              background: 'linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.6), transparent)',
              top: `${(frame * 3) % 110}%`,
              opacity: 0.5,
            }}
          />
        </div>

        {/* Right side - Stats and text */}
        <div
          style={{
            width: '35%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '40px',
            marginLeft: '5%',
          }}
        >
          {/* Big stat */}
          <div
            style={{
              textAlign: 'center',
              opacity: spring({
                frame: frame - 30,
                fps,
                from: 0,
                to: 1,
                config: { damping: 15 },
              }),
              transform: `scale(${spring({
                frame: frame - 30,
                fps,
                from: 0.8,
                to: 1,
                config: { damping: 12, stiffness: 150 },
              })})`,
            }}
          >
            <div
              style={{
                fontSize: '120px',
                fontWeight: 800,
                color: '#ef4444',
                lineHeight: 1,
                letterSpacing: '-6px',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {missedCalls}%
            </div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.6)',
                marginTop: '8px',
                letterSpacing: '0.05em',
              }}
            >
              of calls go unanswered
            </div>
          </div>

          {/* Question text */}
          <div
            style={{
              opacity: spring({
                frame: frame - 55,
                fps,
                from: 0,
                to: 1,
                config: { damping: 20 },
              }),
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '42px',
                fontWeight: 700,
                color: 'white',
                lineHeight: 1.2,
              }}
            >
              Sound familiar?
            </div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 500,
                color: 'rgba(255,255,255,0.4)',
                marginTop: '12px',
              }}
            >
              Your practice deserves better.
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
