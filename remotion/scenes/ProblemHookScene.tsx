import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { KineticText } from '../components/KineticText';
import { SpeedLines } from '../components/SpeedLines';

/**
 * ProblemHookScene - Quick chaos montage showing the problems before Caberu
 * Enhanced with speed effects and kinetic text for modern SaaS style
 */
export const ProblemHookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Shake effect for chaos - intensified
  const shakeIntensity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });
  const shakeX = Math.sin(frame * 2.5) * 5 * shakeIntensity;
  const shakeY = Math.cos(frame * 2) * 4 * shakeIntensity;

  // Problems appearing faster - with revenue impact
  const problems = [
    { icon: '📞', text: 'Missed Calls', delay: 0, color: '#ef4444', stat: '$2,400/mo lost' },
    { icon: '📅', text: 'No-Shows', delay: 5, color: '#f97316', stat: '28% avg rate' },
    { icon: '📝', text: 'Paper Chaos', delay: 10, color: '#eab308', stat: '6 hrs/week' },
    { icon: '😤', text: 'Burnout', delay: 15, color: '#dc2626', stat: 'Staff turnover' },
  ];

  // Red warning overlay pulse - faster
  const warningPulse = Math.sin(frame / 3) * 0.12 + 0.18;

  // Quick zoom in effect
  const zoomScale = interpolate(frame, [0, 20], [1.1, 1], {
    extrapolateRight: 'clamp',
  });

  // Transition out - faster
  const fadeOut = interpolate(frame, [48, 60], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f1a 100%)',
        fontFamily: '"DM Sans", system-ui, sans-serif',
        opacity: fadeOut,
        transform: `scale(${zoomScale})`,
      }}
    >
      {/* Speed lines for urgency */}
      <SpeedLines 
        direction="radial" 
        color="rgba(239, 68, 68, 0.15)" 
        intensity={0.8} 
        startFrame={5} 
        duration={40} 
      />

      {/* Red warning overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `rgba(220, 38, 38, ${warningPulse})`,
          pointerEvents: 'none',
        }}
      />

      {/* Chaos elements flying around */}
      <div
        style={{
          position: 'absolute',
          transform: `translate(${shakeX}px, ${shakeY}px)`,
          width: '100%',
          height: '100%',
        }}
      >
        {/* Phone ringing animation - more aggressive */}
        <div
          style={{
            position: 'absolute',
            left: '12%',
            top: '18%',
            fontSize: '90px',
            transform: `rotate(${Math.sin(frame * 4) * 20}deg) scale(${1 + Math.sin(frame * 3) * 0.1})`,
            filter: 'drop-shadow(0 0 30px rgba(239, 68, 68, 0.7))',
          }}
        >
          📞
        </div>

        {/* Notification explosion */}
        <div
          style={{
            position: 'absolute',
            right: '15%',
            top: '15%',
            fontSize: '50px',
            opacity: interpolate(frame, [3, 10], [0, 1], { extrapolateRight: 'clamp' }),
            transform: `scale(${1 + Math.sin(frame * 2) * 0.15})`,
          }}
        >
          🔔❗
        </div>

        {/* Calendar with X marks */}
        <div
          style={{
            position: 'absolute',
            right: '22%',
            top: '28%',
            fontSize: '75px',
            opacity: interpolate(frame, [5, 12], [0, 1], { extrapolateRight: 'clamp' }),
            transform: `rotate(${Math.sin(frame / 8) * 5}deg)`,
          }}
        >
          📅❌
        </div>

        {/* Papers flying - more dynamic */}
        {[...Array(7)].map((_, i) => {
          const baseY = 25 + (i % 3) * 20;
          const floatY = Math.sin((frame / 8) + i * 1.5) * 25;
          const rotation = frame * (2 + i * 0.5) + i * 45;
          const scale = 0.8 + Math.sin(frame / 10 + i) * 0.2;
          
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${18 + i * 10}%`,
                top: `${baseY + floatY}%`,
                fontSize: `${35 + i * 3}px`,
                transform: `rotate(${rotation}deg) scale(${scale})`,
                opacity: 0.7,
              }}
            >
              📄
            </div>
          );
        })}

        {/* Stressed receptionist - bigger emphasis */}
        <div
          style={{
            position: 'absolute',
            left: '45%',
            bottom: '32%',
            fontSize: '120px',
            transform: `scale(${1 + Math.sin(frame / 4) * 0.08})`,
            filter: 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.2))',
          }}
        >
          🤯
        </div>

        {/* Money flying away */}
        <div
          style={{
            position: 'absolute',
            right: '10%',
            bottom: '35%',
            fontSize: '60px',
            opacity: interpolate(frame, [15, 22], [0, 1], { extrapolateRight: 'clamp' }),
            transform: `translateY(${-frame * 1.5}px) rotate(${frame * 3}deg)`,
          }}
        >
          💸
        </div>
      </div>

      {/* Problem cards appearing - faster and more impactful */}
      <div
        style={{
          position: 'absolute',
          bottom: '12%',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '20px',
        }}
      >
        {problems.map((problem, index) => {
          const scale = spring({
            frame: frame - problem.delay,
            fps,
            from: 0,
            to: 1,
            config: { damping: 8, stiffness: 250 },
          });

          const shake = Math.sin((frame + index * 10) * 0.5) * 2;

          return (
            <div
              key={index}
              style={{
                padding: '14px 22px',
                background: `linear-gradient(135deg, ${problem.color}33, ${problem.color}22)`,
                border: `2px solid ${problem.color}88`,
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transform: `scale(${scale}) translateY(${shake}px)`,
                boxShadow: `0 0 35px ${problem.color}55`,
              }}
            >
              <span style={{ fontSize: '26px' }}>{problem.icon}</span>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ color: '#fca5a5', fontSize: '16px', fontWeight: '700' }}>
                  {problem.text}
                </span>
                <span style={{ color: '#fca5a5', fontSize: '12px', fontWeight: '500', opacity: 0.8 }}>
                  {problem.stat}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* "Sound familiar?" text - kinetic entrance */}
      <div
        style={{
          position: 'absolute',
          top: '8%',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
        }}
      >
        <KineticText
          text="Sound familiar?"
          style="bounce"
          startFrame={25}
          fontSize={56}
          fontWeight={800}
          color="#ffffff"
        />
      </div>

      {/* Bottom stat */}
      <div
        style={{
          position: 'absolute',
          bottom: '3%',
          left: '50%',
          transform: 'translateX(-50%)',
          opacity: spring({
            frame: frame - 35,
            fps,
            from: 0,
            to: 1,
            config: { damping: 15 },
          }),
        }}
      >
        <span style={{ color: '#ef4444', fontSize: '20px', fontWeight: '700' }}>
          47% of calls go unanswered • $28,800/year lost revenue
        </span>
      </div>
    </AbsoluteFill>
  );
};
