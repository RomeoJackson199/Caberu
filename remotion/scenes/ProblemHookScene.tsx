import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { KineticText } from '../components/KineticText';
import { SpeedLines } from '../components/SpeedLines';

/**
 * ProblemHookScene - Ultra-fast chaos montage (3 seconds)
 * Modern SaaS style: dark, intense, overwhelming
 */
export const ProblemHookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Intense shake for maximum chaos
  const shakeIntensity = interpolate(frame, [0, 45], [0, 1], { extrapolateRight: 'clamp' });
  const shakeX = Math.sin(frame * 3) * 8 * shakeIntensity;
  const shakeY = Math.cos(frame * 2.5) * 6 * shakeIntensity;

  // Problems - appear faster
  const problems = [
    { icon: '📞', text: 'Calls Unanswered', delay: 0, color: '#ef4444' },
    { icon: '📅', text: 'Double Booked', delay: 8, color: '#f97316' },
    { icon: '📝', text: 'Lost Papers', delay: 16, color: '#eab308' },
    { icon: '😤', text: 'Staff Burnout', delay: 24, color: '#dc2626' },
  ];

  // Red alert pulse - intense
  const warningPulse = Math.sin(frame / 2) * 0.15 + 0.25;

  // Quick zoom
  const zoomScale = interpolate(frame, [0, 30], [1.15, 1], {
    extrapolateRight: 'clamp',
  });

  // Fade out faster
  const fadeOut = interpolate(frame, [75, 90], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 50%, #1a1a1a 100%)',
        fontFamily: '"Inter", "DM Sans", system-ui, sans-serif',
        opacity: fadeOut,
        transform: `scale(${zoomScale})`,
      }}
    >
      {/* Intense speed lines */}
      <SpeedLines
        direction="radial"
        color="rgba(239, 68, 68, 0.2)"
        intensity={1}
        startFrame={8}
        duration={70}
      />

      {/* Red warning overlay - more intense */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at center, rgba(220, 38, 38, ${warningPulse}) 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Chaos elements */}
      <div
        style={{
          position: 'absolute',
          transform: `translate(${shakeX}px, ${shakeY}px)`,
          width: '100%',
          height: '100%',
        }}
      >
        {/* Phone ringing - aggressive */}
        <div
          style={{
            position: 'absolute',
            left: '10%',
            top: '15%',
            fontSize: '120px',
            transform: `rotate(${Math.sin(frame * 5) * 25}deg) scale(${1 + Math.sin(frame * 4) * 0.15})`,
            filter: 'drop-shadow(0 0 40px rgba(239, 68, 68, 0.8))',
          }}
        >
          📞
        </div>

        {/* Notification explosion */}
        <div
          style={{
            position: 'absolute',
            right: '12%',
            top: '12%',
            fontSize: '60px',
            opacity: interpolate(frame, [5, 15], [0, 1], { extrapolateRight: 'clamp' }),
            transform: `scale(${1 + Math.sin(frame * 2.5) * 0.2})`,
          }}
        >
          🔔❗❗
        </div>

        {/* Calendar chaos */}
        <div
          style={{
            position: 'absolute',
            right: '20%',
            top: '30%',
            fontSize: '90px',
            opacity: interpolate(frame, [8, 18], [0, 1], { extrapolateRight: 'clamp' }),
            transform: `rotate(${Math.sin(frame / 10) * 8}deg)`,
          }}
        >
          📅❌
        </div>

        {/* Flying papers - more dynamic */}
        {[...Array(9)].map((_, i) => {
          const baseY = 20 + (i % 3) * 25;
          const floatY = Math.sin((frame / 6) + i * 1.8) * 30;
          const rotation = frame * (3 + i * 0.6) + i * 50;
          const scale = 0.7 + Math.sin(frame / 8 + i) * 0.3;

          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${15 + i * 9}%`,
                top: `${baseY + floatY}%`,
                fontSize: `${40 + i * 4}px`,
                transform: `rotate(${rotation}deg) scale(${scale})`,
                opacity: 0.8,
              }}
            >
              📄
            </div>
          );
        })}

        {/* Stressed staff - bigger */}
        <div
          style={{
            position: 'absolute',
            left: '42%',
            bottom: '28%',
            fontSize: '140px',
            transform: `scale(${1 + Math.sin(frame / 3) * 0.1})`,
            filter: 'drop-shadow(0 0 30px rgba(255, 255, 255, 0.3))',
          }}
        >
          🤯
        </div>

        {/* Money flying away */}
        <div
          style={{
            position: 'absolute',
            right: '8%',
            bottom: '32%',
            fontSize: '70px',
            opacity: interpolate(frame, [20, 30], [0, 1], { extrapolateRight: 'clamp' }),
            transform: `translateY(${-frame * 2}px) rotate(${frame * 4}deg)`,
          }}
        >
          💸💸
        </div>
      </div>

      {/* Problem cards - faster */}
      <div
        style={{
          position: 'absolute',
          bottom: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '16px',
        }}
      >
        {problems.map((problem, index) => {
          const scale = spring({
            frame: frame - problem.delay,
            fps,
            from: 0,
            to: 1,
            config: { damping: 6, stiffness: 300 },
          });

          const shake = Math.sin((frame + index * 12) * 0.7) * 3;

          return (
            <div
              key={index}
              style={{
                padding: '12px 20px',
                background: `linear-gradient(135deg, ${problem.color}44, ${problem.color}22)`,
                border: `2px solid ${problem.color}`,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transform: `scale(${scale}) translateY(${shake}px)`,
                boxShadow: `0 0 40px ${problem.color}66`,
              }}
            >
              <span style={{ fontSize: '24px' }}>{problem.icon}</span>
              <span style={{ color: '#fca5a5', fontSize: '15px', fontWeight: '700' }}>
                {problem.text}
              </span>
            </div>
          );
        })}
      </div>

      {/* "Sound familiar?" - kinetic */}
      <div
        style={{
          position: 'absolute',
          top: '6%',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
        }}
      >
        <KineticText
          text="Sound familiar?"
          style="bounce"
          startFrame={35}
          fontSize={64}
          fontWeight={900}
          color="#ffffff"
        />
      </div>

      {/* Stat callout */}
      <div
        style={{
          position: 'absolute',
          bottom: '2%',
          left: '50%',
          transform: 'translateX(-50%)',
          opacity: spring({
            frame: frame - 50,
            fps,
            from: 0,
            to: 1,
            config: { damping: 15 },
          }),
        }}
      >
        <span style={{ color: '#ef4444', fontSize: '22px', fontWeight: '800' }}>
          47% of calls go unanswered
        </span>
      </div>
    </AbsoluteFill>
  );
};
