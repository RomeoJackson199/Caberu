import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const ModernCTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo entrance
  const logoScale = spring({
    frame: frame - 5,
    fps,
    from: 0,
    to: 1,
    config: { damping: 12, stiffness: 150 },
  });

  const logoRotate = interpolate(frame, [5, 35], [-180, 0], {
    extrapolateRight: 'clamp',
  });

  // Heading animation
  const headingOpacity = interpolate(frame, [20, 40], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const headingY = spring({
    frame: frame - 20,
    fps,
    from: 50,
    to: 0,
    config: { damping: 18, stiffness: 80 },
  });

  // Subheading animation
  const subheadingOpacity = interpolate(frame, [35, 50], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // CTA Button animation
  const buttonScale = spring({
    frame: frame - 50,
    fps,
    from: 0,
    to: 1,
    config: { damping: 10, stiffness: 200 },
  });

  const buttonPulse = 1 + Math.sin(frame / 12) * 0.03;

  // Contact info animation
  const contactOpacity = interpolate(frame, [70, 90], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Badges animation
  const badgeOpacity = interpolate(frame, [90, 110], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #2563eb 100%)',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: '"DM Sans", system-ui, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* Animated background circles */}
      <div
        style={{
          position: 'absolute',
          width: '1200px',
          height: '1200px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 60%)',
          top: '-400px',
          left: '-400px',
          transform: `scale(${1 + Math.sin(frame / 40) * 0.1})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '800px',
          height: '800px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 60%)',
          bottom: '-200px',
          right: '-200px',
          transform: `scale(${1 + Math.sin((frame + 20) / 35) * 0.08})`,
        }}
      />

      {/* Shine effect */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent)',
          transform: `translateX(${interpolate(frame, [100, 150], [0, 300], { extrapolateRight: 'clamp' })}%)`,
        }}
      />

      {/* Content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 1,
          maxWidth: '1200px',
          padding: '0 40px',
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: '110px',
            height: '110px',
            borderRadius: '28px',
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(20px)',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '55px',
            marginBottom: '40px',
            transform: `scale(${logoScale}) rotate(${logoRotate}deg)`,
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
          }}
        >
          🦷
        </div>

        {/* Heading */}
        <div
          style={{
            fontSize: '72px',
            fontWeight: '800',
            color: '#ffffff',
            textAlign: 'center',
            marginBottom: '20px',
            letterSpacing: '-2px',
            opacity: headingOpacity,
            transform: `translateY(${headingY}px)`,
            textShadow: '0 4px 30px rgba(0, 0, 0, 0.2)',
          }}
        >
          Ready to Transform
          <br />
          Your Practice?
        </div>

        {/* Subheading */}
        <div
          style={{
            fontSize: '28px',
            color: 'rgba(255, 255, 255, 0.9)',
            textAlign: 'center',
            marginBottom: '50px',
            opacity: subheadingOpacity,
            fontWeight: '400',
          }}
        >
          Join thousands of dental practices automating with AI
        </div>

        {/* CTA Button */}
        <div
          style={{
            padding: '28px 70px',
            background: '#ffffff',
            borderRadius: '60px',
            fontSize: '28px',
            fontWeight: '700',
            color: '#1e40af',
            transform: `scale(${buttonScale * buttonPulse})`,
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <span>Get Started Free</span>
          <span style={{ fontSize: '24px' }}>→</span>
        </div>

        {/* Contact Information */}
        <div
          style={{
            marginTop: '50px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            opacity: contactOpacity,
          }}
        >
          <div
            style={{
              fontSize: '24px',
              color: 'rgba(255, 255, 255, 0.95)',
              fontWeight: '600',
            }}
          >
            caberu.be
          </div>
          <div
            style={{
              fontSize: '18px',
              color: 'rgba(255, 255, 255, 0.8)',
            }}
          >
            Romeo@caberu.be
          </div>
        </div>

        {/* Trust Badges */}
        <div
          style={{
            marginTop: '45px',
            display: 'flex',
            gap: '24px',
            opacity: badgeOpacity,
          }}
        >
          {['🔒 HIPAA Compliant', '💳 No Credit Card', '🎁 14-Day Trial'].map((badge, index) => {
            const badgeScale = spring({
              frame: frame - 90 - index * 5,
              fps,
              from: 0.5,
              to: 1,
              config: { damping: 12, stiffness: 200 },
            });

            return (
              <div
                key={index}
                style={{
                  padding: '14px 26px',
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '50px',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '600',
                  transform: `scale(${badgeScale})`,
                }}
              >
                {badge}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
