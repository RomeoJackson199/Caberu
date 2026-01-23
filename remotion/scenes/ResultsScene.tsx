import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { KineticText } from '../components/KineticText';
import { SpeedLines } from '../components/SpeedLines';
import { AnimatedCursor } from '../components/AnimatedCursor';

/**
 * ResultsScene - Shows dramatic before/after transformation metrics
 * Demonstrates the ROI and impact of using Caberu
 */
export const ResultsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Transformation metrics with before/after
  const metrics = [
    {
      label: 'Missed Calls',
      before: 47,
      after: 3,
      suffix: '%',
      icon: '📞',
      color: '#22c55e',
      improvement: '-94%',
    },
    {
      label: 'No-Shows',
      before: 28,
      after: 8,
      suffix: '%',
      icon: '📅',
      color: '#3b82f6',
      improvement: '-71%',
    },
    {
      label: 'Revenue',
      before: 100,
      after: 140,
      suffix: 'K',
      prefix: '$',
      icon: '💰',
      color: '#f59e0b',
      improvement: '+40%',
    },
    {
      label: 'Patient Satisfaction',
      before: 72,
      after: 98,
      suffix: '%',
      icon: '⭐',
      color: '#8b5cf6',
      improvement: '+36%',
    },
  ];

  // Animate counter with smooth easing
  const animateCounter = (from: number, to: number, delay: number) => {
    const progress = spring({
      frame: frame - delay,
      fps,
      from: 0,
      to: 1,
      config: { damping: 30, stiffness: 50 },
    });
    return Math.floor(from + (to - from) * Math.min(progress, 1));
  };

  // Scene initial zoom effect
  const initialZoom = interpolate(frame, [0, 15], [1.08, 1], { extrapolateRight: 'clamp' });

  // Cursor positions - moves through the metrics cards
  const cursorPositions = [
    { x: 960, y: 400, frame: 0 },
    { x: 380, y: 380, frame: 20 },  // First metric card
    { x: 680, y: 380, frame: 35 },  // Second metric card
    { x: 980, y: 380, frame: 50 },  // Third metric card (Revenue)
    { x: 980, y: 380, frame: 65 },  // Click on Revenue card
    { x: 1280, y: 380, frame: 80 }, // Fourth metric card
  ];

  // Zoom effect when clicking on Revenue card
  const clickZoomProgress = spring({
    frame: frame - 65,
    fps,
    from: 0,
    to: 1,
    config: { damping: 28, stiffness: 70 },
  });

  const clickZoomScale = interpolate(clickZoomProgress, [0, 1], [1, 1.2]);
  const clickZoomX = interpolate(clickZoomProgress, [0, 1], [0, -80]);
  const clickZoomY = interpolate(clickZoomProgress, [0, 1], [0, 50]);

  // Combined zoom scale
  const zoomScale = initialZoom * clickZoomScale;

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #064e3b 40%, #0f172a 100%)',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: '"DM Sans", system-ui, sans-serif',
        transform: `scale(${zoomScale}) translate(${clickZoomX}px, ${clickZoomY}px)`,
        transformOrigin: 'center center',
      }}
    >
      {/* Speed lines for energy */}
      <SpeedLines
        direction="radial"
        color="rgba(34, 197, 94, 0.12)"
        intensity={0.6}
        startFrame={0}
        duration={20}
      />

      {/* Background glow effects */}
      <div
        style={{
          position: 'absolute',
          width: '1200px',
          height: '1200px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34, 197, 94, 0.15) 0%, transparent 60%)',
          top: '-400px',
          left: '-400px',
          transform: `scale(${1 + Math.sin(frame / 30) * 0.1})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '1000px',
          height: '1000px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 60%)',
          bottom: '-300px',
          right: '-300px',
          transform: `scale(${1 + Math.sin((frame + 20) / 25) * 0.08})`,
        }}
      />

      {/* Floating success particles */}
      {[...Array(16)].map((_, i) => {
        const x = (i * 130 + 50) % 1920;
        const y = Math.sin((frame + i * 20) / 20) * 40 + (i * 75) % 1080;
        const opacity = 0.15 + Math.sin((frame + i * 12) / 15) * 0.1;
        const scale = 0.6 + Math.sin((frame + i * 10) / 12) * 0.4;

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
              background: i % 2 === 0 ? '#22c55e' : '#3b82f6',
              opacity,
              transform: `scale(${scale})`,
              boxShadow: `0 0 ${12 + scale * 6}px ${i % 2 === 0 ? '#22c55e' : '#3b82f6'}`,
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
          gap: '45px',
          maxWidth: '1500px',
          padding: '0 40px',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <KineticText
            text="Real Results, Real Practices"
            style="split"
            startFrame={0}
            fontSize={52}
            fontWeight={800}
            color="#ffffff"
          />
          <div
            style={{
              fontSize: '22px',
              color: 'rgba(255, 255, 255, 0.75)',
              marginTop: '14px',
              opacity: interpolate(frame, [12, 24], [0, 1], { extrapolateRight: 'clamp' }),
            }}
          >
            Average improvements after 3 months with Caberu
          </div>
        </div>

        {/* Metrics Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '24px',
            width: '100%',
          }}
        >
          {metrics.map((metric, index) => {
            const cardScale = spring({
              frame: frame - 15 - index * 5,
              fps,
              from: 0.5,
              to: 1,
              config: { damping: 10, stiffness: 150 },
            });

            const cardOpacity = spring({
              frame: frame - 15 - index * 5,
              fps,
              from: 0,
              to: 1,
              config: { damping: 12 },
            });

            const beforeValue = animateCounter(metric.before, metric.before, 20 + index * 5);
            const afterValue = animateCounter(metric.before, metric.after, 35 + index * 5);

            const showAfter = frame > 32 + index * 5;
            const glowIntensity = 0.3 + Math.sin((frame + index * 15) / 12) * 0.2;

            return (
              <div
                key={index}
                style={{
                  padding: '32px 24px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '20px',
                  border: `1px solid ${metric.color}44`,
                  textAlign: 'center',
                  transform: `scale(${cardScale})`,
                  opacity: cardOpacity,
                  backdropFilter: 'blur(12px)',
                  boxShadow: `0 0 50px ${metric.color}${Math.floor(glowIntensity * 255).toString(16).padStart(2, '0')}`,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Icon */}
                <div style={{ fontSize: '42px', marginBottom: '14px' }}>
                  {metric.icon}
                </div>

                {/* Before/After values */}
                <div style={{ position: 'relative', height: '70px' }}>
                  {/* Before value (fades out) */}
                  <div
                    style={{
                      fontSize: '48px',
                      fontWeight: '800',
                      color: showAfter ? 'rgba(255, 255, 255, 0.3)' : '#ef4444',
                      position: 'absolute',
                      width: '100%',
                      transition: 'all 0.3s ease',
                      opacity: showAfter ? 0 : 1,
                      transform: showAfter ? 'translateY(-20px)' : 'translateY(0)',
                      textDecoration: showAfter ? 'line-through' : 'none',
                    }}
                  >
                    {metric.prefix || ''}{beforeValue}{metric.suffix}
                  </div>

                  {/* After value (fades in) */}
                  <div
                    style={{
                      fontSize: '52px',
                      fontWeight: '800',
                      background: `linear-gradient(135deg, #ffffff 0%, ${metric.color} 100%)`,
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      position: 'absolute',
                      width: '100%',
                      opacity: showAfter ? 1 : 0,
                      transform: showAfter ? 'translateY(0)' : 'translateY(20px)',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {metric.prefix || ''}{afterValue}{metric.suffix}
                  </div>
                </div>

                {/* Label */}
                <div
                  style={{
                    fontSize: '16px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontWeight: '500',
                    marginTop: '8px',
                  }}
                >
                  {metric.label}
                </div>

                {/* Improvement badge */}
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    padding: '6px 12px',
                    background: metric.improvement.startsWith('+')
                      ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                      : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    borderRadius: '20px',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '700',
                    opacity: spring({
                      frame: frame - 45 - index * 5,
                      fps,
                      from: 0,
                      to: 1,
                      config: { damping: 12, stiffness: 200 },
                    }),
                    transform: `scale(${spring({
                      frame: frame - 45 - index * 5,
                      fps,
                      from: 0.5,
                      to: 1,
                      config: { damping: 8, stiffness: 250 },
                    })})`,
                    boxShadow: '0 4px 15px rgba(34, 197, 94, 0.4)',
                  }}
                >
                  {metric.improvement}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom highlight */}
        <div
          style={{
            padding: '20px 40px',
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(22, 163, 74, 0.15) 100%)',
            borderRadius: '60px',
            border: '1px solid rgba(34, 197, 94, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            opacity: spring({
              frame: frame - 60,
              fps,
              from: 0,
              to: 1,
              config: { damping: 12 },
            }),
            transform: `scale(${spring({
              frame: frame - 60,
              fps,
              from: 0.8,
              to: 1,
              config: { damping: 10, stiffness: 180 },
            })})`,
            boxShadow: '0 10px 40px rgba(34, 197, 94, 0.25)',
          }}
        >
          <span style={{ fontSize: '28px' }}>🚀</span>
          <span style={{ color: '#86efac', fontSize: '20px', fontWeight: '700' }}>
            See these results in your practice within 90 days
          </span>
        </div>
      </div>

      {/* Animated cursor */}
      <AnimatedCursor
        positions={cursorPositions}
        clickFrames={[65]}
        startFrame={10}
        size={26}
      />
    </AbsoluteFill>
  );
};
