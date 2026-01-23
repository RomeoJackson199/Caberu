import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

/**
 * SocialProofScene - Shows social proof with statistics and testimonials
 * Features practice count, patient numbers, and trust indicators
 */
export const SocialProofScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Stats with animated counters
  const stats = [
    { value: 500, suffix: '+', label: 'Dental Practices', icon: '🏥' },
    { value: 250, suffix: 'K+', label: 'Patients Served', icon: '👥' },
    { value: 98, suffix: '%', label: 'Satisfaction Rate', icon: '⭐' },
    { value: 10, suffix: 'M+', label: 'Appointments Booked', icon: '📅' },
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

  // Counter animation helper
  const animateCounter = (targetValue: number, delay: number) => {
    const progress = spring({
      frame: frame - delay,
      fps,
      from: 0,
      to: 1,
      config: { damping: 30, stiffness: 50 },
    });
    return Math.floor(targetValue * Math.min(progress, 1));
  };

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #312e81 100%)',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: '"DM Sans", system-ui, sans-serif',
      }}
    >
      {/* Background elements */}
      <div
        style={{
          position: 'absolute',
          width: '1000px',
          height: '1000px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 60%)',
          top: '-300px',
          right: '-300px',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '800px',
          height: '800px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 60%)',
          bottom: '-200px',
          left: '-200px',
        }}
      />

      {/* Floating particles */}
      {[...Array(12)].map((_, i) => {
        const x = (i * 180 + 50) % 1920;
        const y = Math.sin((frame + i * 25) / 25) * 40 + (i * 100) % 1080;
        const opacity = 0.15 + Math.sin((frame + i * 15) / 20) * 0.08;

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
              background: i % 2 === 0 ? '#3b82f6' : '#8b5cf6',
              opacity,
              boxShadow: `0 0 15px ${i % 2 === 0 ? '#3b82f6' : '#8b5cf6'}`,
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
          gap: '60px',
          maxWidth: '1400px',
          padding: '0 60px',
        }}
      >
        {/* Header */}
        <div
          style={{
            textAlign: 'center',
            opacity: spring({
              frame: frame - 5,
              fps,
              from: 0,
              to: 1,
              config: { damping: 15, stiffness: 100 },
            }),
          }}
        >
          <div
            style={{
              fontSize: '58px',
              fontWeight: '800',
              color: '#ffffff',
              marginBottom: '16px',
              letterSpacing: '-2px',
            }}
          >
            Trusted by Leading Practices
          </div>
          <div
            style={{
              fontSize: '24px',
              color: 'rgba(255, 255, 255, 0.7)',
            }}
          >
            Join thousands of dental professionals who've transformed their practice
          </div>
        </div>

        {/* Stats Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '32px',
            width: '100%',
          }}
        >
          {stats.map((stat, index) => {
            const cardScale = spring({
              frame: frame - 15 - index * 5,
              fps,
              from: 0.7,
              to: 1,
              config: { damping: 12, stiffness: 150 },
            });

            const cardOpacity = spring({
              frame: frame - 15 - index * 5,
              fps,
              from: 0,
              to: 1,
              config: { damping: 15 },
            });

            const animatedValue = animateCounter(stat.value, 20 + index * 5);

            return (
              <div
                key={index}
                style={{
                  padding: '40px 32px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '24px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  textAlign: 'center',
                  transform: `scale(${cardScale})`,
                  opacity: cardOpacity,
                  backdropFilter: 'blur(10px)',
                }}
              >
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>
                  {stat.icon}
                </div>
                <div
                  style={{
                    fontSize: '56px',
                    fontWeight: '800',
                    background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)',
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
                    fontSize: '18px',
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

        {/* Testimonial */}
        <div
          style={{
            maxWidth: '900px',
            padding: '40px 50px',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            position: 'relative',
            opacity: spring({
              frame: frame - 45,
              fps,
              from: 0,
              to: 1,
              config: { damping: 15 },
            }),
            transform: `translateY(${spring({
              frame: frame - 45,
              fps,
              from: 30,
              to: 0,
              config: { damping: 15 },
            })}px)`,
          }}
        >
          {/* Quote mark */}
          <div
            style={{
              position: 'absolute',
              top: '-20px',
              left: '40px',
              fontSize: '80px',
              color: 'rgba(139, 92, 246, 0.3)',
              fontFamily: 'serif',
              lineHeight: 1,
            }}
          >
            "
          </div>
          <div
            style={{
              fontSize: '26px',
              color: 'rgba(255, 255, 255, 0.9)',
              lineHeight: 1.6,
              fontStyle: 'italic',
              marginBottom: '28px',
            }}
          >
            {testimonial.quote}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
              }}
            >
              👩‍⚕️
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#ffffff' }}>
                {testimonial.author}
              </div>
              <div style={{ fontSize: '15px', color: 'rgba(255, 255, 255, 0.6)' }}>
                {testimonial.role} • {testimonial.location}
              </div>
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div
          style={{
            display: 'flex',
            gap: '24px',
            opacity: spring({
              frame: frame - 60,
              fps,
              from: 0,
              to: 1,
              config: { damping: 15 },
            }),
          }}
        >
          {trustBadges.map((badge, index) => {
            const badgeScale = spring({
              frame: frame - 65 - index * 4,
              fps,
              from: 0.8,
              to: 1,
              config: { damping: 12, stiffness: 200 },
            });

            return (
              <div
                key={index}
                style={{
                  padding: '14px 28px',
                  background: 'rgba(34, 197, 94, 0.1)',
                  borderRadius: '50px',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: '#86efac',
                  fontSize: '16px',
                  fontWeight: '600',
                  transform: `scale(${badgeScale})`,
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
