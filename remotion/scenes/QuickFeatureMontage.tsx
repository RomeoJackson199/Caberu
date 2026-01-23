import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

/**
 * Compact feature card for grid layout
 */
const CompactFeatureCard: React.FC<{
  icon: string;
  title: string;
  gradient: string;
  delay: number;
}> = ({ icon, title, gradient, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame: frame - delay,
    fps,
    from: 0.5,
    to: 1,
    config: { damping: 10, stiffness: 180 },
  });

  const opacity = spring({
    frame: frame - delay,
    fps,
    from: 0,
    to: 1,
    config: { damping: 12, stiffness: 150 },
  });

  return (
    <div
      style={{
        padding: '24px 28px',
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
        borderRadius: '20px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        transform: `scale(${scale})`,
        opacity,
        boxShadow: '0 15px 40px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        alignItems: 'center',
        gap: '18px',
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '14px',
          background: gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.25)',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ color: '#ffffff', fontSize: '18px', fontWeight: '600' }}>
        {title}
      </div>
    </div>
  );
};

export const QuickFeatureMontage: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Expanded feature list - 10 features total
  const allFeatures = [
    { icon: '🔔', title: 'Smart Reminders', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
    { icon: '📊', title: 'Live Analytics', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' },
    { icon: '🔒', title: 'HIPAA Compliant', gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' },
    { icon: '📝', title: 'Digital Forms', gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' },
    { icon: '💳', title: 'Easy Payments', gradient: 'linear-gradient(135deg, #ec4899 0%, #d946ef 100%)' },
    { icon: '🎙️', title: 'Voice Notes', gradient: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)' },
    { icon: '📱', title: 'Mobile App (PWA)', gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' },
    { icon: '🤖', title: 'AI Assistant', gradient: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)' },
    { icon: '📞', title: 'AI Voice Calls', gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' },
    { icon: '🏢', title: 'Multi-Location', gradient: 'linear-gradient(135deg, #64748b 0%, #475569 100%)' },
  ];

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: '"DM Sans", system-ui, sans-serif',
      }}
    >
      {/* Animated background */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: `
            radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.1) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.08) 0%, transparent 40%)
          `,
        }}
      />

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => {
        const x = (i * 350 + 100) % 1920;
        const y = Math.sin((frame + i * 30) / 20) * 30 + (i * 180) % 1080;
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
              background: i % 2 === 0 ? '#3b82f6' : '#8b5cf6',
              opacity,
              boxShadow: `0 0 10px ${i % 2 === 0 ? '#3b82f6' : '#8b5cf6'}`,
            }}
          />
        );
      })}

      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            color: '#ffffff',
            fontSize: '52px',
            fontWeight: '700',
            letterSpacing: '-1px',
            opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          Everything You Need
        </div>
        <div
          style={{
            color: '#94a3b8',
            fontSize: '24px',
            marginTop: '12px',
            opacity: interpolate(frame, [5, 20], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          Built for modern dental practices
        </div>
      </div>

      {/* Feature grid - 2 columns, 5 rows */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 340px)',
          gap: '16px',
          marginTop: '100px',
        }}
      >
        {allFeatures.map((feature, index) => (
          <CompactFeatureCard
            key={index}
            icon={feature.icon}
            title={feature.title}
            gradient={feature.gradient}
            delay={10 + index * 4}
          />
        ))}
      </div>

      {/* Bottom text */}
      <div
        style={{
          position: 'absolute',
          bottom: '60px',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
          opacity: spring({
            frame: frame - 60,
            fps,
            from: 0,
            to: 1,
            config: { damping: 15 },
          }),
        }}
      >
        <div
          style={{
            padding: '14px 32px',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
            borderRadius: '50px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: 'white',
            fontSize: '18px',
            fontWeight: '600',
            backdropFilter: 'blur(10px)',
          }}
        >
          + Many more features included
        </div>
      </div>
    </AbsoluteFill>
  );
};
