import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { springConfigs } from '../../utils/animations';

/**
 * Connected Scene - Chat messaging animations
 * Duration: 120 frames (4 seconds @ 30fps)
 * Mobile-optimized
 */
export const ConnectedScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const messages = [
    {
      from: 'dentist',
      name: 'Dr. Sarah',
      text: 'Your appointment is confirmed for tomorrow at 9:00 AM',
      delay: 8,
    },
    {
      from: 'user',
      name: 'You',
      text: 'Thank you! Do I need to prepare anything?',
      delay: 35,
    },
    {
      from: 'dentist',
      name: 'Dr. Sarah',
      text: 'Just remember not to eat 2 hours before. See you then! 😊',
      delay: 60,
    },
  ];

  // Header animation
  const headerOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Typing indicator
  const showTyping = frame > 50 && frame < 60;
  const dot1 = Math.sin(frame * 0.5) * 0.5 + 0.5;
  const dot2 = Math.sin(frame * 0.5 + 1) * 0.5 + 0.5;
  const dot3 = Math.sin(frame * 0.5 + 2) * 0.5 + 0.5;

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(180deg, #0f172a 0%, #172554 50%, #1e1b4b 100%)',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: '"Inter", "DM Sans", system-ui, sans-serif',
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: 'absolute',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 70%)',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      />

      {/* Chat container */}
      <div
        style={{
          width: '290px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {/* Chat header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 14px',
            background: 'rgba(255, 255, 255, 0.06)',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            marginBottom: '8px',
            opacity: headerOpacity,
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              flexShrink: 0,
            }}
          >
            👩‍⚕️
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>Dr. Sarah M.</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#22c55e',
                }}
              />
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Online</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        {messages.map((msg, i) => {
          const msgScale = spring({
            frame: frame - msg.delay,
            fps,
            from: 0.7,
            to: 1,
            config: springConfigs.bouncy,
          });
          const msgOpacity = interpolate(frame, [msg.delay, msg.delay + 10], [0, 1], {
            extrapolateRight: 'clamp',
          });
          const msgY = spring({
            frame: frame - msg.delay,
            fps,
            from: 20,
            to: 0,
            config: springConfigs.smooth,
          });

          const isUser = msg.from === 'user';

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                opacity: msgOpacity,
                transform: `translateY(${msgY}px) scale(${msgScale})`,
              }}
            >
              <div
                style={{
                  maxWidth: '220px',
                  padding: '10px 14px',
                  borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: isUser
                    ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                    : 'rgba(255, 255, 255, 0.08)',
                  border: isUser ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: isUser ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none',
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    color: isUser ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.85)',
                    lineHeight: 1.5,
                  }}
                >
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {showTyping && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-start',
            }}
          >
            <div
              style={{
                padding: '10px 16px',
                borderRadius: '14px 14px 14px 4px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                gap: '4px',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.5)',
                  opacity: dot1,
                }}
              />
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.5)',
                  opacity: dot2,
                }}
              />
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.5)',
                  opacity: dot3,
                }}
              />
            </div>
          </div>
        )}

        {/* Notification badge */}
        {frame > 85 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: '8px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '20px',
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                transform: `scale(${spring({
                  frame: frame - 85,
                  fps,
                  from: 0,
                  to: 1,
                  config: { damping: 8, stiffness: 200 },
                })})`,
              }}
            >
              <span style={{ fontSize: '12px' }}>🔔</span>
              <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 600 }}>
                Instant notifications enabled
              </span>
            </div>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
