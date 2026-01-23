import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { KineticText } from '../components/KineticText';
import { SpeedLines } from '../components/SpeedLines';

export const ModernHeroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo animation with bounce - faster
  const logoScale = spring({
    frame: frame - 3,
    fps,
    from: 0,
    to: 1,
    config: { damping: 8, stiffness: 180 },
  });

  const logoRotate = spring({
    frame: frame - 3,
    fps,
    from: -180,
    to: 0,
    config: { damping: 12, stiffness: 120 },
  });

  // Logo glow pulse
  const logoGlow = 0.4 + Math.sin(frame / 10) * 0.2;

  // Title animation - faster
  const titleOpacity = interpolate(frame, [10, 22], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const titleY = spring({
    frame: frame - 10,
    fps,
    from: 50,
    to: 0,
    config: { damping: 15, stiffness: 100 },
  });

  // Subtitle animation
  const subtitleOpacity = interpolate(frame, [22, 35], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const subtitleY = spring({
    frame: frame - 22,
    fps,
    from: 35,
    to: 0,
    config: { damping: 15, stiffness: 100 },
  });

  // Feature pills
  const features = ['AI-Powered', '24/7 Automation', 'HIPAA Compliant'];

  // "There's a better way" text
  const betterWayOpacity = spring({
    frame: frame - 5,
    fps,
    from: 0,
    to: 1,
    config: { damping: 15 },
  });

  // Fade out for transition - faster
  const fadeOut = interpolate(frame, [70, 88], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #312e81 100%)',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: '"DM Sans", system-ui, sans-serif',
        opacity: fadeOut,
      }}
    >
      {/* Speed lines for transition energy */}
      <SpeedLines
        direction="radial"
        color="rgba(59, 130, 246, 0.1)"
        intensity={0.5}
        startFrame={0}
        duration={20}
      />

      {/* Animated background elements - more dynamic */}
      <div
        style={{
          position: 'absolute',
          width: '1200px',
          height: '1200px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.18) 0%, transparent 60%)',
          top: '-350px',
          right: '-350px',
          transform: `scale(${1 + Math.sin(frame / 25) * 0.15}) rotate(${frame * 0.2}deg)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '1000px',
          height: '1000px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 60%)',
          bottom: '-250px',
          left: '-250px',
          transform: `scale(${1 + Math.sin((frame + 20) / 20) * 0.12})`,
        }}
      />

      {/* Floating particles - more of them */}
      {[...Array(12)].map((_, i) => {
        const x = (i * 180 + 100) % 1920;
        const y = Math.sin((frame + i * 25) / 18) * 40 + (i * 95) % 1080;
        const opacity = 0.12 + Math.sin((frame + i * 15) / 12) * 0.08;
        const scale = 0.8 + Math.sin((frame + i * 10) / 15) * 0.3;

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
              background: i % 3 === 0 ? '#3b82f6' : i % 3 === 1 ? '#8b5cf6' : '#06b6d4',
              opacity,
              transform: `scale(${scale})`,
              boxShadow: `0 0 ${12 + scale * 5}px currentColor`,
            }}
          />
        );
      })}

      {/* "There's a better way" intro text */}
      <div
        style={{
          position: 'absolute',
          top: '15%',
          left: '50%',
          transform: 'translateX(-50%)',
          opacity: betterWayOpacity,
        }}
      >
        <KineticText
          text="There's a better way"
          style="split"
          startFrame={2}
          fontSize={28}
          fontWeight={600}
          color="rgba(255, 255, 255, 0.8)"
        />
      </div>

      {/* Content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 1,
          marginTop: '40px',
        }}
      >
        {/* Logo with glow effect */}
        <div
          style={{
            width: '140px',
            height: '140px',
            borderRadius: '36px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '75px',
            marginBottom: '35px',
            transform: `scale(${logoScale}) rotate(${logoRotate}deg)`,
            boxShadow: `0 20px 60px rgba(59, 130, 246, ${logoGlow}), 0 0 100px rgba(59, 130, 246, ${logoGlow * 0.5})`,
            border: '3px solid rgba(255, 255, 255, 0.25)',
          }}
        >
          🦷
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: '110px',
            fontWeight: '800',
            background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 50%, #c7d2fe 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '18px',
            letterSpacing: '-5px',
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            textShadow: '0 4px 40px rgba(0, 0, 0, 0.3)',
          }}
        >
          Caberu
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: '38px',
            color: 'rgba(255, 255, 255, 0.9)',
            marginBottom: '40px',
            fontWeight: '500',
            opacity: subtitleOpacity,
            transform: `translateY(${subtitleY}px)`,
          }}
        >
          AI-Powered Dental Practice Management
        </div>

        {/* Feature pills - faster animation */}
        <div
          style={{
            display: 'flex',
            gap: '18px',
          }}
        >
          {features.map((feature, index) => {
            const pillOpacity = spring({
              frame: frame - 35 - index * 4,
              fps,
              config: { damping: 10, stiffness: 220 },
            });

            const pillScale = spring({
              frame: frame - 35 - index * 4,
              fps,
              from: 0.4,
              to: 1,
              config: { damping: 8, stiffness: 280 },
            });

            const isAI = feature === 'AI-Powered';
            
            return (
              <div
                key={index}
                style={{
                  padding: '15px 32px',
                  background: isAI 
                    ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)'
                    : 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '50px',
                  border: isAI
                    ? '2px solid rgba(59, 130, 246, 0.5)'
                    : '1px solid rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  fontSize: '19px',
                  fontWeight: '600',
                  opacity: pillOpacity,
                  transform: `scale(${pillScale})`,
                  backdropFilter: 'blur(10px)',
                  boxShadow: isAI ? '0 4px 20px rgba(59, 130, 246, 0.3)' : 'none',
                }}
              >
                {isAI && <span style={{ marginRight: '6px' }}>✨</span>}
                {feature}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom accent line */}
      <div
        style={{
          position: 'absolute',
          bottom: '50px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: interpolate(frame, [45, 65], [0, 200], { extrapolateRight: 'clamp' }),
          height: '3px',
          background: 'linear-gradient(90deg, transparent, #3b82f6, #8b5cf6, transparent)',
          borderRadius: '2px',
        }}
      />
    </AbsoluteFill>
  );
};
