import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { RealisticDashboard } from '../components/RealisticDashboard';

export const AllHandledScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Dashboard zoom out
  const dashboardScale = spring({
    frame,
    fps,
    from: 1.8,
    to: 0.65,
    config: { damping: 25, stiffness: 60 },
  });

  const dashboardOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Text animations
  const textOpacity = interpolate(frame, [25, 45], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const textScale = spring({
    frame: frame - 25,
    fps,
    from: 0.8,
    to: 1,
    config: { damping: 15, stiffness: 100 },
  });

  const textY = spring({
    frame: frame - 25,
    fps,
    from: 40,
    to: 0,
    config: { damping: 18, stiffness: 80 },
  });

  // Checkmarks animation
  const checkmarks = ['📞 Calls Answered', '📅 Appointments Booked', '💬 Messages Replied', '📧 Reminders Sent'];

  // Fade out
  const fadeOut = interpolate(frame, [100, 118], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #0a0c10 0%, #111827 50%, #0f172a 100%)',
        fontFamily: '"DM Sans", system-ui, sans-serif',
        overflow: 'hidden',
        opacity: fadeOut,
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: `
            radial-gradient(circle at 50% 70%, rgba(34, 197, 94, 0.08) 0%, transparent 50%),
            radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.06) 0%, transparent 40%)
          `,
        }}
      />

      {/* Dashboard in background */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${dashboardScale})`,
          opacity: dashboardOpacity * 0.4,
          filter: 'blur(2px)',
        }}
      >
        <RealisticDashboard showIncomingCall={false} />
      </div>

      {/* Overlay gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(10, 12, 16, 0.7) 0%, rgba(10, 12, 16, 0.9) 100%)',
        }}
      />

      {/* Main text */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          textAlign: 'center',
          zIndex: 10,
        }}
      >
        <div
          style={{
            fontSize: '72px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '24px',
            opacity: textOpacity,
            transform: `scale(${textScale}) translateY(${textY}px)`,
            letterSpacing: '-2px',
          }}
        >
          All Handled Automatically
        </div>

        <div
          style={{
            fontSize: '28px',
            color: '#64748b',
            marginBottom: '50px',
            opacity: textOpacity,
            transform: `translateY(${textY}px)`,
          }}
        >
          While you focus on patient care
        </div>

        {/* Checkmarks */}
        <div
          style={{
            display: 'flex',
            gap: '24px',
            flexWrap: 'wrap',
            justifyContent: 'center',
            maxWidth: '900px',
          }}
        >
          {checkmarks.map((item, index) => {
            const itemOpacity = spring({
              frame: frame - 40 - index * 6,
              fps,
              config: { damping: 12, stiffness: 200 },
            });

            const itemScale = spring({
              frame: frame - 40 - index * 6,
              fps,
              from: 0.5,
              to: 1,
              config: { damping: 10, stiffness: 250 },
            });

            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px 28px',
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.08) 100%)',
                  borderRadius: '16px',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  opacity: itemOpacity,
                  transform: `scale(${itemScale})`,
                  boxShadow: '0 8px 24px rgba(34, 197, 94, 0.1)',
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '700',
                  }}
                >
                  ✓
                </div>
                <span style={{ color: '#ffffff', fontSize: '18px', fontWeight: '600' }}>
                  {item}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
