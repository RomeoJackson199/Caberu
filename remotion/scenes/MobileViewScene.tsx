import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

/**
 * MobileViewScene - Shows the PWA mobile app experience
 * Features phone mockup with the patient portal mobile view
 */
export const MobileViewScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phone entrance animation
  const phoneScale = spring({
    frame: frame - 5,
    fps,
    from: 0.7,
    to: 1,
    config: { damping: 15, stiffness: 100 },
  });

  const phoneOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Notification appearing
  const notificationOpacity = spring({
    frame: frame - 40,
    fps,
    from: 0,
    to: 1,
    config: { damping: 15, stiffness: 100 },
  });

  const notificationY = spring({
    frame: frame - 40,
    fps,
    from: -50,
    to: 0,
    config: { damping: 15, stiffness: 100 },
  });

  // Appointments on mobile
  const mobileAppointments = [
    { time: '10:30 AM', date: 'Tomorrow', reason: 'Checkup', status: 'confirmed' },
    { time: '2:00 PM', date: 'Feb 15', reason: 'Consultation', status: 'pending' },
  ];

  // Quick action icons
  const quickActions = [
    { icon: '📅', label: 'Book' },
    { icon: '💬', label: 'Chat' },
    { icon: '📋', label: 'Records' },
    { icon: '⚙️', label: 'Settings' },
  ];

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #312e81 100%)',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: '"DM Sans", system-ui, sans-serif',
      }}
    >
      {/* Background elements */}
      <div
        style={{
          position: 'absolute',
          width: '800px',
          height: '800px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 60%)',
          top: '-200px',
          right: '-200px',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 60%)',
          bottom: '-200px',
          left: '-200px',
        }}
      />

      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
          opacity: interpolate(frame, [10, 25], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        <div
          style={{
            fontSize: '52px',
            fontWeight: '700',
            color: '#ffffff',
            marginBottom: '12px',
          }}
        >
          Works on Any Device
        </div>
        <div
          style={{
            fontSize: '22px',
            color: 'rgba(255, 255, 255, 0.7)',
          }}
        >
          Progressive Web App • Install on iOS & Android
        </div>
      </div>

      {/* Realistic iPhone 15 Pro Mockup */}
      <div
        style={{
          position: 'relative',
          transform: `scale(${phoneScale})`,
          opacity: phoneOpacity,
        }}
      >
        {/* Phone Frame - Titanium style */}
        <div
          style={{
            width: '390px',
            height: '844px',
            background: 'linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 50%, #0f0f0f 100%)',
            borderRadius: '55px',
            padding: '3px',
            boxShadow: `
              0 50px 100px rgba(0, 0, 0, 0.6),
              0 0 0 1px rgba(255, 255, 255, 0.08),
              inset 0 1px 0 rgba(255, 255, 255, 0.1),
              0 0 80px rgba(59, 130, 246, 0.15)
            `,
            position: 'relative',
          }}
        >
          {/* Side Buttons - Volume */}
          <div
            style={{
              position: 'absolute',
              left: '-3px',
              top: '180px',
              width: '4px',
              height: '35px',
              background: 'linear-gradient(180deg, #3a3a3a 0%, #1a1a1a 100%)',
              borderRadius: '2px 0 0 2px',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '-3px',
              top: '230px',
              width: '4px',
              height: '60px',
              background: 'linear-gradient(180deg, #3a3a3a 0%, #1a1a1a 100%)',
              borderRadius: '2px 0 0 2px',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '-3px',
              top: '305px',
              width: '4px',
              height: '60px',
              background: 'linear-gradient(180deg, #3a3a3a 0%, #1a1a1a 100%)',
              borderRadius: '2px 0 0 2px',
            }}
          />
          {/* Side Button - Power */}
          <div
            style={{
              position: 'absolute',
              right: '-3px',
              top: '260px',
              width: '4px',
              height: '80px',
              background: 'linear-gradient(180deg, #3a3a3a 0%, #1a1a1a 100%)',
              borderRadius: '0 2px 2px 0',
            }}
          />

          {/* Inner bezel */}
          <div
            style={{
              width: '100%',
              height: '100%',
              background: '#000000',
              borderRadius: '52px',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* Dynamic Island */}
            <div
              style={{
                position: 'absolute',
                top: '12px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '126px',
                height: '37px',
                background: '#000000',
                borderRadius: '20px',
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: '12px',
              }}
            >
              {/* Camera lens */}
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 30% 30%, #1e3a5f 0%, #0a1628 60%, #000 100%)',
                  boxShadow: 'inset 0 0 2px rgba(255,255,255,0.3)',
                }}
              />
            </div>

            {/* Screen Content */}
            <div
              style={{
                width: '100%',
                height: '100%',
                background: '#ffffff',
                borderRadius: '52px',
                overflow: 'hidden',
              }}
            >
              {/* Status bar */}
              <div
                style={{
                  height: '54px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  padding: '0 32px 8px',
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: '600',
                }}
              >
                <span>9:41</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px' }}>5G</span>
                  <span>📶</span>
                  <span>🔋</span>
                </span>
              </div>

              {/* App Header */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  padding: '16px 24px 32px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '26px',
                      border: '2px solid rgba(255,255,255,0.3)',
                    }}
                  >
                    👩
                  </div>
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px', marginBottom: '2px' }}>
                      Good Morning
                    </div>
                    <div style={{ color: 'white', fontSize: '26px', fontWeight: '700' }}>
                      Sarah 👋
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div style={{ padding: '20px', marginTop: '-20px' }}>
                {/* Quick Actions */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '10px',
                    marginBottom: '20px',
                  }}
                >
                  {quickActions.map((action, index) => {
                    const actionScale = spring({
                      frame: frame - 20 - index * 4,
                      fps,
                      from: 0.5,
                      to: 1,
                      config: { damping: 12, stiffness: 150 },
                    });

                    return (
                      <div
                        key={index}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '14px 6px',
                          background: '#ffffff',
                          borderRadius: '16px',
                          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0,0,0,0.04)',
                          transform: `scale(${actionScale})`,
                        }}
                      >
                        <span style={{ fontSize: '24px' }}>{action.icon}</span>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                          {action.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Upcoming Section */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '17px', fontWeight: '700', color: '#18181b', marginBottom: '12px' }}>
                    Upcoming
                  </div>

                  {mobileAppointments.map((apt, index) => {
                    const cardOpacity = spring({
                      frame: frame - 35 - index * 6,
                      fps,
                      from: 0,
                      to: 1,
                      config: { damping: 15 },
                    });

                    return (
                      <div
                        key={index}
                        style={{
                          padding: '14px',
                          background: '#f8fafc',
                          borderRadius: '16px',
                          marginBottom: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          opacity: cardOpacity,
                          border: '1px solid rgba(0,0,0,0.04)',
                        }}
                      >
                        <div
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '14px',
                            background: apt.status === 'confirmed'
                              ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                              : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '20px',
                            boxShadow: apt.status === 'confirmed'
                              ? '0 4px 12px rgba(34, 197, 94, 0.3)'
                              : '0 4px 12px rgba(245, 158, 11, 0.3)',
                          }}
                        >
                          📅
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '15px', fontWeight: '600', color: '#18181b' }}>
                            {apt.reason}
                          </div>
                          <div style={{ fontSize: '13px', color: '#64748b' }}>
                            {apt.date} • {apt.time}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: '18px',
                            color: '#cbd5e1',
                            fontWeight: '300',
                          }}
                        >
                          ›
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* AI Chat Prompt Card */}
                <div
                  style={{
                    padding: '16px',
                    background: 'linear-gradient(135deg, #eff6ff 0%, #eef2ff 100%)',
                    borderRadius: '16px',
                    border: '1px solid rgba(59, 130, 246, 0.1)',
                    opacity: spring({
                      frame: frame - 50,
                      fps,
                      from: 0,
                      to: 1,
                      config: { damping: 15 },
                    }),
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '18px' }}>✨</span>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#3b82f6' }}>
                      AI Assistant
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
                    Ask me anything about your dental health!
                  </div>
                </div>
              </div>

              {/* Bottom Navigation - iOS style */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '88px',
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(20px)',
                  borderTop: '1px solid rgba(0, 0, 0, 0.06)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-around',
                  paddingTop: '10px',
                }}
              >
                {[
                  { icon: '🏠', label: 'Home', active: true },
                  { icon: '📅', label: 'Appts', active: false },
                  { icon: '💬', label: 'Chat', active: false },
                  { icon: '👤', label: 'Profile', active: false },
                ].map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <div
                      style={{
                        width: '48px',
                        height: '32px',
                        borderRadius: '16px',
                        background: item.active ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                      }}
                    >
                      {item.icon}
                    </div>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: '500',
                        color: item.active ? '#3b82f6' : '#94a3b8'
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Home Indicator */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '8px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '134px',
                  height: '5px',
                  background: '#000',
                  borderRadius: '3px',
                  opacity: 0.2,
                }}
              />

              {/* Push Notification */}
              {frame > 40 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '58px',
                    left: '8px',
                    right: '8px',
                    padding: '14px 16px',
                    background: 'rgba(255, 255, 255, 0.98)',
                    borderRadius: '20px',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0,0,0,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    opacity: notificationOpacity,
                    transform: `translateY(${notificationY}px)`,
                  }}
                >
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                    }}
                  >
                    🦷
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#18181b' }}>
                      Caberu
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                      Reminder: Checkup tomorrow at 10:30 AM
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>now</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Feature pills */}
      <div
        style={{
          position: 'absolute',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '16px',
          opacity: interpolate(frame, [30, 45], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        {['Push Notifications', 'Offline Support', 'One-Tap Booking'].map((feature, index) => {
          const pillScale = spring({
            frame: frame - 35 - index * 5,
            fps,
            from: 0.8,
            to: 1,
            config: { damping: 12, stiffness: 200 },
          });

          return (
            <div
              key={index}
              style={{
                padding: '12px 24px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '50px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
                backdropFilter: 'blur(10px)',
                transform: `scale(${pillScale})`,
              }}
            >
              {feature}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
