import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const AIVoiceCallScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Container entrance
  const containerScale = spring({
    frame,
    fps,
    from: 1.2,
    to: 1,
    config: { damping: 20, stiffness: 80 },
  });

  const containerOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Waveform bars animation
  const waveformBars = 32;
  const generateWaveHeight = (index: number, f: number) => {
    const baseHeight = 20;
    const maxHeight = 80;
    const frequency1 = Math.sin((f + index * 8) / 6);
    const frequency2 = Math.sin((f + index * 12) / 10);
    const frequency3 = Math.sin((f + index * 4) / 4);
    const combined = (frequency1 + frequency2 * 0.5 + frequency3 * 0.3) / 1.8;
    return baseHeight + (combined + 1) * 0.5 * (maxHeight - baseHeight);
  };

  // AI speaking text animation
  const messages = [
    "Hello! This is Caberu AI Assistant calling on behalf of Dr. Smith's dental practice.",
    "I'm calling to help you schedule a dental appointment.",
    "I have availability tomorrow at 2:00 PM or Thursday at 10:30 AM.",
  ];

  const currentMessageIndex = Math.floor(frame / 50) % messages.length;
  const messageProgress = (frame % 50) / 50;

  // Fade out
  const fadeOut = interpolate(frame, [100, 118], [1, 0], {
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
      {/* Ambient circles */}
      <div
        style={{
          position: 'absolute',
          width: '1200px',
          height: '1200px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 60%)',
          transform: `scale(${1 + Math.sin(frame / 20) * 0.05})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '800px',
          height: '800px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 60%)',
          transform: `scale(${1 + Math.sin((frame + 30) / 25) * 0.05})`,
        }}
      />

      {/* Call Interface Card */}
      <div
        style={{
          width: '900px',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
          borderRadius: '32px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '50px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxShadow: '0 30px 100px rgba(0, 0, 0, 0.4)',
          transform: `scale(${containerScale})`,
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* AI Avatar with pulse ring */}
        <div style={{ position: 'relative', marginBottom: '30px' }}>
          {/* Pulse rings */}
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '140px',
                height: '140px',
                borderRadius: '50%',
                border: '2px solid rgba(139, 92, 246, 0.3)',
                transform: `translate(-50%, -50%) scale(${1 + ((frame + i * 15) % 60) / 60 * 0.8})`,
                opacity: 1 - ((frame + i * 15) % 60) / 60,
              }}
            />
          ))}

          {/* Avatar */}
          <div
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 50%, #5b21b6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '50px',
              boxShadow: '0 10px 40px rgba(139, 92, 246, 0.4)',
              border: '4px solid rgba(255, 255, 255, 0.2)',
              transform: `scale(${1 + Math.sin(frame / 8) * 0.03})`,
            }}
          >
            🤖
          </div>
        </div>

        {/* AI Label */}
        <div
          style={{
            color: '#a78bfa',
            fontSize: '16px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '3px',
            marginBottom: '8px',
          }}
        >
          Caberu AI
        </div>

        {/* Status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '35px',
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
          <span style={{ color: '#94a3b8', fontSize: '18px', fontWeight: '500' }}>
            Speaking to patient...
          </span>
        </div>

        {/* Waveform Visualization */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            height: '100px',
            marginBottom: '35px',
          }}
        >
          {Array.from({ length: waveformBars }).map((_, i) => {
            const height = generateWaveHeight(i, frame);
            const hue = 260 + (i / waveformBars) * 40;

            return (
              <div
                key={i}
                style={{
                  width: '6px',
                  height: `${height}px`,
                  borderRadius: '3px',
                  background: `linear-gradient(180deg, hsl(${hue}, 70%, 60%) 0%, hsl(${hue}, 70%, 40%) 100%)`,
                  transition: 'height 0.05s ease-out',
                  boxShadow: `0 0 10px hsl(${hue}, 70%, 50%, 0.3)`,
                }}
              />
            );
          })}
        </div>

        {/* Current Message */}
        <div
          style={{
            color: '#ffffff',
            fontSize: '24px',
            fontWeight: '400',
            textAlign: 'center',
            maxWidth: '750px',
            lineHeight: 1.6,
            minHeight: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 20px',
          }}
        >
          <span style={{ opacity: 0.9 }}>
            "{messages[currentMessageIndex].slice(0, Math.floor(messages[currentMessageIndex].length * messageProgress))}"
            <span
              style={{
                opacity: frame % 20 < 10 ? 1 : 0,
                marginLeft: '2px',
              }}
            >
              |
            </span>
          </span>
        </div>

        {/* Call Duration */}
        <div
          style={{
            marginTop: '30px',
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
          }}
        >
          <div
            style={{
              padding: '12px 24px',
              background: 'rgba(239, 68, 68, 0.15)',
              borderRadius: '12px',
              color: '#ef4444',
              fontSize: '16px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '20px' }}>📞</span>
            <span>
              0:{String(Math.floor(frame / 30)).padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>

      {/* Scene Title */}
      <div
        style={{
          position: 'absolute',
          bottom: '60px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '16px 32px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
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
        <span style={{ color: '#ffffff', fontSize: '20px', fontWeight: '600' }}>
          AI handles calls 24/7 — even when you're busy
        </span>
      </div>
    </AbsoluteFill>
  );
};
