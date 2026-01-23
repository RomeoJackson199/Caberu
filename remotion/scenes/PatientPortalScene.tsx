import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { AnimatedCursor } from '../components/AnimatedCursor';

/**
 * PatientPortalScene - Shows the patient portal booking flow
 * Matches the real PatientCareHome and PatientAppointmentsPage UI exactly
 */
export const PatientPortalScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Container animation
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

  // Stats matching real PatientCareHome AnimatedStatCard - exact Tailwind gradients
  const stats = [
    { title: 'Upcoming', value: '2', icon: '📅', suffix: ' Appointments', gradient: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)', iconBg: '#3b82f6' },
    { title: 'Total Visits', value: '12', icon: '📊', suffix: ' All time', gradient: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)', iconBg: '#a855f7' },
    { title: 'Active', value: '1', icon: '❤️', suffix: ' Prescriptions', gradient: 'linear-gradient(135deg, #22c55e 0%, #10b981 100%)', iconBg: '#22c55e' },
  ];

  // Quick actions matching real PatientCareHome - exact colors from quickActions array
  const quickActions = [
    { icon: '📅', label: 'Book Appointment', color: '#3b82f6', bgColor: '#eff6ff', description: 'Schedule a new appointment' },
    { icon: '📄', label: 'Medical Records', color: '#a855f7', bgColor: '#faf5ff', description: 'View your health history' },
    { icon: '💬', label: 'AI Dental Assistant', color: '#22c55e', bgColor: '#f0fdf4', description: 'Get instant answers' },
    { icon: '🚨', label: 'Emergency Care', color: '#ef4444', bgColor: '#fef2f2', description: 'Urgent dental issues' },
  ];

  // Appointments matching real UI
  const appointments = [
    { date: 'January 28, 2026', time: '10:30 AM', status: 'confirmed', reason: 'Routine Checkup', doctor: 'Dr. Smith' },
    { date: 'February 15, 2026', time: '2:00 PM', status: 'pending', reason: 'Consultation', doctor: 'Dr. Johnson' },
  ];

  // Cursor positions for booking interaction
  const cursorPositions = [
    { x: 960, y: 540, frame: 0 },
    { x: 280, y: 420, frame: 30 }, // Move to Book Appointment button
    { x: 280, y: 420, frame: 50 }, // Click
  ];

  // Click animation for book button
  const bookButtonScale = interpolate(frame, [48, 52, 60], [1, 0.95, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Success notification appearing
  const successOpacity = spring({
    frame: frame - 55,
    fps,
    from: 0,
    to: 1,
    config: { damping: 15, stiffness: 100 },
  });

  // Zoom effect on click - zooms into the Book Appointment button area
  const zoomProgress = spring({
    frame: frame - 48,
    fps,
    from: 0,
    to: 1,
    config: { damping: 25, stiffness: 80 },
  });

  const zoomScale = interpolate(zoomProgress, [0, 1], [1, 1.35]);
  const zoomX = interpolate(zoomProgress, [0, 1], [0, -280]);
  const zoomY = interpolate(zoomProgress, [0, 1], [0, 180]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e', border: 'rgba(34, 197, 94, 0.3)' };
      case 'pending':
        return { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.1)', text: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' };
    }
  };

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #0a0c10 0%, #111827 50%, #0f172a 100%)',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Ambient glow effects */}
      <div
        style={{
          position: 'absolute',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 60%)',
          top: '-100px',
          right: '-100px',
        }}
      />

      {/* Patient Portal Container */}
      <div
        style={{
          width: '1400px',
          height: '900px',
          background: '#ffffff',
          borderRadius: '20px',
          overflow: 'hidden',
          fontFamily: '"Inter", "DM Sans", system-ui, sans-serif',
          transform: `scale(${containerScale * zoomScale}) translate(${zoomX}px, ${zoomY}px)`,
          opacity: containerOpacity,
          boxShadow: '0 25px 80px rgba(0, 0, 0, 0.3)',
          transformOrigin: 'top right',
        }}
      >
        {/* Header matching real PatientCareHome */}
        <div
          style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #eef2ff 50%, #faf5ff 100%)',
            padding: '24px 32px',
            borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#18181b' }}>
                Good Morning, Sarah 👋
              </div>
              <div style={{ fontSize: '15px', color: '#64748b', marginTop: '4px' }}>
                Thursday, January 23, 2026
              </div>
            </div>
            <div
              style={{
                padding: '14px 24px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                borderRadius: '12px',
                color: 'white',
                fontSize: '15px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)',
                transform: `scale(${bookButtonScale})`,
                cursor: 'pointer',
              }}
            >
              <span>📅</span>
              Book Appointment
            </div>
          </div>
        </div>

        {/* Stats Cards matching AnimatedStatCard */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '20px',
            padding: '24px 32px',
          }}
        >
          {stats.map((stat, index) => {
            const cardScale = spring({
              frame: frame - 10 - index * 5,
              fps,
              from: 0.8,
              to: 1,
              config: { damping: 15, stiffness: 120 },
            });

            return (
              <div
                key={index}
                style={{
                  padding: '20px 24px',
                  background: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
                  transform: `scale(${cardScale})`,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Gradient accent */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: stat.gradient,
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', marginBottom: '4px' }}>
                      {stat.title}
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: '#18181b' }}>
                      {stat.value}
                      <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '500', marginLeft: '4px' }}>
                        {stat.suffix}
                      </span>
                    </div>
                  </div>
                  {/* Icon with gradient background - matches AnimatedStatCard */}
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: stat.gradient,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                    }}
                  >
                    {stat.icon}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions matching real QuickActions component */}
        <div style={{ padding: '0 32px 24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#18181b', marginBottom: '16px' }}>
            Quick Actions
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {quickActions.map((action, index) => {
              const actionScale = spring({
                frame: frame - 20 - index * 3,
                fps,
                from: 0.8,
                to: 1,
                config: { damping: 15, stiffness: 120 },
              });

              return (
                <div
                  key={index}
                  style={{
                    padding: '20px',
                    background: action.bgColor,
                    borderRadius: '12px',
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px',
                    transform: `scale(${actionScale})`,
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: action.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                    }}
                  >
                    {action.icon}
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#18181b', textAlign: 'center' }}>
                    {action.label}
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b', textAlign: 'center' }}>
                    {action.description}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Appointments matching real Card component */}
        <div style={{ padding: '0 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#18181b' }}>
              Upcoming Appointments
            </h2>
            <span style={{ fontSize: '14px', color: '#3b82f6', fontWeight: '500', cursor: 'pointer' }}>
              View all
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {appointments.map((apt, index) => {
              const statusStyle = getStatusColor(apt.status);
              const cardOpacity = spring({
                frame: frame - 30 - index * 5,
                fps,
                from: 0,
                to: 1,
                config: { damping: 15 },
              });

              return (
                <div
                  key={index}
                  style={{
                    padding: '20px 24px',
                    background: '#ffffff',
                    borderRadius: '14px',
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                    opacity: cardOpacity,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <span
                        style={{
                          padding: '4px 12px',
                          background: statusStyle.bg,
                          border: `1px solid ${statusStyle.border}`,
                          borderRadius: '8px',
                          color: statusStyle.text,
                          fontSize: '12px',
                          fontWeight: '600',
                          textTransform: 'capitalize',
                        }}
                      >
                        {apt.status}
                      </span>
                      <span style={{ fontSize: '15px', fontWeight: '600', color: '#18181b' }}>
                        {apt.reason}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#64748b', fontSize: '14px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        📅 {apt.date}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        🕐 {apt.time}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
                      with {apt.doctor}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '10px 20px',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      borderRadius: '10px',
                      color: '#64748b',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                    }}
                  >
                    View Details
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Success notification */}
        {frame > 55 && (
          <div
            style={{
              position: 'absolute',
              top: '100px',
              right: '40px',
              padding: '16px 24px',
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              borderRadius: '12px',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 10px 40px rgba(34, 197, 94, 0.4)',
              opacity: successOpacity,
              transform: `translateY(${(1 - successOpacity) * 20}px)`,
            }}
          >
            <span style={{ fontSize: '24px' }}>✓</span>
            <div>
              <div style={{ fontWeight: '600', fontSize: '15px' }}>Booking Confirmed!</div>
              <div style={{ fontSize: '13px', opacity: 0.9 }}>January 30, 2026 at 11:00 AM</div>
            </div>
          </div>
        )}
      </div>

      {/* Animated cursor */}
      <AnimatedCursor
        positions={cursorPositions}
        clickFrames={[50]}
        startFrame={5}
      />

      {/* Label */}
      <div
        style={{
          position: 'absolute',
          bottom: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '12px 24px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: 'white',
          fontSize: '16px',
          fontWeight: '600',
          backdropFilter: 'blur(10px)',
          opacity: interpolate(frame, [20, 35], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        Patient Portal • Self-Service Booking
      </div>
    </AbsoluteFill>
  );
};
