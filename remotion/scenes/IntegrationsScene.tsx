import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { KineticText } from '../components/KineticText';
import { SpeedLines } from '../components/SpeedLines';
import { AnimatedCursor } from '../components/AnimatedCursor';

/**
 * IntegrationsScene - Shows seamless integrations with dental software
 * Displays popular dental practice management integrations
 */
export const IntegrationsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Integration logos/brands (using text representations for dental software)
  const integrations = [
    { name: 'Dentrix', icon: '🦷', color: '#2563eb', category: 'PMS' },
    { name: 'Eaglesoft', icon: '🦅', color: '#059669', category: 'PMS' },
    { name: 'Open Dental', icon: '🔓', color: '#7c3aed', category: 'PMS' },
    { name: 'Curve Dental', icon: '📈', color: '#dc2626', category: 'PMS' },
    { name: 'Google Calendar', icon: '📅', color: '#4285f4', category: 'Calendar' },
    { name: 'Stripe', icon: '💳', color: '#635bff', category: 'Payments' },
    { name: 'WhatsApp', icon: '💬', color: '#25d366', category: 'Messaging' },
    { name: 'Twilio', icon: '📞', color: '#f22f46', category: 'Voice' },
  ];

  // Center Caberu logo animation
  const centerScale = spring({
    frame: frame - 5,
    fps,
    from: 0,
    to: 1,
    config: { damping: 10, stiffness: 150 },
  });

  const centerGlow = 0.4 + Math.sin(frame / 10) * 0.2;

  // Rotating orbit effect
  const orbitRotation = frame * 0.5;

  // Initial zoom effect
  const initialZoom = interpolate(frame, [0, 15], [1.1, 1], { extrapolateRight: 'clamp' });

  // Cursor positions - moves to integrations and clicks on one
  const cursorPositions = [
    { x: 960, y: 540, frame: 0 },     // Center (Caberu hub)
    { x: 960, y: 220, frame: 20 },    // Top integration (Dentrix)
    { x: 1280, y: 540, frame: 35 },   // Right integration
    { x: 640, y: 540, frame: 50 },    // Left integration (Eaglesoft)
    { x: 640, y: 540, frame: 60 },    // Click on Eaglesoft
  ];

  // Zoom effect when clicking on integration
  const clickZoomProgress = spring({
    frame: frame - 58,
    fps,
    from: 0,
    to: 1,
    config: { damping: 28, stiffness: 70 },
  });

  const clickZoomScale = interpolate(clickZoomProgress, [0, 1], [1, 1.15]);
  const clickZoomX = interpolate(clickZoomProgress, [0, 1], [0, 150]);
  const clickZoomY = interpolate(clickZoomProgress, [0, 1], [0, 20]);

  // Combined zoom
  const zoomScale = initialZoom * clickZoomScale;

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: '"DM Sans", system-ui, sans-serif',
        transform: `scale(${zoomScale}) translate(${clickZoomX}px, ${clickZoomY}px)`,
        transformOrigin: 'center center',
      }}
    >
      {/* Speed lines */}
      <SpeedLines
        direction="radial"
        color="rgba(139, 92, 246, 0.1)"
        intensity={0.4}
        startFrame={0}
        duration={20}
      />

      {/* Background elements */}
      <div
        style={{
          position: 'absolute',
          width: '1000px',
          height: '1000px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 60%)',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) rotate(${orbitRotation}deg)`,
        }}
      />

      {/* Connection lines from center to integrations */}
      <svg
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        {integrations.map((_, index) => {
          const angle = (index / integrations.length) * Math.PI * 2 - Math.PI / 2;
          const radius = 320;
          const endX = 960 + Math.cos(angle) * radius;
          const endY = 540 + Math.sin(angle) * radius;

          const lineProgress = spring({
            frame: frame - 15 - index * 3,
            fps,
            from: 0,
            to: 1,
            config: { damping: 15, stiffness: 100 },
          });

          const dashOffset = (1 - lineProgress) * 400;

          return (
            <line
              key={index}
              x1="960"
              y1="540"
              x2={endX}
              y2={endY}
              stroke="url(#lineGradient)"
              strokeWidth="2"
              strokeDasharray="400"
              strokeDashoffset={dashOffset}
              opacity={0.6}
            />
          );
        })}
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.4" />
          </linearGradient>
        </defs>
      </svg>

      {/* Floating particles */}
      {[...Array(12)].map((_, i) => {
        const x = (i * 170 + 60) % 1920;
        const y = Math.sin((frame + i * 22) / 18) * 40 + (i * 100) % 1080;
        const opacity = 0.1 + Math.sin((frame + i * 14) / 14) * 0.06;
        const scale = 0.5 + Math.sin((frame + i * 10) / 12) * 0.4;

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
              transform: `scale(${scale})`,
            }}
          />
        );
      })}

      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: '60px',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
        }}
      >
        <KineticText
          text="Seamless Integrations"
          style="split"
          startFrame={0}
          fontSize={48}
          fontWeight={800}
          color="#ffffff"
        />
        <div
          style={{
            fontSize: '20px',
            color: 'rgba(255, 255, 255, 0.7)',
            marginTop: '12px',
            opacity: interpolate(frame, [10, 22], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          Works with your existing dental software
        </div>
      </div>

      {/* Center Caberu hub */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${centerScale})`,
          width: '140px',
          height: '140px',
          borderRadius: '35px',
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 0 80px rgba(59, 130, 246, ${centerGlow}), 0 20px 60px rgba(0, 0, 0, 0.4)`,
          border: '3px solid rgba(255, 255, 255, 0.25)',
          zIndex: 10,
        }}
      >
        <span style={{ fontSize: '50px' }}>🦷</span>
        <span style={{ color: 'white', fontSize: '16px', fontWeight: '700', marginTop: '4px' }}>
          Caberu
        </span>
      </div>

      {/* Integration items in orbit */}
      {integrations.map((integration, index) => {
        const angle = (index / integrations.length) * Math.PI * 2 - Math.PI / 2;
        const radius = 320;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        const itemScale = spring({
          frame: frame - 12 - index * 4,
          fps,
          from: 0,
          to: 1,
          config: { damping: 10, stiffness: 180 },
        });

        const itemOpacity = spring({
          frame: frame - 12 - index * 4,
          fps,
          from: 0,
          to: 1,
          config: { damping: 12 },
        });

        // Subtle floating animation
        const floatY = Math.sin((frame + index * 20) / 25) * 5;

        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y + floatY}px)) scale(${itemScale})`,
              opacity: itemOpacity,
            }}
          >
            <div
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '22px',
                background: 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(10px)',
                border: `2px solid ${integration.color}55`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: `0 10px 40px rgba(0, 0, 0, 0.3), 0 0 30px ${integration.color}22`,
              }}
            >
              <span style={{ fontSize: '32px' }}>{integration.icon}</span>
              <span
                style={{
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: '600',
                  textAlign: 'center',
                  lineHeight: 1.2,
                }}
              >
                {integration.name}
              </span>
            </div>
            {/* Category badge */}
            <div
              style={{
                position: 'absolute',
                bottom: '-10px',
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '4px 10px',
                background: integration.color,
                borderRadius: '12px',
                color: 'white',
                fontSize: '9px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {integration.category}
            </div>
          </div>
        );
      })}

      {/* Bottom highlight */}
      <div
        style={{
          position: 'absolute',
          bottom: '50px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '16px 32px',
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '50px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          opacity: spring({
            frame: frame - 50,
            fps,
            from: 0,
            to: 1,
            config: { damping: 12 },
          }),
        }}
      >
        <span style={{ fontSize: '20px' }}>🔌</span>
        <span style={{ color: 'white', fontSize: '17px', fontWeight: '600' }}>
          Connect in minutes, not days
        </span>
        <div
          style={{
            padding: '6px 14px',
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            borderRadius: '20px',
            color: 'white',
            fontSize: '13px',
            fontWeight: '700',
          }}
        >
          50+ Integrations
        </div>
      </div>

      {/* Animated cursor */}
      <AnimatedCursor
        positions={cursorPositions}
        clickFrames={[60]}
        startFrame={8}
        size={26}
      />
    </AbsoluteFill>
  );
};
