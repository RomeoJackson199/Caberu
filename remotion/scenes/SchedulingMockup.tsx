import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

export const SchedulingMockup: React.FC = () => {
  const frame = useCurrentFrame();

  const appointments = [
    { time: '9:00 AM', patient: 'Sarah Johnson', type: 'Regular Checkup', status: 'confirmed', duration: '45 min' },
    { time: '10:30 AM', patient: 'Michael Chen', type: 'Root Canal Treatment', status: 'confirmed', duration: '90 min' },
    { time: '1:00 PM', patient: 'Emma Davis', type: 'Consultation', status: 'pending', duration: '30 min' },
    { time: '2:30 PM', patient: 'James Wilson', type: 'Cavity Filling', status: 'confirmed', duration: '60 min' },
    { time: '4:00 PM', patient: 'Available', type: 'Open Slot', status: 'available', duration: '60 min' },
  ];

  // Header animations
  const headerOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const headerScale = interpolate(frame, [0, 20], [0.95, 1], { extrapolateRight: 'clamp' });

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
        transform: `scale(${interpolate(frame, [0, 25], [0.9, 1], { extrapolateRight: 'clamp' })})`,
      }}
    >
      {/* Header with glass effect */}
      <div
        style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1e40af 100%)',
          padding: '30px',
          color: 'white',
          opacity: headerOpacity,
          transform: `scale(${headerScale})`,
          boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)',
        }}
      >
        <div style={{
          fontSize: '32px',
          fontWeight: 'bold',
          marginBottom: '10px',
          letterSpacing: '-0.5px',
        }}>
          📅 Today's Schedule
        </div>
        <div style={{
          fontSize: '18px',
          opacity: 0.95,
          fontWeight: '500',
        }}>
          Thursday, January 23, 2026 • 5 appointments
        </div>
      </div>

      {/* Appointments List with enhanced animations */}
      <div style={{ padding: '30px' }}>
        {appointments.map((apt, index) => {
          const delay = index * 8;
          const opacity = interpolate(
            frame,
            [25 + delay, 40 + delay],
            [0, 1],
            { extrapolateRight: 'clamp' }
          );
          const x = interpolate(
            frame,
            [25 + delay, 40 + delay],
            [-80, 0],
            { extrapolateRight: 'clamp' }
          );
          const scale = interpolate(
            frame,
            [25 + delay, 40 + delay],
            [0.92, 1],
            { extrapolateRight: 'clamp' }
          );

          const isAvailable = apt.status === 'available';
          const bgColor = isAvailable ? '#f0fdf4' : '#f8fafc';
          const borderColor = isAvailable ? '#86efac' : apt.status === 'confirmed' ? '#bfdbfe' : '#fde68a';

          return (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '20px',
                marginBottom: '14px',
                background: bgColor,
                borderRadius: '14px',
                border: `2px solid ${borderColor}`,
                opacity,
                transform: `translateX(${x}px) scale(${scale})`,
                boxShadow: `0 2px 8px ${apt.status === 'confirmed' ? 'rgba(59, 130, 246, 0.08)' : apt.status === 'available' ? 'rgba(34, 197, 94, 0.08)' : 'rgba(234, 179, 8, 0.08)'}`,
                transition: 'all 0.2s ease',
              }}
            >
              <div
                style={{
                  width: '90px',
                  fontSize: '17px',
                  fontWeight: '700',
                  color: isAvailable ? '#16a34a' : '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                🕐 {apt.time}
              </div>
              <div style={{ flex: 1, marginLeft: '20px' }}>
                <div style={{
                  fontSize: '19px',
                  fontWeight: '700',
                  color: isAvailable ? '#16a34a' : '#1e293b',
                  marginBottom: '4px',
                }}>
                  {apt.patient}
                </div>
                <div style={{
                  fontSize: '15px',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}>
                  <span>{apt.type}</span>
                  <span style={{
                    fontSize: '13px',
                    padding: '2px 8px',
                    background: '#e2e8f0',
                    borderRadius: '6px',
                  }}>
                    {apt.duration}
                  </span>
                </div>
              </div>
              <div
                style={{
                  padding: '8px 18px',
                  borderRadius: '24px',
                  fontSize: '15px',
                  fontWeight: '700',
                  background: apt.status === 'confirmed'
                    ? 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)'
                    : apt.status === 'available'
                    ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)'
                    : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                  color: apt.status === 'confirmed' ? '#166534' : apt.status === 'available' ? '#15803d' : '#854d0e',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)',
                }}
              >
                {apt.status === 'confirmed' ? '✓ Confirmed' : apt.status === 'available' ? '+ Available' : '⏳ Pending'}
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Suggestion Badge with pulse effect */}
      <div
        style={{
          position: 'absolute',
          bottom: '30px',
          right: '30px',
          padding: '14px 24px',
          background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6366f1 100%)',
          borderRadius: '16px',
          color: 'white',
          fontSize: '16px',
          fontWeight: '700',
          boxShadow: '0 10px 30px rgba(139, 92, 246, 0.5), 0 0 0 0 rgba(139, 92, 246, 0.4)',
          opacity: interpolate(frame, [55, 70], [0, 1], { extrapolateRight: 'clamp' }),
          transform: `scale(${1 + Math.sin(frame / 10) * 0.05})`,
        }}
      >
        <span style={{ marginRight: '8px', fontSize: '18px' }}>🤖</span>
        AI-Powered Scheduling
      </div>
    </div>
  );
};
