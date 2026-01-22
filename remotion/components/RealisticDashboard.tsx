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
  highlightCalendar = false,
  highlightChat = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sidebarItems = [
    { icon: '📊', label: 'Dashboard', active: true },
    { icon: '📅', label: 'Calendar', active: false, highlight: highlightCalendar },
    { icon: '👥', label: 'Patients', active: false },
    { icon: '💬', label: 'Messages', active: false, highlight: highlightChat },
    { icon: '📋', label: 'Records', active: false },
    { icon: '💰', label: 'Billing', active: false },
    { icon: '📈', label: 'Analytics', active: false },
    { icon: '⚙️', label: 'Settings', active: false },
  ];

  const todayAppointments = [
    { time: '09:00', patient: 'Sarah Johnson', type: 'Checkup', status: 'completed' },
    { time: '10:30', patient: 'Michael Chen', type: 'Root Canal', status: 'in-progress' },
    { time: '13:00', patient: 'Emma Davis', type: 'Consultation', status: 'upcoming' },
    { time: '14:30', patient: 'James Wilson', type: 'Filling', status: 'upcoming' },
  ];

  const stats = [
    { label: 'Today\'s Appointments', value: '12', change: '+3', color: '#3b82f6' },
    { label: 'Patients This Week', value: '47', change: '+12%', color: '#22c55e' },
    { label: 'Revenue (MTD)', value: '€24,580', change: '+8%', color: '#8b5cf6' },
    { label: 'No-Show Rate', value: '2.1%', change: '-0.5%', color: '#f59e0b' },
  ];

  // Animation springs
  const containerOpacity = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 100 },
  });

  return (
    <div
      style={{
        width: '1800px',
        height: '1000px',
        background: '#0c0f14',
        borderRadius: '20px',
        overflow: 'hidden',
        display: 'flex',
        fontFamily: '"DM Sans", "Poppins", system-ui, -apple-system, sans-serif',
        opacity: containerOpacity,
        boxShadow: '0 25px 80px rgba(0, 0, 0, 0.5), 0 0 1px rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          width: '260px',
          background: 'linear-gradient(180deg, #111827 0%, #0f172a 100%)',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '8px 12px',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            }}
          >
            🦷
          </div>
          <div>
            <div style={{ color: '#ffffff', fontSize: '20px', fontWeight: '700', letterSpacing: '-0.5px' }}>
              Caberu
            </div>
            <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '500' }}>
              Healthcare Solutions
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div style={{ flex: 1 }}>
          {sidebarItems.map((item, index) => {
            const itemOpacity = spring({
              frame: frame - index * 3,
              fps,
              config: { damping: 15 },
            });

            const isHighlighted = item.highlight;
            const highlightPulse = isHighlighted ? Math.sin(frame / 8) * 0.3 + 0.7 : 0;

            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '14px 16px',
                  marginBottom: '6px',
                  borderRadius: '12px',
                  background: item.active
                    ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%)'
                    : isHighlighted
                    ? `rgba(59, 130, 246, ${highlightPulse})`
                    : 'transparent',
                  border: item.active
                    ? '1px solid rgba(59, 130, 246, 0.3)'
                    : isHighlighted
                    ? '1px solid rgba(59, 130, 246, 0.5)'
                    : '1px solid transparent',
                  cursor: 'pointer',
                  opacity: itemOpacity,
                  transition: 'all 0.2s ease',
                  boxShadow: isHighlighted ? '0 0 20px rgba(59, 130, 246, 0.4)' : 'none',
                }}
              >
                <span style={{ fontSize: '20px' }}>{item.icon}</span>
                <span
                  style={{
                    color: item.active ? '#ffffff' : '#94a3b8',
                    fontSize: '15px',
                    fontWeight: item.active ? '600' : '500',
                  }}
                >
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* User Profile */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: '700',
              fontSize: '16px',
            }}
          >
            DS
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#ffffff', fontSize: '14px', fontWeight: '600' }}>Dr. Smith</div>
            <div style={{ color: '#64748b', fontSize: '12px' }}>General Dentist</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0f1219' }}>
        {/* Top Header */}
        <div
          style={{
            padding: '20px 32px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(0, 0, 0, 0.2)',
          }}
        >
          <div>
            <div style={{ color: '#ffffff', fontSize: '28px', fontWeight: '700', letterSpacing: '-0.5px' }}>
              Good Morning, Dr. Smith 👋
            </div>
            <div style={{ color: '#64748b', fontSize: '15px', marginTop: '4px' }}>
              Thursday, January 23, 2026 • 12 appointments today
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Search */}
            <div
              style={{
                padding: '12px 20px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#64748b',
                fontSize: '14px',
              }}
            >
              🔍 Search patients, appointments...
            </div>

            {/* Notifications */}
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                position: 'relative',
              }}
            >
              🔔
              <div
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: '#ef4444',
                  border: '2px solid #0f1219',
                }}
              />
            </div>

            {/* Incoming Call Notification */}
            {showIncomingCall && (
              <div
                style={{
                  padding: '12px 20px',
                  background: incomingCallPulse
                    ? `linear-gradient(135deg, rgba(34, 197, 94, ${0.3 + Math.sin(frame / 5) * 0.2}) 0%, rgba(22, 163, 74, ${0.2 + Math.sin(frame / 5) * 0.2}) 100%)`
                    : 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(22, 163, 74, 0.15) 100%)',
                  borderRadius: '14px',
                  border: `2px solid ${incomingCallPulse ? `rgba(34, 197, 94, ${0.6 + Math.sin(frame / 5) * 0.3})` : 'rgba(34, 197, 94, 0.4)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: incomingCallPulse
                    ? `0 0 30px rgba(34, 197, 94, ${0.3 + Math.sin(frame / 5) * 0.2})`
                    : '0 4px 16px rgba(34, 197, 94, 0.2)',
                  transform: incomingCallPulse ? `scale(${1 + Math.sin(frame / 5) * 0.02})` : 'scale(1)',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    animation: incomingCallPulse ? 'none' : undefined,
                  }}
                >
                  📞
                </div>
                <div>
                  <div style={{ color: '#22c55e', fontSize: '14px', fontWeight: '700' }}>
                    Incoming Call
                  </div>
                  <div style={{ color: '#86efac', fontSize: '12px' }}>
                    New patient inquiry
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dashboard Content */}
        <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '28px' }}>
            {stats.map((stat, index) => {
              const cardScale = spring({
                frame: frame - 10 - index * 4,
                fps,
                config: { damping: 15, stiffness: 120 },
              });

              return (
                <div
                  key={index}
                  style={{
                    padding: '24px',
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    transform: `scale(${cardScale})`,
                  }}
                >
                  <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {stat.label}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                    <div style={{ color: '#ffffff', fontSize: '32px', fontWeight: '700' }}>
                      {stat.value}
                    </div>
                    <div
                      style={{
                        color: stat.change.startsWith('+') ? '#22c55e' : stat.change.startsWith('-') ? '#ef4444' : '#64748b',
                        fontSize: '14px',
                        fontWeight: '600',
                        padding: '4px 10px',
                        background: stat.change.startsWith('+') ? 'rgba(34, 197, 94, 0.1)' : stat.change.startsWith('-') ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                        borderRadius: '6px',
                      }}
                    >
                      {stat.change}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Two Column Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Today's Schedule */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '20px 24px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ color: '#ffffff', fontSize: '18px', fontWeight: '700' }}>
                  📅 Today's Schedule
                </div>
                <div
                  style={{
                    padding: '6px 14px',
                    background: 'rgba(59, 130, 246, 0.15)',
                    borderRadius: '8px',
                    color: '#60a5fa',
                    fontSize: '13px',
                    fontWeight: '600',
                  }}
                >
                  View All
                </div>
              </div>
              <div style={{ padding: '16px' }}>
                {todayAppointments.map((apt, index) => {
                  const itemOpacity = spring({
                    frame: frame - 20 - index * 5,
                    fps,
                    config: { damping: 15 },
                  });

                  const statusColors = {
                    completed: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', label: '✓ Done' },
                    'in-progress': { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6', label: '● Now' },
                    upcoming: { bg: 'rgba(148, 163, 184, 0.1)', text: '#94a3b8', label: 'Upcoming' },
                  };

                  const status = statusColors[apt.status as keyof typeof statusColors];

                  return (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '16px',
                        marginBottom: '8px',
                        background: apt.status === 'in-progress' ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                        borderRadius: '12px',
                        border: apt.status === 'in-progress' ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid transparent',
                        opacity: itemOpacity,
                      }}
                    >
                      <div
                        style={{
                          color: apt.status === 'in-progress' ? '#3b82f6' : '#64748b',
                          fontSize: '15px',
                          fontWeight: '700',
                          minWidth: '55px',
                        }}
                      >
                        {apt.time}
                      </div>
                      <div
                        style={{
                          width: '4px',
                          height: '36px',
                          borderRadius: '2px',
                          background: status.text,
                          opacity: 0.6,
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#ffffff', fontSize: '15px', fontWeight: '600' }}>
                          {apt.patient}
                        </div>
                        <div style={{ color: '#64748b', fontSize: '13px' }}>{apt.type}</div>
                      </div>
                      <div
                        style={{
                          padding: '6px 12px',
                          background: status.bg,
                          borderRadius: '8px',
                          color: status.text,
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                      >
                        {status.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Assistant Panel */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '20px 24px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                  }}
                >
                  🤖
                </div>
                <div>
                  <div style={{ color: '#ffffff', fontSize: '18px', fontWeight: '700' }}>
                    AI Assistant
                  </div>
                  <div style={{ color: '#a78bfa', fontSize: '12px', fontWeight: '500' }}>
                    3 tasks handled automatically
                  </div>
                </div>
              </div>
              <div style={{ padding: '16px' }}>
                {[
                  { icon: '📞', title: 'Answered incoming call', time: '2 min ago', desc: 'Scheduled appointment for new patient' },
                  { icon: '📧', title: 'Sent appointment reminders', time: '15 min ago', desc: '8 patients notified for tomorrow' },
                  { icon: '📋', title: 'Updated patient records', time: '1 hour ago', desc: 'Treatment notes synced from voice' },
                ].map((task, index) => {
                  const taskOpacity = spring({
                    frame: frame - 25 - index * 6,
                    fps,
                    config: { damping: 15 },
                  });

                  return (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        gap: '14px',
                        padding: '16px',
                        marginBottom: '8px',
                        background: 'rgba(139, 92, 246, 0.05)',
                        borderRadius: '12px',
                        border: '1px solid rgba(139, 92, 246, 0.1)',
                        opacity: taskOpacity,
                      }}
                    >
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: 'rgba(139, 92, 246, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px',
                        }}
                      >
                        {task.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#ffffff', fontSize: '14px', fontWeight: '600' }}>
                          {task.title}
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '2px' }}>
                          {task.desc}
                        </div>
                      </div>
                      <div style={{ color: '#64748b', fontSize: '11px', fontWeight: '500' }}>
                        {task.time}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
