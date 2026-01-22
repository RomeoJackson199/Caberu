import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

export const AnalyticsMockup: React.FC = () => {
  const frame = useCurrentFrame();

  const headerOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  const stats = [
    { label: 'Revenue - Today', value: '€1,245', change: '+8.2%', icon: '💰', color: '#3b82f6' },
    { label: 'Appointments', value: '18', change: '+15%', icon: '📅', color: '#22c55e' },
    { label: 'Patient Retention', value: '92%', change: '+2%', icon: '👥', color: '#f97316' },
    { label: 'No-Show Rate', value: '3.5%', change: '-1.5%', icon: '⚠️', color: '#a855f7' },
  ];

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
        transform: `scale(${interpolate(frame, [0, 20], [0.9, 1], { extrapolateRight: 'clamp' })})`,
      }}
    >
      {/* Header with enhanced gradient */}
      <div
        style={{
          background: 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #dc2626 100%)',
          padding: '30px',
          color: 'white',
          boxShadow: '0 4px 20px rgba(249, 115, 22, 0.3)',
          opacity: headerOpacity,
        }}
      >
        <div style={{
          fontSize: '32px',
          fontWeight: 'bold',
          marginBottom: '10px',
          letterSpacing: '-0.5px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <span>📊</span>
          Practice Analytics
        </div>
        <div style={{
          fontSize: '18px',
          opacity: 0.95,
          fontWeight: '500',
        }}>
          Real-time insights & data-driven decisions • January 2026
        </div>
      </div>

      {/* Stats Grid with enhanced animations */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '24px',
          padding: '30px',
        }}
      >
        {stats.map((stat, i) => {
          const delay = i * 10;
          const opacity = interpolate(
            frame,
            [15 + delay, 30 + delay],
            [0, 1],
            { extrapolateRight: 'clamp' }
          );
          const scale = interpolate(
            frame,
            [15 + delay, 30 + delay],
            [0.85, 1],
            { extrapolateRight: 'clamp' }
          );
          const y = interpolate(
            frame,
            [15 + delay, 30 + delay],
            [30, 0],
            { extrapolateRight: 'clamp' }
          );

          const isNegativeChange = stat.change.startsWith('-');
          const changeColor = isNegativeChange ? '#166534' : '#166534';

          return (
            <div
              key={i}
              style={{
                padding: '24px',
                background: `linear-gradient(135deg, #ffffff, #f8fafc)`,
                borderRadius: '16px',
                border: `3px solid ${stat.color}30`,
                boxShadow: `0 4px 16px ${stat.color}15`,
                opacity,
                transform: `scale(${scale}) translateY(${y}px)`,
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}>
                <div style={{
                  fontSize: '15px',
                  color: '#64748b',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  {stat.label}
                </div>
                <div style={{
                  fontSize: '28px',
                }}>
                  {stat.icon}
                </div>
              </div>
              <div
                style={{
                  fontSize: '38px',
                  fontWeight: 'bold',
                  background: `linear-gradient(135deg, ${stat.color}, ${stat.color}cc)`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  marginBottom: '12px',
                  letterSpacing: '-1px',
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '14px',
                  background: isNegativeChange ? '#dcfce7' : '#dcfce7',
                  color: changeColor,
                  fontSize: '14px',
                  fontWeight: '700',
                }}
              >
                <span>{isNegativeChange ? '↓' : '↑'}</span>
                <span>{stat.change}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart Visualization with enhanced styling */}
      <div style={{ padding: '0 30px 30px 30px' }}>
        <div
          style={{
            padding: '26px',
            background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
            borderRadius: '16px',
            border: '2px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
          }}
        >
          <div
            style={{
              fontSize: '20px',
              fontWeight: '800',
              color: '#1e293b',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              opacity: interpolate(frame, [45, 60], [0, 1], { extrapolateRight: 'clamp' }),
            }}
          >
            <span>📈</span>
            Revenue Trend - Last 7 Days
          </div>

          {/* Enhanced Bar Chart */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '14px', height: '160px' }}>
            {[68, 75, 62, 88, 92, 82, 98].map((height, i) => {
              const delay = i * 6;
              const barHeight = interpolate(
                frame,
                [50 + delay, 70 + delay],
                [0, (height / 100) * 160],
                { extrapolateRight: 'clamp' }
              );
              const opacity = interpolate(
                frame,
                [50 + delay, 70 + delay],
                [0, 1],
                { extrapolateRight: 'clamp' }
              );

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
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: `${barHeight}px`,
                      background: barColor,
                      borderRadius: '10px 10px 0 0',
                      opacity,
                      boxShadow: isHighest
                        ? '0 6px 20px rgba(249, 115, 22, 0.5)'
                        : '0 4px 12px rgba(59, 130, 246, 0.25)',
                      position: 'relative',
                    }}
                  >
                    {isHighest && (
                      <div style={{
                        position: 'absolute',
                        top: '-30px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: '#f97316',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '700',
                        whiteSpace: 'nowrap',
                        opacity: interpolate(frame, [88, 100], [0, 1], { extrapolateRight: 'clamp' }),
                      }}>
                        Peak
                      </div>
                    )}
                  </div>
                  <div style={{
                    fontSize: '13px',
                    color: '#64748b',
                    fontWeight: '600',
                    opacity,
                  }}>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Insights Badge with pulse */}
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
          boxShadow: '0 10px 30px rgba(139, 92, 246, 0.5)',
          opacity: interpolate(frame, [95, 108], [0, 1], { extrapolateRight: 'clamp' }),
          transform: `scale(${1 + Math.sin(frame / 10) * 0.05})`,
        }}
      >
        🤖 AI-Powered Insights & Predictions
      </div>
    </div>
  );
};
