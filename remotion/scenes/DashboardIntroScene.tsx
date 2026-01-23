import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { RealisticDashboard } from '../components/RealisticDashboard';
import { AnimatedCursor } from '../components/AnimatedCursor';
import { ZoomTransition } from '../components/ZoomTransition';
import { KineticText } from '../components/KineticText';
import { FeatureHighlight } from '../components/FeatureHighlight';

interface DashboardIntroSceneProps {
  showCursor?: boolean;
  showIncomingCall?: boolean;
  zoomToCall?: boolean;
}

export const DashboardIntroScene: React.FC<DashboardIntroSceneProps> = ({
  showCursor = false,
  showIncomingCall = false,
  zoomToCall = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Dashboard entrance animation - faster and more dynamic
  const dashboardScale = spring({
    frame,
    fps,
    from: 0.8,
    to: 1,
    config: { damping: 15, stiffness: 120 },
  });

  const dashboardOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Dynamic zoom effect that follows cursor
  const zoomProgress = zoomToCall
    ? spring({
        frame: frame - 50,
        fps,
        from: 0,
        to: 1,
        config: { damping: 20, stiffness: 100 },
      })
    : 0;

  const zoomScale = interpolate(zoomProgress, [0, 1], [1, 2.2]);
  const zoomX = interpolate(zoomProgress, [0, 1], [0, -420]);
  const zoomY = interpolate(zoomProgress, [0, 1], [0, 280]);

  // Cursor positions for clicking the incoming call - smoother path
  const cursorPositions = [
    { x: 960, y: 540, frame: 0 },
    { x: 1200, y: 300, frame: 20 },
    { x: 1450, y: 110, frame: 35 },
    { x: 1520, y: 95, frame: 50 },
  ];

  // Feature highlight for stats cards
  const showHighlight = frame > 25 && frame < 60;

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #0a0c10 0%, #111827 50%, #0f172a 100%)',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow effects - more dynamic */}
      <div
        style={{
          position: 'absolute',
          width: '900px',
          height: '900px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
          top: '-250px',
          left: '-250px',
          transform: `translateY(${Math.sin(frame / 25) * 25}px) scale(${1 + Math.sin(frame / 40) * 0.1})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '700px',
          height: '700px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%)',
          bottom: '-200px',
          right: '-200px',
          transform: `translateY(${Math.sin((frame + 20) / 20) * 20}px)`,
        }}
      />

      {/* Dashboard with zoom effect */}
      <div
        style={{
          transform: `scale(${dashboardScale * zoomScale}) translate(${zoomX}px, ${zoomY}px)`,
          opacity: dashboardOpacity,
          transformOrigin: 'center center',
        }}
      >
        <RealisticDashboard
          showIncomingCall={showIncomingCall}
          incomingCallPulse={showIncomingCall && frame > 25}
        />
        
        {/* Feature highlights on dashboard */}
        {showHighlight && !zoomToCall && (
          <FeatureHighlight
            x={60}
            y={340}
            width={420}
            height={95}
            label="8 Appointments Today"
            startFrame={25}
            style="pulse"
          />
        )}
      </div>

      {/* Animated cursor */}
      {showCursor && (
        <AnimatedCursor
          positions={cursorPositions}
          clickFrames={[52]}
          startFrame={8}
          size={28}
        />
      )}

      {/* Kinetic label */}
      <div
        style={{
          position: 'absolute',
          bottom: '35px',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        <div
          style={{
            padding: '14px 28px',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '50px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            opacity: interpolate(frame, [15, 28], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: '#22c55e',
              boxShadow: '0 0 10px #22c55e',
            }}
          />
          <KineticText
            text="Full Control Dashboard"
            style="slide-left"
            startFrame={20}
            fontSize={18}
            fontWeight={600}
            color="#ffffff"
          />
        </div>
      </div>

      {/* Corner badge */}
      <div
        style={{
          position: 'absolute',
          top: '30px',
          right: '30px',
          padding: '10px 20px',
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
          borderRadius: '12px',
          color: 'white',
          fontSize: '14px',
          fontWeight: '700',
          boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)',
          opacity: spring({
            frame: frame - 30,
            fps,
            from: 0,
            to: 1,
            config: { damping: 15 },
          }),
          transform: `scale(${1 + Math.sin(frame / 15) * 0.03})`,
        }}
      >
        🤖 AI-Powered
      </div>
    </AbsoluteFill>
  );
};
