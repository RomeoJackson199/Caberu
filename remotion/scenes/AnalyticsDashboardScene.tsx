import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { AnimatedCursor } from '../components/AnimatedCursor';

/**
 * AnalyticsDashboardScene - Shows the analytics dashboard with real KPIs and charts
 * Matches the real DentistAnalytics UI exactly with KPI cards and charts
 */
export const AnalyticsDashboardScene: React.FC = () => {
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

  // KPI cards matching real DentistAnalytics (5 columns)
  const kpiCards = [
    { label: 'Revenue', value: '€12,450', sub: '+8.2% vs last', icon: '💰', color: '#3b82f6' },
    { label: 'Collection rate', value: '94.2%', sub: 'within 30 days', icon: '📈', color: '#22c55e' },
    { label: 'No-show rate', value: '3.5%', sub: 'last 30 days', icon: '⚠️', color: '#f97316', isGood: true },
    { label: 'Chair utilization', value: '87.3%', sub: 'based on availability', icon: '🪑', color: '#8b5cf6' },
    { label: 'Follow-ups due', value: '12', sub: 'next 14 days', icon: '📅', color: '#ec4899' },
  ];

  // Summary cards (matching second row of KPIs)
  const summaryCards = [
    { label: 'Total Revenue — This Month', value: '€12,450', change: '+8.2%', positive: true, icon: '💰' },
    { label: 'Appointments Completed', value: '48', change: '+15.3%', positive: true, icon: '📅' },
    { label: 'Patient Retention Rate', value: '92%', change: '+2.1%', positive: true, icon: '👥' },
    { label: 'Outstanding Payments', value: '€1,240', change: '-12.5%', positive: true, icon: '⚠️', patients: 8 },
  ];

  // Chart data for revenue trend
  const revenueData = [68, 75, 82, 78, 92, 88, 98];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Cursor positions - moves through KPIs and clicks on chart
  const cursorPositions = [
    { x: 960, y: 500, frame: 0 },
    { x: 350, y: 180, frame: 15 },  // First KPI card
    { x: 650, y: 180, frame: 25 },  // Second KPI card
    { x: 1100, y: 380, frame: 40 }, // Revenue chart area
    { x: 1350, y: 550, frame: 55 }, // Peak bar in chart
    { x: 1350, y: 550, frame: 65 }, // Click on peak
  ];

  // Zoom effect when clicking on chart
  const zoomProgress = spring({
    frame: frame - 55,
    fps,
    from: 0,
    to: 1,
    config: { damping: 25, stiffness: 70 },
  });

  const zoomScale = interpolate(zoomProgress, [0, 1], [1, 1.25]);
  const zoomX = interpolate(zoomProgress, [0, 1], [0, -350]);
  const zoomY = interpolate(zoomProgress, [0, 1], [0, -180]);

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #0a0c10 0%, #111827 50%, #0f172a 100%)',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: 'absolute',
          width: '800px',
          height: '800px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 60%)',
          top: '-200px',
          left: '-200px',
        }}
      />

      {/* Dashboard Container */}
      <div
        style={{
          width: '1600px',
          height: '950px',
          background: '#ffffff',
          borderRadius: '20px',
          overflow: 'hidden',
          fontFamily: '"Inter", "DM Sans", system-ui, sans-serif',
          transform: `scale(${containerScale * zoomScale}) translate(${zoomX}px, ${zoomY}px)`,
          opacity: containerOpacity,
          boxShadow: '0 25px 80px rgba(0, 0, 0, 0.3)',
          transformOrigin: 'bottom right',
        }}
      >
        {/* Header matching real DentistAnalytics sticky header */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
            padding: '20px 32px',
            borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '26px', fontWeight: '700', color: '#18181b', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>📊</span>
              Business Dashboard
            </div>
            <div style={{ fontSize: '14px', color: '#64748b', marginTop: '2px' }}>
              Instant overview of clinic performance
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            {/* Date range selector */}
            <div
              style={{
                padding: '10px 16px',
                background: '#f1f5f9',
                borderRadius: '10px',
                color: '#475569',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              📅 This Month ▾
            </div>
            {/* Export buttons */}
            <div
              style={{
                padding: '10px 16px',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '10px',
                color: '#475569',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              📥 PDF
            </div>
            <div
              style={{
                padding: '10px 16px',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '10px',
                color: '#475569',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              📥 CSV
            </div>
            <div
              style={{
                padding: '10px 16px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                borderRadius: '10px',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
              }}
            >
              📧 Email
            </div>
          </div>
        </div>

        <div style={{ padding: '24px 32px', overflowY: 'auto', height: 'calc(100% - 88px)' }}>
          {/* KPI Row matching DentistAnalytics 5-column grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            {kpiCards.map((kpi, index) => {
              const cardScale = spring({
                frame: frame - 10 - index * 4,
                fps,
                from: 0.8,
                to: 1,
                config: { damping: 15, stiffness: 120 },
              });

              // Animated value counting up
              const valueProgress = spring({
                frame: frame - 15 - index * 4,
                fps,
                from: 0,
                to: 1,
                config: { damping: 20, stiffness: 60 },
              });

              return (
                <div
                  key={index}
                  style={{
                    padding: '18px 20px',
                    background: '#ffffff',
                    borderRadius: '14px',
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                    transform: `scale(${cardScale})`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {kpi.label}
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>ⓘ</span>
                    </div>
                    <div style={{ fontSize: '18px' }}>{kpi.icon}</div>
                  </div>
                  <div
                    style={{
                      fontSize: '28px',
                      fontWeight: '700',
                      color: kpi.isGood ? '#22c55e' : '#18181b',
                      marginBottom: '4px',
                    }}
                  >
                    {kpi.value}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>{kpi.sub}</div>
                </div>
              );
            })}
          </div>

          {/* Summary Cards Row (4 columns) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            {summaryCards.map((card, index) => {
              const cardScale = spring({
                frame: frame - 25 - index * 4,
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
                    borderRadius: '14px',
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                    transform: `scale(${cardScale})`,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>{card.label}</div>
                    <div style={{ fontSize: '18px' }}>{card.icon}</div>
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: '700', color: '#18181b', marginBottom: '4px' }}>
                    {card.value}
                    {card.patients && (
                      <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '500', marginLeft: '8px' }}>
                        • {card.patients} patients
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '10px',
                      background: card.positive ? '#dcfce7' : '#fef2f2',
                      color: card.positive ? '#166534' : '#dc2626',
                      fontSize: '12px',
                      fontWeight: '600',
                    }}
                  >
                    {card.positive ? '↑' : '↓'} {card.change}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Charts Section */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#18181b' }}>
                📈 Revenue Trend — Last 7 Days
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['◀', '▶'].map((arrow, i) => (
                  <div
                    key={i}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#64748b',
                      fontSize: '12px',
                    }}
                  >
                    {arrow}
                  </div>
                ))}
              </div>
            </div>

            {/* Animated Bar Chart */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', height: '200px', paddingTop: '20px' }}>
              {revenueData.map((height, i) => {
                const delay = i * 4;
                const barHeight = spring({
                  frame: frame - (35 + delay),
                  fps,
                  from: 0,
                  to: (height / 100) * 180,
                  config: { damping: 18, stiffness: 80 },
                });

                const barOpacity = spring({
                  frame: frame - (35 + delay),
                  fps,
                  from: 0,
                  to: 1,
                  config: { damping: 15, stiffness: 100 },
                });

                const isHighest = i === 6;
                const barColor = isHighest
                  ? 'linear-gradient(180deg, #f97316 0%, #ea580c 100%)'
                  : 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)';

                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: `${barHeight}px`,
                        background: barColor,
                        borderRadius: '8px 8px 0 0',
                        opacity: barOpacity,
                        boxShadow: isHighest
                          ? '0 6px 20px rgba(249, 115, 22, 0.4)'
                          : '0 4px 12px rgba(59, 130, 246, 0.2)',
                        position: 'relative',
                      }}
                    >
                      {/* Value label on bar */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '-28px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: isHighest ? '#f97316' : '#3b82f6',
                          opacity: barOpacity,
                        }}
                      >
                        €{Math.round(height * 15)}
                      </div>
                      {isHighest && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '-50px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: '#f97316',
                            color: 'white',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: '700',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Peak 🔥
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', opacity: barOpacity }}>
                      {days[i]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Insights Badge */}
          <div
            style={{
              position: 'absolute',
              bottom: '30px',
              right: '40px',
              padding: '14px 24px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              borderRadius: '12px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '700',
              boxShadow: '0 8px 30px rgba(139, 92, 246, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transform: `scale(${1 + Math.sin(frame / 12) * 0.02})`,
              opacity: spring({
                frame: frame - 60,
                fps,
                from: 0,
                to: 1,
                config: { damping: 15 },
              }),
            }}
          >
            <span style={{ fontSize: '18px' }}>🤖</span>
            AI-Powered Insights Available
          </div>
        </div>
      </div>

      {/* Animated cursor */}
      <AnimatedCursor
        positions={cursorPositions}
        clickFrames={[65]}
        startFrame={5}
        size={26}
      />

      {/* Label */}
      <div
        style={{
          position: 'absolute',
          bottom: '30px',
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
        Real-Time Analytics • Data-Driven Decisions
      </div>
    </AbsoluteFill>
  );
};
