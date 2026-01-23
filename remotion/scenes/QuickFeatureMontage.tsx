import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { KineticText } from '../components/KineticText';
import { SpeedLines } from '../components/SpeedLines';

/**
 * Compact feature card with enhanced animation
 */
const CompactFeatureCard: React.FC<{
  icon: string;
  title: string;
  gradient: string;
  delay: number;
  index: number;
}> = ({ icon, title, gradient, delay, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame: frame - delay,
    fps,
    from: 0.3,
    to: 1,
    config: { damping: 8, stiffness: 200 },
  });

  const opacity = spring({
    frame: frame - delay,
    fps,
    from: 0,
    to: 1,
    config: { damping: 10, stiffness: 180 },
  });

  // Stagger from alternating sides
  const slideX = spring({
    frame: frame - delay,
    fps,
    from: index % 2 === 0 ? -50 : 50,
    to: 0,
    config: { damping: 12, stiffness: 150 },
  });

  // Subtle hover effect
  const hoverScale = 1 + Math.sin((frame + index * 10) / 20) * 0.02;

  return (
    <div
      style={{
        padding: '22px 26px',
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.04) 100%)',
        borderRadius: '18px',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        transform: `scale(${scale * hoverScale}) translateX(${slideX}px)`,
        opacity,
        boxShadow: '0 15px 50px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '14px',
          background: gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '26px',
          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ color: '#ffffff', fontSize: '17px', fontWeight: '600' }}>
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

  // Zoom effect on grid
  const gridScale = interpolate(frame, [0, 20], [1.1, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: '"DM Sans", system-ui, sans-serif',
      }}
    >
      {/* Speed lines on entrance */}
      <SpeedLines
        direction="radial"
        color="rgba(59, 130, 246, 0.1)"
        intensity={0.5}
        startFrame={0}
        duration={18}
      />

      {/* Animated background */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: `
            radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.12) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.1) 0%, transparent 40%)
          `,
        }}
      />

      {/* Floating particles - enhanced */}
      {[...Array(10)].map((_, i) => {
        const x = (i * 200 + 80) % 1920;
        const y = Math.sin((frame + i * 25) / 18) * 35 + (i * 120) % 1080;
        const opacity = 0.12 + Math.sin((frame + i * 18) / 14) * 0.06;
        const scale = 0.7 + Math.sin((frame + i * 8) / 12) * 0.4;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: i % 2 === 0 ? '#3b82f6' : '#8b5cf6',
              opacity,
              transform: `scale(${scale})`,
              boxShadow: `0 0 ${10 + scale * 6}px ${i % 2 === 0 ? '#3b82f6' : '#8b5cf6'}`,
            }}
          />
        );
      })}

      {/* Title with kinetic text */}
      <div
        style={{
          position: 'absolute',
          top: '70px',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
        }}
      >
        <KineticText
          text="Everything You Need"
          style="split"
          startFrame={0}
          fontSize={54}
          fontWeight={700}
          color="#ffffff"
        />
        <div
          style={{
            color: '#94a3b8',
            fontSize: '23px',
            marginTop: '14px',
            opacity: interpolate(frame, [8, 20], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          Built for modern dental practices
        </div>
      </div>

      {/* Feature grid - 2 columns, 5 rows with zoom */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 320px)',
          gap: '14px',
          marginTop: '100px',
          transform: `scale(${gridScale})`,
        }}
      >
        {allFeatures.map((feature, index) => (
          <CompactFeatureCard
            key={index}
            icon={feature.icon}
            title={feature.title}
            gradient={feature.gradient}
            delay={8 + index * 3}
            index={index}
          />
        ))}
      </div>

      {/* Bottom text with enhanced animation */}
      <div
        style={{
          position: 'absolute',
          bottom: '55px',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
          opacity: spring({
            frame: frame - 50,
            fps,
            from: 0,
            to: 1,
            config: { damping: 12 },
          }),
        }}
      >
        <div
          style={{
            padding: '16px 36px',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(139, 92, 246, 0.25) 100%)',
            borderRadius: '50px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: 'white',
            fontSize: '19px',
            fontWeight: '600',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 8px 30px rgba(59, 130, 246, 0.2)',
          }}
        >
          <span style={{ fontSize: '22px' }}>✨</span>
          + Many more features included
        </div>
      </div>

      {/* Feature count badge */}
      <div
        style={{
          position: 'absolute',
          top: '35px',
          right: '35px',
          padding: '12px 24px',
          background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
          borderRadius: '14px',
          color: 'white',
          fontSize: '16px',
          fontWeight: '700',
          boxShadow: '0 6px 25px rgba(34, 197, 94, 0.4)',
          opacity: spring({
            frame: frame - 25,
            fps,
            from: 0,
            to: 1,
            config: { damping: 15 },
          }),
          transform: `scale(${1 + Math.sin(frame / 15) * 0.03})`,
        }}
      >
        50+ Features
      </div>
    </AbsoluteFill>
  );
};
