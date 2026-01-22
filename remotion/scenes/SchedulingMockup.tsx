import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';

export const SchedulingMockup: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const appointments = [
    { time: '9:00', patient: 'Sarah Johnson', type: 'Regular Checkup', status: 'confirmed', duration: 60, dentist: 'Dr. Smith' },
    { time: '10:30', patient: 'Michael Chen', type: 'Root Canal', status: 'confirmed', duration: 90, dentist: 'Dr. Johnson' },
    { time: '13:00', patient: 'Emma Davis', type: 'Consultation', status: 'pending', duration: 30, dentist: 'Dr. Smith' },
    { time: '14:30', patient: 'James Wilson', type: 'Cavity Filling', status: 'confirmed', duration: 60, dentist: 'Dr. Smith' },
    { time: '16:00', patient: 'Lisa Anderson', type: 'Teeth Cleaning', status: 'completed', duration: 45, dentist: 'Dr. Johnson' },
  ];

  // Smoother header animations with spring
  const headerOpacity = spring({
    frame: frame,
    fps,
    config: { damping: 15, stiffness: 100 },
  });

  const headerScale = spring({
    frame: frame,
    fps,
    from: 0.9,
    to: 1,
    config: { damping: 18, stiffness: 120 },
  });

  const containerScale = spring({
    frame: frame,
    fps,
    from: 0.85,
    to: 1,
    config: { damping: 20, stiffness: 100 },
  });

  return (
    <div
      style={{
        width: '1000px',
        height: '650px',
        background: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25), 0 0 1px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        transform: `scale(${containerScale})`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header - Real App Style */}
      <div
        style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          padding: '24px 32px',
          color: 'white',
          opacity: headerOpacity,
          transform: `scale(${headerScale})`,
          boxShadow: '0 2px 12px rgba(59, 130, 246, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{
            fontSize: '28px',
            fontWeight: '700',
            marginBottom: '4px',
            letterSpacing: '-0.5px',
          }}>
            Day Calendar View
          </div>
          <div style={{
            fontSize: '15px',
            opacity: 0.9,
            fontWeight: '500',
          }}>
            Thursday, January 23, 2026 • Dr. Smith
          </div>
        </div>
        <div style={{
          padding: '10px 20px',
          background: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '12px',
          fontSize: '14px',
          fontWeight: '600',
        }}>
          5 Appointments
        </div>
      </div>

      {/* Calendar Grid - Time Slots */}
      <div style={{ flex: 1, padding: '24px', background: '#f8fafc', overflowY: 'auto' }}>
        {appointments.map((apt, index) => {
          const delay = index * 6;
          const aptOpacity = spring({
            frame: frame - (15 + delay),
            fps,
            from: 0,
            to: 1,
            config: { damping: 15, stiffness: 120 },
          });

          const aptY = spring({
            frame: frame - (15 + delay),
            fps,
            from: 40,
            to: 0,
            config: { damping: 18, stiffness: 100 },
          });

          const aptScale = spring({
            frame: frame - (15 + delay),
            fps,
            from: 0.9,
            to: 1,
            config: { damping: 16, stiffness: 110 },
          });

          const statusColors = {
            confirmed: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af', badge: '#3b82f6' },
            pending: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', badge: '#f59e0b' },
            completed: { bg: '#d1fae5', border: '#10b981', text: '#065f46', badge: '#10b981' },
          };

          const colors = statusColors[apt.status as keyof typeof statusColors];

          return (
            <div
              key={index}
              style={{
                marginBottom: '12px',
                padding: '16px 20px',
                background: colors.bg,
                borderRadius: '12px',
                border: `2px solid ${colors.border}`,
                boxShadow: `0 2px 8px ${colors.border}20`,
                opacity: aptOpacity,
                transform: `translateY(${aptY}px) scale(${aptScale})`,
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              {/* Time */}
              <div style={{
                fontSize: '16px',
                fontWeight: '700',
                color: colors.badge,
                minWidth: '60px',
              }}>
                {apt.time}
              </div>

              {/* Duration Bar */}
              <div style={{
                width: '4px',
                height: '40px',
                background: colors.badge,
                borderRadius: '2px',
                opacity: 0.6,
              }} />

              {/* Patient Info */}
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '17px',
                  fontWeight: '700',
                  color: '#1e293b',
                  marginBottom: '4px',
                }}>
                  {apt.patient}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}>
                  <span>{apt.type}</span>
                  <span>•</span>
                  <span>{apt.duration} min</span>
                  <span>•</span>
                  <span>{apt.dentist}</span>
                </div>
              </div>

              {/* Status Badge */}
              <div style={{
                padding: '6px 16px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: '700',
                background: colors.badge,
                color: 'white',
                boxShadow: `0 2px 8px ${colors.badge}40`,
              }}>
                {apt.status === 'confirmed' && '✓ Confirmed'}
                {apt.status === 'pending' && '⏳ Pending'}
                {apt.status === 'completed' && '✓ Completed'}
              </div>
            </div>
          );
        })}

        {/* Current Time Indicator */}
        <div
          style={{
            marginTop: '16px',
            padding: '12px 20px',
            background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
            borderRadius: '12px',
            border: '2px dashed #3b82f6',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            opacity: spring({
              frame: frame - 50,
              fps,
              from: 0,
              to: 1,
              config: { damping: 15 },
            }),
          }}
        >
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: '#3b82f6',
            boxShadow: '0 0 12px #3b82f6',
            animation: 'pulse 2s infinite',
          }} />
          <div style={{
            fontSize: '15px',
            fontWeight: '600',
            color: '#1e40af',
          }}>
            Current time: 3:45 PM
          </div>
        </div>
      </div>

      {/* AI Badge */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          padding: '12px 20px',
          background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
          borderRadius: '12px',
          color: 'white',
          fontSize: '14px',
          fontWeight: '700',
          boxShadow: '0 8px 24px rgba(139, 92, 246, 0.4)',
          opacity: spring({
            frame: frame - 55,
            fps,
            from: 0,
            to: 1,
            config: { damping: 12 },
          }),
          transform: `scale(${1 + Math.sin(frame / 12) * 0.03})`,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span style={{ fontSize: '16px' }}>🤖</span>
        <span>AI-Optimized Scheduling</span>
      </div>
    </div>
  );
};
