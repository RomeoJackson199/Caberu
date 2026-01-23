import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { KineticText } from '../components/KineticText';
import { SpeedLines } from '../components/SpeedLines';

/**
 * SocialProofScene - Enhanced with kinetic animations and modern styling
 * Features animated counters, testimonials, and trust indicators
 */
export const SocialProofScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Stats with animated counters
  const stats = [
    { value: 500, suffix: '+', label: 'Dental Practices', icon: '🏥', color: '#3b82f6' },
    { value: 250, suffix: 'K+', label: 'Patients Served', icon: '👥', color: '#8b5cf6' },
    { value: 98, suffix: '%', label: 'Satisfaction Rate', icon: '⭐', color: '#f59e0b' },
    { value: 10, suffix: 'M+', label: 'Appointments Booked', icon: '📅', color: '#22c55e' },
  ];

  // Trust badges
  const trustBadges = [
    { icon: '🔒', label: 'HIPAA Compliant' },
    { icon: '🛡️', label: 'SOC 2 Type II' },
    { icon: '🇪🇺', label: 'GDPR Ready' },
    { icon: '✅', label: '99.9% Uptime' },
  ];

  // Testimonial
  const testimonial = {
    quote: "Caberu transformed our practice. We've reduced no-shows by 60% and our patients love the self-service booking.",
    author: 'Dr. Emily Watson',
    role: 'Dental Practice Owner',
    location: 'San Francisco, CA',
  };

  // Counter animation helper with easing
  const animateCounter = (targetValue: number, delay: number) => {
    const progress = spring({
      frame: frame - delay,
      fps,
      from: 0,
      to: 1,
      config: { damping: 25, stiffness: 40 },
    });
    return Math.floor(targetValue * Math.min(progress, 1));
  };

  // Zoom effect
  const zoomScale = interpolate(frame, [0, 15], [1.08, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #312e81 100%)',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: '"DM Sans", system-ui, sans-serif',
        transform: `scale(${zoomScale})`,
      }}
    >
      {/* Speed lines on entrance */}
      <SpeedLines
        direction="horizontal"
        color="rgba(59, 130, 246, 0.08)"
        intensity={0.4}
        startFrame={0}
        duration={20}
      />

      {/* Background elements */}
      <div
        style={{
          position: 'absolute',
          width: '1100px',
          height: '1100px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 60%)',
          top: '-350px',
          right: '-350px',
          transform: `scale(${1 + Math.sin(frame / 30) * 0.08})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '900px',
          height: '900px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 60%)',
          bottom: '-250px',
          left: '-250px',
          transform: `scale(${1 + Math.sin((frame + 20) / 25) * 0.06})`,
        }}
      />

      {/* Floating particles */}
      {[...Array(14)].map((_, i) => {
        const x = (i * 150 + 40) % 1920;
        const y = Math.sin((frame + i * 22) / 22) * 45 + (i * 85) % 1080;
        const opacity = 0.12 + Math.sin((frame + i * 14) / 18) * 0.08;
        const scale = 0.6 + Math.sin((frame + i * 10) / 15) * 0.5;

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
              background: i % 3 === 0 ? '#3b82f6' : i % 3 === 1 ? '#8b5cf6' : '#22c55e',
              opacity,
              transform: `scale(${scale})`,
              boxShadow: `0 0 ${12 + scale * 5}px currentColor`,
            }}
          />
        );
      })}

      {/* Main content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '50px',
          maxWidth: '1450px',
          padding: '0 50px',
        }}
      >
        {/* Header with kinetic text */}
        <div
          style={{
            textAlign: 'center',
            opacity: spring({
              frame: frame - 3,
              fps,
              from: 0,
              to: 1,
              config: { damping: 12, stiffness: 120 },
            }),
          }}
        >
          <KineticText
            text="Trusted by Leading Practices"
            style="split"
            startFrame={0}
            fontSize={56}
            fontWeight={800}
            color="#ffffff"
          />
          <div
            style={{
              fontSize: '23px',
              color: 'rgba(255, 255, 255, 0.7)',
              marginTop: '16px',
              opacity: interpolate(frame, [10, 22], [0, 1], { extrapolateRight: 'clamp' }),
            }}
          >
            Join thousands of dental professionals who've transformed their practice
          </div>
        </div>

        {/* Stats Grid - Enhanced */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '28px',
            width: '100%',
          }}
        >
          {stats.map((stat, index) => {
            const cardScale = spring({
              frame: frame - 12 - index * 4,
              fps,
              from: 0.6,
              to: 1,
              config: { damping: 10, stiffness: 180 },
            });

            const cardOpacity = spring({
              frame: frame - 12 - index * 4,
              fps,
              from: 0,
              to: 1,
              config: { damping: 12 },
            });

            const animatedValue = animateCounter(stat.value, 18 + index * 4);
            const glowIntensity = 0.3 + Math.sin((frame + index * 15) / 15) * 0.15;

            return (
              <div
                key={index}
                style={{
                  padding: '36px 28px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  borderRadius: '22px',
                  border: `1px solid ${stat.color}33`,
                  textAlign: 'center',
                  transform: `scale(${cardScale})`,
                  opacity: cardOpacity,
                  backdropFilter: 'blur(12px)',
                  boxShadow: `0 0 40px ${stat.color}${Math.floor(glowIntensity * 255).toString(16).padStart(2, '0')}`,
                }}
              >
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>
                  {stat.icon}
                </div>
                <div
                  style={{
                    fontSize: '54px',
                    fontWeight: '800',
                    background: `linear-gradient(135deg, #ffffff 0%, ${stat.color} 100%)`,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    marginBottom: '8px',
                    letterSpacing: '-2px',
                  }}
                >
                  {animatedValue}{stat.suffix}
                </div>
                <div
                  style={{
                    fontSize: '17px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontWeight: '500',
                  }}
                >
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Testimonial - Enhanced */}
        <div
          style={{
            maxWidth: '950px',
            padding: '38px 48px',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            position: 'relative',
            opacity: spring({
              frame: frame - 40,
              fps,
              from: 0,
              to: 1,
              config: { damping: 12 },
            }),
            transform: `translateY(${spring({
              frame: frame - 40,
              fps,
              from: 25,
              to: 0,
              config: { damping: 12 },
            })}px)`,
          }}
        >
          {/* Quote mark - animated */}
          <div
            style={{
              position: 'absolute',
              top: '-25px',
              left: '35px',
              fontSize: '90px',
              color: 'rgba(139, 92, 246, 0.35)',
              fontFamily: 'serif',
              lineHeight: 1,
              transform: `scale(${1 + Math.sin(frame / 20) * 0.05})`,
            }}
          >
            "
          </div>
          <div
            style={{
              fontSize: '25px',
              color: 'rgba(255, 255, 255, 0.92)',
              lineHeight: 1.55,
              fontStyle: 'italic',
              marginBottom: '26px',
            }}
          >
            {testimonial.quote}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '58px',
                height: '58px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '26px',
                boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)',
              }}
            >
              👩‍⚕️
            </div>
            <div>
              <div style={{ fontSize: '19px', fontWeight: '600', color: '#ffffff' }}>
                {testimonial.author}
              </div>
              <div style={{ fontSize: '15px', color: 'rgba(255, 255, 255, 0.6)' }}>
                {testimonial.role} • {testimonial.location}
              </div>
            </div>
            <div
              style={{
                marginLeft: 'auto',
                display: 'flex',
                gap: '4px',
              }}
            >
              {[...Array(5)].map((_, i) => (
                <span key={i} style={{ fontSize: '22px', color: '#fbbf24' }}>⭐</span>
              ))}
            </div>
          </div>
        </div>

        {/* Trust Badges - Enhanced */}
        <div
          style={{
            display: 'flex',
            gap: '22px',
            opacity: spring({
              frame: frame - 55,
              fps,
              from: 0,
              to: 1,
              config: { damping: 12 },
            }),
          }}
        >
          {trustBadges.map((badge, index) => {
            const badgeScale = spring({
              frame: frame - 58 - index * 3,
              fps,
              from: 0.7,
              to: 1,
              config: { damping: 10, stiffness: 220 },
            });

            return (
              <div
                key={index}
                style={{
                  padding: '14px 28px',
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(22, 163, 74, 0.08) 100%)',
                  borderRadius: '50px',
                  border: '1px solid rgba(34, 197, 94, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: '#86efac',
                  fontSize: '16px',
                  fontWeight: '600',
                  transform: `scale(${badgeScale})`,
                  boxShadow: '0 4px 20px rgba(34, 197, 94, 0.15)',
                }}
              >
                <span style={{ fontSize: '20px' }}>{badge.icon}</span>
                {badge.label}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
