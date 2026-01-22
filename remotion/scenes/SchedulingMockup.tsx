import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

export const SchedulingMockup: React.FC = () => {
  const frame = useCurrentFrame();

  const appointments = [
    { time: '9:00 AM', patient: 'Sarah Johnson', type: 'Cleaning', status: 'confirmed' },
    { time: '10:30 AM', patient: 'Michael Chen', type: 'Root Canal', status: 'confirmed' },
    { time: '1:00 PM', patient: 'Emma Davis', type: 'Consultation', status: 'pending' },
    { time: '2:30 PM', patient: 'James Wilson', type: 'Filling', status: 'confirmed' },
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
      }}
    >
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
          padding: '24px',
          color: 'white',
        }}
      >
        <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
          Today's Appointments
        </div>
        <div style={{ fontSize: '16px', opacity: 0.9 }}>
          Thursday, January 23, 2026
        </div>
      </div>

      {/* Appointments List */}
      <div style={{ padding: '24px' }}>
        {appointments.map((apt, index) => {
          const delay = index * 10;
          const opacity = interpolate(
            frame,
            [30 + delay, 45 + delay],
            [0, 1],
            { extrapolateRight: 'clamp' }
          );
          const x = interpolate(
            frame,
            [30 + delay, 45 + delay],
            [-50, 0],
            { extrapolateRight: 'clamp' }
          );

          return (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '16px',
                marginBottom: '12px',
                background: '#f8fafc',
                borderRadius: '12px',
                border: '2px solid #e2e8f0',
                opacity,
                transform: `translateX(${x}px)`,
              }}
            >
              <div
                style={{
                  width: '80px',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#3b82f6',
                }}
              >
                {apt.time}
              </div>
              <div style={{ flex: 1, marginLeft: '16px' }}>
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
                  {apt.patient}
                </div>
                <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
                  {apt.type}
                </div>
              </div>
              <div
                style={{
                  padding: '6px 16px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  background: apt.status === 'confirmed' ? '#dcfce7' : '#fef3c7',
                  color: apt.status === 'confirmed' ? '#166534' : '#854d0e',
                }}
              >
                {apt.status === 'confirmed' ? '✓ Confirmed' : '⏳ Pending'}
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Suggestion Badge */}
      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          right: '24px',
          padding: '12px 20px',
          background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
          borderRadius: '12px',
          color: 'white',
          fontSize: '14px',
          fontWeight: '600',
          boxShadow: '0 8px 20px rgba(139, 92, 246, 0.4)',
          opacity: interpolate(frame, [60, 75], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        🤖 AI optimized scheduling
      </div>
    </div>
  );
};
