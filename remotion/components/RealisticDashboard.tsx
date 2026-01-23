import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

interface RealisticDashboardProps {
  showIncomingCall?: boolean;
  incomingCallPulse?: boolean;
  highlightCalendar?: boolean;
  highlightChat?: boolean;
}

export const RealisticDashboard: React.FC<RealisticDashboardProps> = ({
  showIncomingCall = false,
  incomingCallPulse = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Top navigation items (matching real DentistAppShell)
  const navItems = [
    { label: 'Dashboard', active: true },
    { label: 'Patients', active: false },
    { label: 'Appointments', active: false },
    { label: 'Messages', active: false },
  ];

  // Quick actions (matching real ClinicalToday)
  const quickActions = [
    { icon: '+', label: 'New Appointment', color: '#3b82f6' },
    { icon: '👥', label: 'Patients', color: '#a855f7' },
    { icon: '📅', label: 'Schedule', color: '#10b981' },
    { icon: '📄', label: 'Records', color: '#f97316' },
  ];

  // Stats matching real ClinicalToday dashboard
  const stats = [
    { label: "Today's Appointments", value: '8', gradient: 'linear-gradient(135deg, #3b82f6, #06b6d4)' },
    { label: 'Pending Approvals', value: '3', gradient: 'linear-gradient(135deg, #f59e0b, #f97316)' },
    { label: 'Completed This Week', value: '24', gradient: 'linear-gradient(135deg, #22c55e, #10b981)' },
    { label: 'Total Patients', value: '156', gradient: 'linear-gradient(135deg, #6366f1, #3b82f6)' },
  ];

  // Today's appointments (matching real dashboard style)
  const todayAppointments = [
    { time: '09:00', patient: 'Sarah Johnson', reason: 'Routine Checkup', status: 'completed' },
    { time: '10:30', patient: 'Michael Chen', reason: 'Root Canal Treatment', status: 'confirmed', urgency: 'high' },
    { time: '13:00', patient: 'Emma Davis', reason: 'Consultation', status: 'confirmed' },
    { time: '14:30', patient: 'James Wilson', reason: 'Filling Replacement', status: 'pending' },
  ];

  // Animation springs
  const containerOpacity = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 100 },
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e', border: 'rgba(34, 197, 94, 0.2)' };
      case 'confirmed':
        return { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6', border: 'rgba(59, 130, 246, 0.2)' };
      case 'pending':
        return { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.1)', text: '#94a3b8', border: 'rgba(148, 163, 184, 0.2)' };
    }
  };

  return (
    <div
      style={{
        width: '1800px',
        height: '1000px',
        background: '#ffffff',
        borderRadius: '20px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '"Inter", "DM Sans", system-ui, -apple-system, sans-serif',
        opacity: containerOpacity,
        boxShadow: '0 25px 80px rgba(0, 0, 0, 0.15), 0 0 1px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* Top Navigation Bar (matching real DentistAppShell) */}
      <div
        style={{
          height: '64px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          gap: '24px',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginRight: '24px',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
            }}
          >
            🦷
          </div>
          <span
            style={{
              fontSize: '18px',
              fontWeight: '700',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.5px',
            }}
          >
            Caberu
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {navItems.map((item, index) => {
          const itemOpacity = spring({
            frame: frame - index * 2,
            fps,
            config: { damping: 15 },
          });

          return (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '10px',
                background: item.active ? '#18181b' : 'transparent',
                color: item.active ? '#ffffff' : '#64748b',
                fontSize: '14px',
                fontWeight: '500',
                opacity: itemOpacity,
                transition: 'all 0.2s ease',
              }}
            >
              {item.label}
            </div>
          );
        })}
      </nav>

      {/* Right side: Notifications & User */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Incoming Call Notification in header */}
        {showIncomingCall && (
          <div
            style={{
              padding: '10px 16px',
              background: incomingCallPulse
                ? `linear-gradient(135deg, rgba(34, 197, 94, ${0.15 + Math.sin(frame / 5) * 0.1}) 0%, rgba(22, 163, 74, ${0.1 + Math.sin(frame / 5) * 0.1}) 100%)`
                : 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.08) 100%)',
              borderRadius: '12px',
              border: `1px solid ${incomingCallPulse ? `rgba(34, 197, 94, ${0.4 + Math.sin(frame / 5) * 0.2})` : 'rgba(34, 197, 94, 0.3)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: incomingCallPulse
                ? `0 0 20px rgba(34, 197, 94, ${0.2 + Math.sin(frame / 5) * 0.15})`
                : '0 2px 8px rgba(34, 197, 94, 0.1)',
              transform: incomingCallPulse ? `scale(${1 + Math.sin(frame / 5) * 0.015})` : 'scale(1)',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
              }}
            >
              📞
            </div>
            <div>
              <div style={{ color: '#16a34a', fontSize: '13px', fontWeight: '600' }}>
                Incoming Call
              </div>
              <div style={{ color: '#22c55e', fontSize: '11px' }}>
                New patient inquiry
              </div>
            </div>
          </div>
        )}

        {/* Notification Bell */}
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            position: 'relative',
            color: '#64748b',
          }}
        >
          🔔
          <div
            style={{
              position: 'absolute',
              top: '6px',
              right: '6px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#ef4444',
            }}
          />
        </div>

        {/* User Avatar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '6px 12px 6px 8px',
            borderRadius: '10px',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: '600',
              fontSize: '12px',
            }}
          >
            DS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#18181b' }}>Dr. Smith</span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Dentist</span>
          </div>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>▼</span>
        </div>
      </div>
    </div>

      {/* Main Content */ }
  <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto', background: '#fafafa' }}>
    {/* Welcome Header with Gradient (enhanced to match ClinicalToday) */}
    <div
      style={{
        background: 'linear-gradient(135deg, #eff6ff 0%, #eef2ff 50%, #faf5ff 100%)',
        borderRadius: '20px',
        padding: '28px 32px',
        marginBottom: '24px',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(59, 130, 246, 0.08)',
      }}
    >
      {/* Animated background circles */}
      <div
        style={{
          position: 'absolute',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'rgba(59, 130, 246, 0.08)',
          top: '-50px',
          right: '-30px',
          transform: `translateY(${Math.sin(frame / 40) * 10}px)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '150px',
          height: '150px',
          borderRadius: '50%',
          background: 'rgba(139, 92, 246, 0.06)',
          bottom: '-40px',
          left: '30%',
          transform: `translateX(${Math.sin(frame / 35) * 8}px)`,
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: '26px', fontWeight: '700', color: '#18181b', marginBottom: '6px' }}>
          Good Morning, Dr. Smith 👋
        </div>
        <div style={{ fontSize: '15px', color: '#64748b' }}>
          Thursday, January 23, 2026 • You have 8 appointments today
        </div>
      </div>
    </div>

    {/* Quick Actions (matching ClinicalToday) */}
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '24px',
      }}
    >
      {quickActions.map((action, index) => {
        const actionScale = spring({
          frame: frame - 8 - index * 3,
          fps,
          config: { damping: 15, stiffness: 120 },
        });

        return (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px 20px',
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              transform: `scale(${actionScale})`,
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: action.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: action.icon === '+' ? '22px' : '18px',
                fontWeight: '600',
              }}
            >
              {action.icon}
            </div>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#18181b' }}>
              {action.label}
            </span>
          </div>
        );
      })}
    </div>

    {/* Stats Cards (matching ClinicalToday AnimatedStatCard) */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
      {stats.map((stat, index) => {
        const cardScale = spring({
          frame: frame - 12 - index * 4,
          fps,
          config: { damping: 15, stiffness: 120 },
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
              transform: `scale(${cardScale})`,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Gradient accent bar */}
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
            <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
              {stat.label}
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#18181b' }}>
              {stat.value}
            </div>
          </div>
        );
      })}
    </div>

    {/* Today's Schedule Card (matching ClinicalToday) */}
    <div
      style={{
        background: '#ffffff',
        borderRadius: '14px',
        border: '1px solid rgba(0, 0, 0, 0.06)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '18px 24px',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h2 style={{ fontSize: '17px', fontWeight: '600', color: '#18181b', margin: 0 }}>
          Today's Schedule
        </h2>
        <div
          style={{
            padding: '8px 16px',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
          }}
        >
          <span style={{ fontSize: '14px' }}>+</span>
          New Appointment
        </div>
      </div>

      <div style={{ padding: '12px 16px' }}>
        {todayAppointments.map((apt, index) => {
          const itemOpacity = spring({
            frame: frame - 20 - index * 4,
            fps,
            config: { damping: 15 },
          });

          const statusStyle = getStatusStyle(apt.status);

          return (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px 20px',
                marginBottom: '8px',
                background: '#fafafa',
                borderRadius: '12px',
                border: '1px solid rgba(0, 0, 0, 0.04)',
                opacity: itemOpacity,
                transition: 'all 0.2s ease',
              }}
            >
              {/* Time */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  minWidth: '60px',
                }}
              >
                <span style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>⏰</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#18181b' }}>
                  {apt.time}
                </span>
              </div>

              {/* Patient Info */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '15px', fontWeight: '600', color: '#18181b' }}>
                    {apt.patient}
                  </span>
                  {apt.urgency === 'high' && (
                    <span
                      style={{
                        padding: '2px 8px',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '6px',
                        color: '#dc2626',
                        fontSize: '11px',
                        fontWeight: '600',
                      }}
                    >
                      Urgent
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '13px', color: '#64748b' }}>{apt.reason}</span>
              </div>

              {/* Status Badge */}
              <div
                style={{
                  padding: '6px 14px',
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
              </div>
            </div>
          );
        })}

        {/* View All Button */}
        <div
          style={{
            marginTop: '12px',
            padding: '12px',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            borderRadius: '10px',
            textAlign: 'center',
            color: '#64748b',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
          }}
        >
          View All Appointments
        </div>
      </div>
    </div>
  </div>
    </div >
  );
};
