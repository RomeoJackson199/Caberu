import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { KineticText } from '../components/KineticText';
import { SpeedLines } from '../components/SpeedLines';

export const AIVoiceCallScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Container entrance - faster
  const containerScale = spring({
    frame,
    fps,
    from: 1.15,
    to: 1,
    config: { damping: 15, stiffness: 100 },
  });

  const containerOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Waveform bars animation - more dynamic
  const waveformBars = 40;
  const generateWaveHeight = (index: number, f: number) => {
    const baseHeight = 15;
    const maxHeight = 100;
    const frequency1 = Math.sin((f + index * 6) / 5);
    const frequency2 = Math.sin((f + index * 10) / 8);
    const frequency3 = Math.sin((f + index * 3) / 3);
    const combined = (frequency1 + frequency2 * 0.6 + frequency3 * 0.4) / 2;
    return baseHeight + (combined + 1) * 0.5 * (maxHeight - baseHeight);
  };

  // AI speaking text animation - faster typing
  const messages = [
    "Hello! This is Caberu AI Assistant.",
    "I'd like to help schedule your dental appointment.",
    "I have availability tomorrow at 2:00 PM.",
  ];

  const currentMessageIndex = Math.floor(frame / 35) % messages.length;
  const messageProgress = (frame % 35) / 35;
  const charsToShow = Math.floor(messages[currentMessageIndex].length * messageProgress);

  // Fade out - faster
  const fadeOut = interpolate(frame, [105, 120], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: '"DM Sans", system-ui, sans-serif',
        opacity: containerOpacity * fadeOut,
      }}
    >
      {/* Speed lines on entrance */}
      <SpeedLines
        direction="radial"
        color="rgba(139, 92, 246, 0.15)"
        intensity={0.6}
        startFrame={0}
        duration={15}
      />

      {/* Ambient circles - animated */}
      <div
        style={{
          position: 'absolute',
          width: '1400px',
          height: '1400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 60%)',
          transform: `scale(${1 + Math.sin(frame / 18) * 0.08})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '1000px',
          height: '1000px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 60%)',
          transform: `scale(${1 + Math.sin((frame + 30) / 22) * 0.06})`,
        }}
      />

      {/* Call Interface Card */}
      <div
        style={{
          width: '950px',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.04) 100%)',
          borderRadius: '36px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          padding: '55px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxShadow: '0 40px 120px rgba(0, 0, 0, 0.5)',
          transform: `scale(${containerScale})`,
          backdropFilter: 'blur(25px)',
        }}
      >
        {/* AI Avatar with enhanced pulse ring */}
        <div style={{ position: 'relative', marginBottom: '28px' }}>
          {/* Pulse rings - more layers */}
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '150px',
                height: '150px',
                borderRadius: '50%',
                border: `2px solid rgba(139, 92, 246, ${0.4 - i * 0.08})`,
                transform: `translate(-50%, -50%) scale(${1 + ((frame + i * 12) % 50) / 50 * 1})`,
                opacity: 1 - ((frame + i * 12) % 50) / 50,
              }}
            />
          ))}

          {/* Avatar with glow */}
          <div
            style={{
              width: '130px',
              height: '130px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 50%, #5b21b6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '55px',
              boxShadow: `0 15px 50px rgba(139, 92, 246, 0.5), 0 0 80px rgba(139, 92, 246, ${0.3 + Math.sin(frame / 8) * 0.15})`,
              border: '4px solid rgba(255, 255, 255, 0.25)',
              transform: `scale(${1 + Math.sin(frame / 6) * 0.04})`,
            }}
          >
            🤖
          </div>
        </div>

        {/* AI Label */}
        <div
          style={{
            color: '#a78bfa',
            fontSize: '17px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '4px',
            marginBottom: '8px',
          }}
        >
          Caberu AI
        </div>

        {/* Status with animated dot */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '35px',
          }}
        >
          <div
            style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: '#22c55e',
              boxShadow: `0 0 ${15 + Math.sin(frame / 6) * 5}px #22c55e`,
              transform: `scale(${1 + Math.sin(frame / 8) * 0.15})`,
            }}
          />
          <span style={{ color: '#94a3b8', fontSize: '19px', fontWeight: '500' }}>
            Speaking to patient...
          </span>
        </div>

        {/* Enhanced Waveform Visualization */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
            height: '110px',
            marginBottom: '35px',
          }}
        >
          {Array.from({ length: waveformBars }).map((_, i) => {
            const height = generateWaveHeight(i, frame);
            const hue = 255 + (i / waveformBars) * 50;
            const saturation = 70 + Math.sin(frame / 10 + i) * 10;

            return (
              <div
                key={i}
                style={{
                  width: '5px',
                  height: `${height}px`,
                  borderRadius: '3px',
                  background: `linear-gradient(180deg, hsl(${hue}, ${saturation}%, 65%) 0%, hsl(${hue}, ${saturation}%, 45%) 100%)`,
                  boxShadow: `0 0 ${8 + Math.sin(frame / 5 + i) * 4}px hsl(${hue}, 70%, 50%, 0.4)`,
                }}
              />
            );
          })}
        </div>

        {/* Current Message - typewriter effect */}
        <div
          style={{
            color: '#ffffff',
            fontSize: '26px',
            fontWeight: '400',
            textAlign: 'center',
            maxWidth: '800px',
            lineHeight: 1.5,
            minHeight: '85px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 20px',
          }}
        >
          <span style={{ opacity: 0.95 }}>
            "{messages[currentMessageIndex].slice(0, charsToShow)}"
            <span
              style={{
                opacity: frame % 15 < 8 ? 1 : 0,
                marginLeft: '2px',
                color: '#8b5cf6',
              }}
            >
              |
            </span>
          </span>
        </div>

        {/* Call Duration with enhanced styling */}
        <div
          style={{
            marginTop: '30px',
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
          }}
        >
          <div
            style={{
              padding: '14px 28px',
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(22, 163, 74, 0.15) 100%)',
              borderRadius: '14px',
              border: '1px solid rgba(34, 197, 94, 0.4)',
              color: '#86efac',
              fontSize: '17px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span style={{ fontSize: '22px' }}>📞</span>
            <span>
              0:{String(Math.floor(frame / 30)).padStart(2, '0')}
            </span>
          </div>
          
          {/* End call button (visual only) */}
          <div
            style={{
              padding: '14px 28px',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.1) 100%)',
              borderRadius: '14px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              fontSize: '17px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>End Call</span>
          </div>
        </div>
      </div>

      {/* Scene Title with kinetic text */}
      <div
        style={{
          position: 'absolute',
          bottom: '50px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '18px',
          padding: '18px 36px',
          background: 'rgba(255, 255, 255, 0.06)',
          borderRadius: '18px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          opacity: spring({
            frame: frame - 15,
            fps,
            from: 0,
            to: 1,
            config: { damping: 15 },
          }),
        }}
      >
        <div
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: '#22c55e',
            boxShadow: '0 0 12px #22c55e',
          }}
        />
        <KineticText
          text="AI handles calls 24/7 — even when you're busy"
          style="slide-left"
          startFrame={20}
          fontSize={21}
          fontWeight={600}
          color="#ffffff"
        />
      </div>

      {/* Stats badges */}
      <div
        style={{
          position: 'absolute',
          top: '40px',
          display: 'flex',
          gap: '20px',
          opacity: spring({
            frame: frame - 40,
            fps,
            from: 0,
            to: 1,
            config: { damping: 15 },
          }),
        }}
      >
        {['98% Call Answer Rate', '60% Less No-Shows'].map((stat, i) => (
          <div
            key={i}
            style={{
              padding: '10px 20px',
              background: 'rgba(34, 197, 94, 0.15)',
              borderRadius: '20px',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              color: '#86efac',
              fontSize: '15px',
              fontWeight: '600',
            }}
          >
            ✓ {stat}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
