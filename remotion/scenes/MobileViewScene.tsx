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

      {/* Phone Mockup */}
      <div
        style={{
          width: '380px',
          height: '780px',
          background: '#1a1a1a',
          borderRadius: '50px',
          padding: '12px',
          boxShadow: '0 50px 100px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          transform: `scale(${phoneScale})`,
          opacity: phoneOpacity,
          position: 'relative',
        }}
      >
        {/* Phone notch */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '150px',
            height: '35px',
            background: '#1a1a1a',
            borderRadius: '0 0 20px 20px',
            zIndex: 10,
          }}
        />

        {/* Phone screen */}
        <div
          style={{
            width: '100%',
            height: '100%',
            background: '#ffffff',
            borderRadius: '40px',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Status bar */}
          <div
            style={{
              height: '50px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              padding: '0 24px 10px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            <span>9:41</span>
            <span>📶 🔋</span>
          </div>

          {/* App Header */}
          <div
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              padding: '20px 24px 30px',
            }}
          >
            <div style={{ color: 'white', fontSize: '14px', opacity: 0.9, marginBottom: '4px' }}>
              Good Morning
            </div>
            <div style={{ color: 'white', fontSize: '24px', fontWeight: '700' }}>
              Sarah 👋
            </div>
          </div>

          {/* Content */}
          <div style={{ padding: '20px', marginTop: '-15px' }}>
            {/* Quick Actions */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '12px',
                marginBottom: '24px',
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
                      gap: '8px',
                      padding: '16px 8px',
                      background: '#ffffff',
                      borderRadius: '16px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                      transform: `scale(${actionScale})`,
                    }}
                  >
                    <span style={{ fontSize: '28px' }}>{action.icon}</span>
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                      {action.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Upcoming Section */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#18181b', marginBottom: '12px' }}>
                Upcoming Appointments
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
                      padding: '16px',
                      background: '#f8fafc',
                      borderRadius: '14px',
                      marginBottom: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      opacity: cardOpacity,
                    }}
                  >
                    <div
                      style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '12px',
                        background: apt.status === 'confirmed'
                          ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                          : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '20px',
                      }}
                    >
                      📅
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '15px', fontWeight: '600', color: '#18181b' }}>
                        {apt.reason}
                      </div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>
                        {apt.date} at {apt.time}
                      </div>
                    </div>
                    <div style={{ fontSize: '14px', color: '#94a3b8' }}>›</div>
                  </div>
                );
              })}
            </div>

            {/* Health Tip Card */}
            <div
              style={{
                padding: '16px',
                background: 'linear-gradient(135deg, #eff6ff 0%, #eef2ff 100%)',
                borderRadius: '14px',
                opacity: spring({
                  frame: frame - 50,
                  fps,
                  from: 0,
                  to: 1,
                  config: { damping: 15 },
                }),
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span>💡</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#3b82f6' }}>
                  Health Tip
                </span>
              </div>
              <div style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
                Remember to brush twice daily for optimal dental health!
              </div>
            </div>
          </div>

          {/* Bottom Navigation */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '80px',
              background: '#ffffff',
              borderTop: '1px solid rgba(0, 0, 0, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
              padding: '0 20px 20px',
            }}
          >
            {['🏠', '📅', '💬', '👤'].map((icon, i) => (
              <div
                key={i}
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '14px',
                  background: i === 0 ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                }}
              >
                {icon}
              </div>
            ))}
          </div>

          {/* Push Notification */}
          {frame > 40 && (
            <div
              style={{
                position: 'absolute',
                top: '60px',
                left: '12px',
                right: '12px',
                padding: '14px 16px',
                background: 'rgba(255, 255, 255, 0.98)',
                borderRadius: '16px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                opacity: notificationOpacity,
                transform: `translateY(${notificationY}px)`,
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
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
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#18181b' }}>
                  Appointment Reminder
                </div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  Your checkup is tomorrow at 10:30 AM
                </div>
              </div>
            </div>
          )}
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
