import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Sequence } from 'remotion';

const FeatureCard: React.FC<{
  icon: string;
  title: string;
  description: string;
  gradient: string;
  delay: number;
}> = ({ icon, title, description, gradient, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame: frame - delay,
    fps,
    from: 0.6,
    to: 1,
    config: { damping: 12, stiffness: 200 },
  });

  const opacity = interpolate(frame, [delay, delay + 10], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const exitOpacity = interpolate(frame, [delay + 35, delay + 45], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        width: '350px',
        padding: '35px',
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
        borderRadius: '24px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        transform: `scale(${scale})`,
        opacity: opacity * exitOpacity,
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      }}
    >
      <div
        style={{
          width: '70px',
          height: '70px',
          borderRadius: '18px',
          background: gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px',
          marginBottom: '20px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
        }}
      >
        {icon}
      </div>
      <div style={{ color: '#ffffff', fontSize: '24px', fontWeight: '700', marginBottom: '10px' }}>
        {title}
      </div>
      <div style={{ color: '#94a3b8', fontSize: '16px', lineHeight: 1.5 }}>
        {description}
      </div>
    </div>
  );
};

export const QuickFeatureMontage: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const features = [
    [
      { icon: '🔔', title: 'Smart Reminders', description: 'Auto-send appointment reminders via SMS, email & WhatsApp', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
      { icon: '📊', title: 'Live Analytics', description: 'Real-time insights on revenue, bookings & patient retention', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' },
      { icon: '🔒', title: 'HIPAA Compliant', description: 'Enterprise-grade security for all patient data', gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' },
    ],
    [
      { icon: '📝', title: 'Digital Forms', description: 'Patients fill forms online before arrival', gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' },
      { icon: '💳', title: 'Easy Payments', description: 'Accept payments online with automatic invoicing', gradient: 'linear-gradient(135deg, #ec4899 0%, #d946ef 100%)' },
      { icon: '🎙️', title: 'Voice Notes', description: 'AI transcribes clinical notes from voice', gradient: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)' },
    ],
  ];

  // Determine which set of features to show
  const setIndex = Math.floor(frame / 60) % 2;
  const localFrame = frame % 60;

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

      {/* Feature cards */}
      <div
        style={{
          display: 'flex',
          gap: '30px',
          marginTop: '80px',
        }}
      >
        {features[setIndex].map((feature, index) => (
          <FeatureCard
            key={`${setIndex}-${index}`}
            icon={feature.icon}
            title={feature.title}
            description={feature.description}
            gradient={feature.gradient}
            delay={index * 8}
          />
        ))}
      </div>

      {/* Progress dots */}
      <div
        style={{
          position: 'absolute',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '12px',
        }}
      >
        {[0, 1].map((i) => (
          <div
            key={i}
            style={{
              width: i === setIndex ? '32px' : '12px',
              height: '12px',
              borderRadius: '6px',
              background: i === setIndex
                ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
                : 'rgba(255, 255, 255, 0.2)',
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};
