import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { RealisticDashboard } from '../components/RealisticDashboard';
import { AnimatedCursor } from '../components/AnimatedCursor';

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

  // Dashboard entrance animation
  const dashboardScale = spring({
    frame,
    fps,
    from: 0.85,
    to: 1,
    config: { damping: 20, stiffness: 100 },
  });

  const dashboardOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Zoom to call animation
  const zoomProgress = zoomToCall
    ? spring({
        frame: frame - 60,
        fps,
        from: 0,
        to: 1,
        config: { damping: 25, stiffness: 80 },
      })
    : 0;

  const zoomScale = interpolate(zoomProgress, [0, 1], [1, 1.8]);
  const zoomX = interpolate(zoomProgress, [0, 1], [0, -350]);
  const zoomY = interpolate(zoomProgress, [0, 1], [0, 200]);

  // Cursor positions for clicking the incoming call
  const cursorPositions = [
    { x: 960, y: 540, frame: 0 },
    { x: 1450, y: 110, frame: 30 },
    { x: 1520, y: 95, frame: 45 },
  ];

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #0a0c10 0%, #111827 50%, #0f172a 100%)',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow effects */}
      <div
        style={{
          position: 'absolute',
          width: '800px',
          height: '800px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)',
          top: '-200px',
          left: '-200px',
          transform: `translateY(${Math.sin(frame / 30) * 20}px)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 70%)',
          bottom: '-150px',
          right: '-150px',
          transform: `translateY(${Math.sin((frame + 20) / 25) * 15}px)`,
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
          incomingCallPulse={showIncomingCall && frame > 30}
        />
      </div>

      {/* Animated cursor */}
      {showCursor && (
        <AnimatedCursor
          positions={cursorPositions}
          clickFrames={[48]}
          startFrame={10}
        />
      )}
    </AbsoluteFill>
  );
};
