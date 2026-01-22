import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';

export const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo animation
  const logoScale = spring({
    frame: frame - 10,
    fps,
    config: {
      damping: 100,
    },
  });

  const logoOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Heading animation
  const headingOpacity = interpolate(frame, [20, 40], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const headingY = interpolate(frame, [20, 40], [50, 0], {
    extrapolateRight: 'clamp',
  });

  // CTA button animation
  const buttonScale = spring({
    frame: frame - 50,
    fps,
    config: {
      damping: 200,
    },
  });

  const buttonOpacity = interpolate(frame, [40, 60], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Pulsing effect for button
  const pulse = Math.sin(frame / 15) * 0.05 + 1;

  // Contact info animation
  const contactOpacity = interpolate(frame, [70, 90], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Animated background elements */}
      <div
        style={{
          position: 'absolute',
          width: '800px',
          height: '800px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.1)',
          top: '-300px',
          left: '-300px',
          opacity: 0.5,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.1)',
          bottom: '-200px',
          right: '-200px',
          opacity: 0.3,
        }}
      />

      {/* Content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 1,
        }}
      >
        {/* Logo */}
        <div
          style={{
            fontSize: '100px',
            marginBottom: '40px',
            transform: `scale(${logoScale})`,
            opacity: logoOpacity,
          }}
        >
          🦷
        </div>

        {/* Heading */}
        <div
          style={{
            fontSize: '70px',
            fontWeight: 'bold',
            color: 'white',
            textAlign: 'center',
            marginBottom: '20px',
            opacity: headingOpacity,
            transform: `translateY(${headingY}px)`,
          }}
        >
          Ready to Transform Your Practice?
        </div>

        {/* Subheading */}
        <div
          style={{
            fontSize: '36px',
            color: 'rgba(255, 255, 255, 0.9)',
            textAlign: 'center',
            marginBottom: '60px',
            opacity: headingOpacity,
            transform: `translateY(${headingY}px)`,
          }}
        >
          Start your free trial today
        </div>

        {/* CTA Button */}
        <div
          style={{
            padding: '30px 80px',
            background: 'white',
            borderRadius: '60px',
            fontSize: '42px',
            fontWeight: 'bold',
            color: '#1e40af',
            cursor: 'pointer',
            transform: `scale(${buttonScale * pulse})`,
            opacity: buttonOpacity,
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          }}
        >
          Get Started Free
        </div>

        {/* Contact Information */}
        <div
          style={{
            marginTop: '60px',
            fontSize: '32px',
            color: 'rgba(255, 255, 255, 0.9)',
            textAlign: 'center',
            opacity: contactOpacity,
          }}
        >
          <div style={{ marginBottom: '15px' }}>caberu.be</div>
          <div>Romeo@caberu.be</div>
        </div>

        {/* Features badge */}
        <div
          style={{
            marginTop: '40px',
            display: 'flex',
            gap: '30px',
            opacity: contactOpacity,
          }}
        >
          {['HIPAA Compliant', 'No Credit Card Required', '14-Day Trial'].map(
            (badge, index) => (
              <div
                key={index}
                style={{
                  padding: '15px 30px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '30px',
                  fontSize: '22px',
                  color: 'white',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                }}
              >
                {badge}
              </div>
            )
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
