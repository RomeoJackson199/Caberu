import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

export const AIChatMockup: React.FC = () => {
  const frame = useCurrentFrame();

  const messages = [
    { sender: 'patient', text: 'Hi! I have a toothache and need to see a dentist soon. Can you help?', time: '2:43 PM' },
    { sender: 'ai', text: 'I\'m sorry to hear you\'re experiencing tooth pain. I can definitely help schedule an appointment. On a scale of 1-10, how would you rate your pain level?', time: '2:43 PM' },
    { sender: 'patient', text: 'I\'d say about a 6. It\'s been bothering me for 2 days now', time: '2:44 PM' },
    { sender: 'ai', text: 'Thank you for that information. Given your pain level, I recommend seeing a dentist within 24-48 hours. I have emergency slots available tomorrow at 9:30 AM or 2:00 PM. Would either work for you?', time: '2:44 PM' },
    { sender: 'patient', text: 'Yes! Tomorrow at 2:00 PM would be perfect', time: '2:45 PM' },
  ];

  const headerOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        width: '1000px',
        height: '650px',
        background: 'white',
        borderRadius: '20px',
        boxShadow: '0 25px 80px rgba(0, 0, 0, 0.35), 0 0 1px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        transform: `scale(${interpolate(frame, [0, 20], [0.9, 1], { extrapolateRight: 'clamp' })})`,
      }}
    >
      {/* Header with enhanced design */}
      <div
        style={{
          background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%)',
          padding: '24px 30px',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: '18px',
          boxShadow: '0 4px 20px rgba(34, 197, 94, 0.3)',
          opacity: headerOpacity,
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            border: '3px solid rgba(255, 255, 255, 0.3)',
          }}
        >
          🤖
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '24px',
            fontWeight: 'bold',
            letterSpacing: '-0.5px',
          }}>
            Caberu AI Assistant
          </div>
          <div style={{
            fontSize: '15px',
            opacity: 0.95,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '4px',
          }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: '#86efac',
              boxShadow: '0 0 8px #86efac',
            }} />
            <span style={{ fontWeight: '500' }}>Online</span>
            <span style={{ opacity: 0.7 }}>•</span>
            <span style={{ opacity: 0.8 }}>Intelligent Triage & Booking</span>
          </div>
        </div>
      </div>

      {/* Chat Messages with enhanced animations */}
      <div
        style={{
          flex: 1,
          padding: '30px',
          background: 'linear-gradient(to bottom, #f8fafc, #f1f5f9)',
          overflowY: 'auto',
        }}
      >
        {messages.map((msg, i) => {
          const delay = i * 12;
          const opacity = interpolate(
            frame,
            [15 + delay, 30 + delay],
            [0, 1],
            { extrapolateRight: 'clamp' }
          );
          const y = interpolate(
            frame,
            [15 + delay, 30 + delay],
            [40, 0],
            { extrapolateRight: 'clamp' }
          );
          const scale = interpolate(
            frame,
            [15 + delay, 30 + delay],
            [0.9, 1],
            { extrapolateRight: 'clamp' }
          );

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: msg.sender === 'patient' ? 'flex-end' : 'flex-start',
                marginBottom: '18px',
                opacity,
                transform: `translateY(${y}px) scale(${scale})`,
              }}
            >
              <div
                style={{
                  maxWidth: '72%',
                  padding: '16px 20px',
                  borderRadius: msg.sender === 'patient' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                  background: msg.sender === 'patient'
                    ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                    : 'white',
                  color: msg.sender === 'patient' ? 'white' : '#1e293b',
                  border: msg.sender === 'ai' ? '2px solid #e2e8f0' : 'none',
                  boxShadow: msg.sender === 'patient'
                    ? '0 6px 16px rgba(59, 130, 246, 0.35)'
                    : '0 4px 12px rgba(0, 0, 0, 0.06)',
                }}
              >
                <div style={{
                  fontSize: '16px',
                  lineHeight: 1.6,
                  fontWeight: msg.sender === 'ai' ? '400' : '500',
                }}>
                  {msg.text}
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    marginTop: '8px',
                    opacity: msg.sender === 'patient' ? 0.85 : 0.6,
                    fontWeight: '500',
                  }}
                >
                  {msg.time}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing Indicator with better animation */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            padding: '16px 22px',
            background: 'white',
            borderRadius: '20px 20px 20px 4px',
            width: 'fit-content',
            border: '2px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
            opacity: interpolate(frame, [75, 88], [0, 1], { extrapolateRight: 'clamp' }),
            transform: `translateY(${interpolate(frame, [75, 88], [20, 0], { extrapolateRight: 'clamp' })}px)`,
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                opacity: Math.abs(Math.sin((frame + i * 12) / 8)) * 0.6 + 0.4,
                transform: `translateY(${Math.sin((frame + i * 12) / 6) * 3}px)`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Input Box with enhanced styling */}
      <div
        style={{
          padding: '24px 30px',
          background: 'white',
          borderTop: '2px solid #e2e8f0',
          display: 'flex',
          gap: '14px',
          alignItems: 'center',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div
          style={{
            flex: 1,
            padding: '16px 22px',
            background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
            borderRadius: '28px',
            fontSize: '16px',
            color: '#94a3b8',
            border: '2px solid #e2e8f0',
            fontWeight: '500',
          }}
        >
          💬 Type your message...
        </div>
        <div
          style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px',
            boxShadow: '0 6px 16px rgba(34, 197, 94, 0.35)',
            transform: `scale(${1 + Math.sin(frame / 15) * 0.05})`,
          }}
        >
          ➤
        </div>
      </div>
    </div>
  );
};
