import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { springConfigs } from '../../utils/animations';

/**
 * Secure Scene - Shield animation with privacy/security focus
 * Duration: 120 frames (4 seconds @ 30fps)
 * Mobile-optimized
 */
export const SecureScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Shield entrance animation
  const shieldScale = spring({
    frame: frame - 5,
    fps,
    from: 0,
    to: 1,
    config: { damping: 10, stiffness: 140 },
  });

  const shieldGlow = 0.3 + Math.sin(frame / 15) * 0.15;

  // Lock icon animation inside the shield
  const lockScale = spring({
    frame: frame - 18,
    fps,
    from: 0,
    to: 1,
    config: springConfigs.bouncy,
  });

  // Security features stagger in
  const features = [
    { icon: '🔒', text: 'End-to-end encryption', color: '#3b82f6' },
    { icon: '🇪🇺', text: 'GDPR compliant', color: '#8b5cf6' },
    { icon: '🛡️', text: 'Two-factor authentication', color: '#06b6d4' },
    { icon: '☁️', text: 'Secure cloud backup', color: '#22c55e' },
  ];

  // Orbiting particles around shield
  const orbitParticles = Array.from({ length: 6 }, (_, i) => {
    const angle = (i / 6) * Math.PI * 2 + frame * 0.03;
    const radius = 70;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius * 0.6;
    return { x, y, index: i };
  });

  // Checkmark animation at end
  const checkProgress = interpolate(frame, [90, 110], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(180deg, #0f172a 0%, #0c1a3d 50%, #1e1b4b 100%)',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: '"Inter", "DM Sans", system-ui, sans-serif',
      }}
    >
      {/* Background grid pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.03,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '30px 30px',
        }}
      />

      {/* Ambient glow behind shield */}
      <div
        style={{
          position: 'absolute',
          width: '250px',
          height: '250px',
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(59, 130, 246, ${shieldGlow * 0.5}) 0%, transparent 70%)`,
          top: '25%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          zIndex: 1,
        }}
      >
        {/* Shield icon with orbiting particles */}
        <div
          style={{
            position: 'relative',
            width: '160px',
            height: '160px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Orbiting particles */}
          {orbitParticles.map((p, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `calc(50% + ${p.x}px)`,
                top: `calc(50% + ${p.y}px)`,
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: i % 2 === 0 ? '#3b82f6' : '#8b5cf6',
                opacity: 0.5 + Math.sin(frame / 10 + i) * 0.3,
                boxShadow: `0 0 8px ${i % 2 === 0 ? '#3b82f6' : '#8b5cf6'}`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}

          {/* Shield shape */}
          <div
            style={{
              width: '90px',
              height: '100px',
              background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.05) 100%)',
              border: '2px solid rgba(59, 130, 246, 0.4)',
              borderRadius: '8px 8px 40px 40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: `scale(${shieldScale})`,
              boxShadow: `0 8px 40px rgba(59, 130, 246, ${shieldGlow}), inset 0 0 30px rgba(59, 130, 246, 0.1)`,
              backdropFilter: 'blur(10px)',
            }}
          >
            {/* Lock icon */}
            <div
              style={{
                fontSize: '36px',
                transform: `scale(${lockScale})`,
              }}
            >
              🔐
            </div>
          </div>
        </div>

        {/* Security features list */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            width: '260px',
          }}
        >
          {features.map((feat, i) => {
            const featScale = spring({
              frame: frame - 30 - i * 8,
              fps,
              from: 0.8,
              to: 1,
              config: springConfigs.snappy,
            });
            const featOpacity = interpolate(frame, [30 + i * 8, 42 + i * 8], [0, 1], {
              extrapolateRight: 'clamp',
            });
            const featX = spring({
              frame: frame - 30 - i * 8,
              fps,
              from: -20,
              to: 0,
              config: springConfigs.smooth,
            });

            const showCheck = frame > 70 + i * 6;
            const itemCheckScale = spring({
              frame: frame - (70 + i * 6),
              fps,
              from: 0,
              to: 1,
              config: { damping: 8, stiffness: 250 },
            });

            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '10px',
                  opacity: featOpacity,
                  transform: `translateX(${featX}px) scale(${featScale})`,
                }}
              >
                <div style={{ fontSize: '18px', flexShrink: 0 }}>{feat.icon}</div>
                <div style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>
                  {feat.text}
                </div>
                {showCheck && (
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: `${feat.color}22`,
                      border: `1px solid ${feat.color}44`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transform: `scale(${itemCheckScale})`,
                    }}
                  >
                    <span style={{ fontSize: '10px', color: feat.color, fontWeight: 800 }}>✓</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* "Your data is safe" badge */}
        {frame > 95 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.12), rgba(34, 197, 94, 0.06))',
              border: '1px solid rgba(34, 197, 94, 0.25)',
              transform: `scale(${spring({
                frame: frame - 95,
                fps,
                from: 0,
                to: 1,
                config: { damping: 10, stiffness: 180 },
              })})`,
            }}
          >
            <span style={{ fontSize: '12px' }}>✅</span>
            <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 600 }}>
              Your data is safe with us
            </span>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
