import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const WhatsAppChatScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Container entrance
  const containerScale = spring({
    frame,
    fps,
    from: 0.9,
    to: 1,
    config: { damping: 20, stiffness: 100 },
  });

  const containerOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Chat messages with typing animation
  const messages = [
    {
      type: 'received',
      text: 'Hi! I need to reschedule my appointment for next week.',
      time: '10:32 AM',
      showAt: 10,
    },
    {
      type: 'sent',
      text: 'Hello Sarah! 👋 Of course, I can help with that. Let me check Dr. Smith\'s availability for next week.',
      time: '10:32 AM',
      showAt: 35,
      isAI: true,
    },
    {
      type: 'sent',
      text: 'I found these available slots:\n• Monday 2:00 PM\n• Wednesday 10:30 AM\n• Thursday 3:00 PM\n\nWhich works best for you?',
      time: '10:33 AM',
      showAt: 65,
      isAI: true,
    },
    {
      type: 'received',
      text: 'Wednesday at 10:30 would be perfect! 🙌',
      time: '10:33 AM',
      showAt: 95,
    },
    {
      type: 'sent',
      text: '✅ Done! I\'ve rescheduled your appointment to Wednesday, January 28th at 10:30 AM.\n\nYou\'ll receive a confirmation email shortly.',
      time: '10:33 AM',
      showAt: 120,
      isAI: true,
    },
  ];

  // Fade out
  const fadeOut = interpolate(frame, [160, 178], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1a1f35 50%, #0f172a 100%)',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: '"DM Sans", system-ui, sans-serif',
        opacity: containerOpacity * fadeOut,
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: 'absolute',
          width: '800px',
          height: '800px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37, 211, 102, 0.08) 0%, transparent 60%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      {/* Scene Title */}
      <div
        style={{
          position: 'absolute',
          top: '50px',
          left: '50%',
          transform: 'translateX(-50%)',
          opacity: interpolate(frame, [5, 20], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        <div style={{ color: '#ffffff', fontSize: '48px', fontWeight: '700', textAlign: 'center', letterSpacing: '-1px' }}>
          WhatsApp Integration
        </div>
        <div style={{ color: '#94a3b8', fontSize: '22px', textAlign: 'center', marginTop: '12px' }}>
          AI responds to patient messages instantly
        </div>
      </div>

      {/* WhatsApp Phone Mockup */}
      <div
        style={{
          width: '420px',
          height: '780px',
          background: '#0b141a',
          borderRadius: '45px',
          overflow: 'hidden',
          boxShadow: '0 30px 100px rgba(0, 0, 0, 0.5), 0 0 0 8px #1a1f35, 0 0 0 10px rgba(255, 255, 255, 0.1)',
          transform: `scale(${containerScale})`,
          marginTop: '50px',
        }}
      >
        {/* Phone notch area */}
        <div
          style={{
            height: '35px',
            background: '#0b141a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '100px',
              height: '24px',
              background: '#000',
              borderRadius: '12px',
            }}
          />
        </div>

        {/* WhatsApp Header */}
        <div
          style={{
            background: '#1f2c34',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <div style={{ color: '#8696a0', fontSize: '18px' }}>←</div>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
            }}
          >
            🦷
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#e9edef', fontSize: '17px', fontWeight: '600' }}>
              Caberu Dental
            </div>
            <div style={{ color: '#8696a0', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#25d366',
                }}
              />
              Online
            </div>
          </div>
          <div style={{ display: 'flex', gap: '20px', color: '#8696a0' }}>
            <span>📹</span>
            <span>📞</span>
            <span>⋮</span>
          </div>
        </div>

        {/* Chat Background */}
        <div
          style={{
            flex: 1,
            background: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundColor: '#0b141a',
            padding: '16px',
            height: '560px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {/* Date Header */}
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <span
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#8696a0',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            >
              TODAY
            </span>
          </div>

          {/* Messages */}
          {messages.map((msg, index) => {
            const msgProgress = interpolate(
              frame,
              [msg.showAt, msg.showAt + 15],
              [0, 1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            );

            const msgScale = spring({
              frame: frame - msg.showAt,
              fps,
              config: { damping: 15, stiffness: 200 },
            });

            if (frame < msg.showAt) return null;

            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: msg.type === 'sent' ? 'flex-end' : 'flex-start',
                  opacity: msgProgress,
                  transform: `scale(${msgScale}) translateY(${(1 - msgProgress) * 20}px)`,
                  transformOrigin: msg.type === 'sent' ? 'bottom right' : 'bottom left',
                }}
              >
                <div
                  style={{
                    maxWidth: '85%',
                    padding: '10px 14px',
                    borderRadius: msg.type === 'sent' ? '12px 12px 0 12px' : '12px 12px 12px 0',
                    background: msg.type === 'sent' ? '#005c4b' : '#202c33',
                    position: 'relative',
                  }}
                >
                  {msg.isAI && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginBottom: '6px',
                        color: '#25d366',
                        fontSize: '11px',
                        fontWeight: '600',
                      }}
                    >
                      <span>🤖</span>
                      <span>AI Assistant</span>
                    </div>
                  )}
                  <div
                    style={{
                      color: '#e9edef',
                      fontSize: '14px',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {msg.text}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '4px',
                      marginTop: '4px',
                    }}
                  >
                    <span style={{ color: '#8696a0', fontSize: '11px' }}>{msg.time}</span>
                    {msg.type === 'sent' && (
                      <span style={{ color: '#53bdeb', fontSize: '14px' }}>✓✓</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {frame > 60 && frame < 95 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-start',
                opacity: interpolate(frame, [60, 65, 90, 95], [0, 1, 1, 0], { extrapolateRight: 'clamp' }),
              }}
            >
              <div
                style={{
                  background: '#202c33',
                  padding: '12px 16px',
                  borderRadius: '12px 12px 12px 0',
                  display: 'flex',
                  gap: '4px',
                }}
              >
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#8696a0',
                      opacity: 0.4 + Math.abs(Math.sin((frame + i * 8) / 6)) * 0.6,
                      transform: `translateY(${Math.sin((frame + i * 8) / 6) * 3}px)`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div
          style={{
            background: '#1f2c34',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div style={{ color: '#8696a0', fontSize: '22px' }}>😊</div>
          <div
            style={{
              flex: 1,
              background: '#2a3942',
              borderRadius: '24px',
              padding: '10px 16px',
              color: '#8696a0',
              fontSize: '15px',
            }}
          >
            Type a message
          </div>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: '#00a884',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
            }}
          >
            🎤
          </div>
        </div>
      </div>

      {/* Feature Badge */}
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
          background: 'rgba(37, 211, 102, 0.1)',
          borderRadius: '16px',
          border: '1px solid rgba(37, 211, 102, 0.3)',
          opacity: interpolate(frame, [20, 35], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        <div
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: '#25d366',
            boxShadow: '0 0 10px #25d366',
          }}
        />
        <span style={{ color: '#25d366', fontSize: '18px', fontWeight: '600' }}>
          Patients can message 24/7 — AI responds instantly
        </span>
      </div>
    </AbsoluteFill>
  );
};
