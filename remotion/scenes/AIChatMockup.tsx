import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

export const AIChatMockup: React.FC = () => {
  const frame = useCurrentFrame();

  const messages = [
    { sender: 'patient', text: 'Hi, I need to schedule a teeth cleaning appointment', time: '2:45 PM' },
    { sender: 'ai', text: 'Hello! I\'d be happy to help you schedule a cleaning. What days work best for you?', time: '2:45 PM' },
    { sender: 'patient', text: 'Maybe next week Tuesday or Wednesday?', time: '2:46 PM' },
    { sender: 'ai', text: 'Perfect! I have availability on Tuesday at 10:30 AM or Wednesday at 2:00 PM. Which time works better?', time: '2:46 PM' },
  ];

  return (
    <div
      style={{
        width: '900px',
        height: '600px',
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
          padding: '20px 24px',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
          }}
        >
          🤖
        </div>
        <div>
          <div style={{ fontSize: '22px', fontWeight: 'bold' }}>Caberu AI Assistant</div>
          <div style={{ fontSize: '14px', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#86efac' }} />
            Online • Responding instantly
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div
        style={{
          flex: 1,
          padding: '24px',
          background: '#f8fafc',
          overflowY: 'auto',
        }}
      >
        {messages.map((msg, i) => {
          const delay = i * 15;
          const opacity = interpolate(
            frame,
            [20 + delay, 35 + delay],
            [0, 1],
            { extrapolateRight: 'clamp' }
          );
          const y = interpolate(
            frame,
            [20 + delay, 35 + delay],
            [30, 0],
            { extrapolateRight: 'clamp' }
          );

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: msg.sender === 'patient' ? 'flex-end' : 'flex-start',
                marginBottom: '16px',
                opacity,
                transform: `translateY(${y}px)`,
              }}
            >
              <div
                style={{
                  maxWidth: '70%',
                  padding: '14px 18px',
                  borderRadius: '16px',
                  background: msg.sender === 'patient' ? '#3b82f6' : 'white',
                  color: msg.sender === 'patient' ? 'white' : '#1e293b',
                  border: msg.sender === 'ai' ? '2px solid #e2e8f0' : 'none',
                  boxShadow: msg.sender === 'patient' ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none',
                }}
              >
                <div style={{ fontSize: '15px', lineHeight: 1.5 }}>{msg.text}</div>
                <div
                  style={{
                    fontSize: '12px',
                    marginTop: '6px',
                    opacity: 0.7,
                  }}
                >
                  {msg.time}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing Indicator */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            padding: '14px 18px',
            background: 'white',
            borderRadius: '16px',
            width: 'fit-content',
            border: '2px solid #e2e8f0',
            opacity: interpolate(frame, [80, 95], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#22c55e',
                opacity: Math.abs(Math.sin((frame + i * 10) / 10)) * 0.5 + 0.5,
              }}
            />
          ))}
        </div>
      </div>

      {/* Input Box */}
      <div
        style={{
          padding: '20px',
          background: 'white',
          borderTop: '2px solid #e2e8f0',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            flex: 1,
            padding: '14px 18px',
            background: '#f1f5f9',
            borderRadius: '24px',
            fontSize: '15px',
            color: '#94a3b8',
          }}
        >
          Type your message...
        </div>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
          }}
        >
          ➤
        </div>
      </div>
    </div>
  );
};
