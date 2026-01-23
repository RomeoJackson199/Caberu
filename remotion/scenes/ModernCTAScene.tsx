import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { KineticText } from '../components/KineticText';
import { SpeedLines } from '../components/SpeedLines';

export const ModernCTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo entrance - faster
  const logoScale = spring({
    frame: frame - 3,
    fps,
    from: 0,
    to: 1,
    config: { damping: 10, stiffness: 180 },
  });

  const logoRotate = interpolate(frame, [3, 28], [-180, 0], {
    extrapolateRight: 'clamp',
  });

  // Logo glow pulse
  const logoGlow = 0.4 + Math.sin(frame / 8) * 0.2;

  // Heading animation
  const headingOpacity = interpolate(frame, [15, 32], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const headingY = spring({
    frame: frame - 15,
    fps,
    from: 45,
    to: 0,
    config: { damping: 15, stiffness: 90 },
  });

  // Subheading animation
  const subheadingOpacity = interpolate(frame, [28, 42], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // CTA Button animation with bounce
  const buttonScale = spring({
    frame: frame - 42,
    fps,
    from: 0,
    to: 1,
    config: { damping: 8, stiffness: 220 },
  });

  const buttonPulse = 1 + Math.sin(frame / 10) * 0.04;
  const buttonGlow = 0.25 + Math.sin(frame / 8) * 0.15;

  // Contact info animation
  const contactOpacity = interpolate(frame, [60, 78], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Badges animation
  const badgeOpacity = interpolate(frame, [78, 95], [0, 1], {
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
      {/* Speed lines on entrance */}
      <SpeedLines
        direction="radial"
        color="rgba(255, 255, 255, 0.08)"
        intensity={0.5}
        startFrame={0}
        duration={20}
      />

      {/* Animated background circles - enhanced */}
      <div
        style={{
          position: 'absolute',
          width: '1400px',
          height: '1400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.12) 0%, transparent 60%)',
          top: '-450px',
          left: '-450px',
          transform: `scale(${1 + Math.sin(frame / 35) * 0.12}) rotate(${frame * 0.1}deg)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '1000px',
          height: '1000px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 60%)',
          bottom: '-250px',
          right: '-250px',
          transform: `scale(${1 + Math.sin((frame + 20) / 30) * 0.1})`,
        }}
      />

      {/* Floating particles */}
      {[...Array(12)].map((_, i) => {
        const x = (i * 180 + 60) % 1920;
        const y = Math.sin((frame + i * 20) / 18) * 50 + (i * 100) % 1080;
        const opacity = 0.1 + Math.sin((frame + i * 15) / 12) * 0.08;
        const scale = 0.5 + Math.sin((frame + i * 8) / 10) * 0.4;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'white',
              opacity,
              transform: `scale(${scale})`,
              boxShadow: '0 0 10px white',
            }}
          />
        );
      })}

      {/* Shine effect - more prominent */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08), transparent)',
          transform: `translateX(${interpolate(frame, [80, 140], [0, 350], { extrapolateRight: 'clamp' })}%)`,
        }}
      />

      {/* Content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 1,
          maxWidth: '1250px',
          padding: '0 40px',
        }}
      >
        {/* Logo with enhanced glow */}
        <div
          style={{
            width: '120px',
            height: '120px',
            borderRadius: '30px',
            background: 'rgba(255, 255, 255, 0.18)',
            backdropFilter: 'blur(25px)',
            border: '2px solid rgba(255, 255, 255, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '60px',
            marginBottom: '38px',
            transform: `scale(${logoScale}) rotate(${logoRotate}deg)`,
            boxShadow: `0 25px 70px rgba(0, 0, 0, 0.25), 0 0 100px rgba(255, 255, 255, ${logoGlow * 0.3})`,
          }}
        >
          🦷
        </div>

        {/* Heading with kinetic effect */}
        <div
          style={{
            fontSize: '76px',
            fontWeight: '800',
            color: '#ffffff',
            textAlign: 'center',
            marginBottom: '22px',
            letterSpacing: '-3px',
            opacity: headingOpacity,
            transform: `translateY(${headingY}px)`,
            textShadow: '0 6px 40px rgba(0, 0, 0, 0.25)',
            lineHeight: 1.1,
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
            color: 'rgba(255, 255, 255, 0.92)',
            textAlign: 'center',
            marginBottom: '28px',
            opacity: subheadingOpacity,
            fontWeight: '400',
          }}
        >
          Join thousands of dental practices automating with AI
        </div>

        {/* Limited Time Offer Banner */}
        <div
          style={{
            padding: '14px 32px',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.15) 100%)',
            borderRadius: '50px',
            border: '2px solid rgba(239, 68, 68, 0.5)',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            opacity: interpolate(frame, [35, 48], [0, 1], { extrapolateRight: 'clamp' }),
            transform: `scale(${1 + Math.sin(frame / 8) * 0.02})`,
            boxShadow: '0 0 30px rgba(239, 68, 68, 0.3)',
          }}
        >
          <span
            style={{
              fontSize: '22px',
              animation: 'pulse 1s infinite',
            }}
          >
            🔥
          </span>
          <span style={{ color: '#fca5a5', fontSize: '18px', fontWeight: '700' }}>
            Limited Offer: 3 Months Free for Early Adopters
          </span>
          <span
            style={{
              fontSize: '22px',
            }}
          >
            🔥
          </span>
        </div>

        {/* CTA Button - Enhanced with urgency */}
        <div
          style={{
            position: 'relative',
          }}
        >
          <div
            style={{
              padding: '30px 75px',
              background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)',
              borderRadius: '60px',
              fontSize: '30px',
              fontWeight: '700',
              color: '#1e40af',
              transform: `scale(${buttonScale * buttonPulse})`,
              boxShadow: `0 25px 70px rgba(0, 0, 0, ${buttonGlow}), 0 0 60px rgba(255, 255, 255, ${buttonGlow * 0.5})`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '18px',
              border: '3px solid rgba(59, 130, 246, 0.3)',
            }}
          >
            <span>Start Free Trial</span>
            <span
              style={{
                fontSize: '26px',
                transform: `translateX(${Math.sin(frame / 10) * 5}px)`,
                display: 'inline-block',
              }}
            >
              →
            </span>
          </div>
          {/* Animated ring around button */}
          <div
            style={{
              position: 'absolute',
              inset: '-8px',
              borderRadius: '70px',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              opacity: 0.5 + Math.sin(frame / 15) * 0.3,
              transform: `scale(${1 + Math.sin(frame / 15) * 0.02})`,
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Contact Information */}
        <div
          style={{
            marginTop: '48px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
            opacity: contactOpacity,
          }}
        >
          <div
            style={{
              fontSize: '26px',
              color: 'rgba(255, 255, 255, 0.98)',
              fontWeight: '700',
            }}
          >
            caberu.be
          </div>
          <div
            style={{
              fontSize: '18px',
              color: 'rgba(255, 255, 255, 0.85)',
            }}
          >
            Romeo@caberu.be
          </div>
        </div>

        {/* Trust Badges - Enhanced */}
        <div
          style={{
            marginTop: '42px',
            display: 'flex',
            gap: '22px',
            opacity: badgeOpacity,
          }}
        >
          {['🔒 HIPAA Compliant', '💳 No Credit Card', '🎁 14-Day Trial'].map((badge, index) => {
            const badgeScale = spring({
              frame: frame - 80 - index * 4,
              fps,
              from: 0.4,
              to: 1,
              config: { damping: 10, stiffness: 220 },
            });

            return (
              <div
                key={index}
                style={{
                  padding: '15px 28px',
                  background: 'rgba(255, 255, 255, 0.18)',
                  backdropFilter: 'blur(12px)',
                  borderRadius: '50px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: 'white',
                  fontSize: '17px',
                  fontWeight: '600',
                  transform: `scale(${badgeScale})`,
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                }}
              >
                {badge}
              </div>
            );
          })}
        </div>
      </div>

      {/* Decorative corner elements */}
      <div
        style={{
          position: 'absolute',
          top: '30px',
          left: '30px',
          width: '60px',
          height: '60px',
          borderLeft: '3px solid rgba(255, 255, 255, 0.3)',
          borderTop: '3px solid rgba(255, 255, 255, 0.3)',
          opacity: interpolate(frame, [50, 65], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '30px',
          right: '30px',
          width: '60px',
          height: '60px',
          borderRight: '3px solid rgba(255, 255, 255, 0.3)',
          borderBottom: '3px solid rgba(255, 255, 255, 0.3)',
          opacity: interpolate(frame, [50, 65], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      />
    </AbsoluteFill>
  );
};
