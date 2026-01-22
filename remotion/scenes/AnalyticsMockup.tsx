import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

export const AnalyticsMockup: React.FC = () => {
  const frame = useCurrentFrame();

  const stats = [
    { label: 'Patients This Month', value: '342', change: '+12%', color: '#3b82f6' },
    { label: 'Revenue', value: '$48,290', change: '+8%', color: '#22c55e' },
    { label: 'Appointments', value: '156', change: '+15%', color: '#f97316' },
    { label: 'Satisfaction', value: '4.9/5', change: '+0.2', color: '#a855f7' },
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
          background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
          padding: '24px',
          color: 'white',
        }}
      >
        <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
          Practice Analytics
        </div>
        <div style={{ fontSize: '16px', opacity: 0.9 }}>
          Real-time insights for January 2026
        </div>
      </div>

      {/* Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '20px',
          padding: '24px',
        }}
      >
        {stats.map((stat, i) => {
          const delay = i * 12;
          const opacity = interpolate(
            frame,
            [15 + delay, 30 + delay],
            [0, 1],
            { extrapolateRight: 'clamp' }
          );
          const scale = interpolate(
            frame,
            [15 + delay, 30 + delay],
            [0.8, 1],
            { extrapolateRight: 'clamp' }
          );

          return (
            <div
              key={i}
              style={{
                padding: '20px',
                background: '#f8fafc',
                borderRadius: '12px',
                border: `2px solid ${stat.color}20`,
                opacity,
                transform: `scale(${scale})`,
              }}
            >
              <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>
                {stat.label}
              </div>
              <div
                style={{
                  fontSize: '32px',
                  fontWeight: 'bold',
                  color: stat.color,
                  marginBottom: '8px',
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  background: '#dcfce7',
                  color: '#166534',
                  fontSize: '13px',
                  fontWeight: '600',
                }}
              >
                ↑ {stat.change}
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart Visualization */}
      <div style={{ padding: '0 24px 24px 24px' }}>
        <div
          style={{
            padding: '20px',
            background: '#f8fafc',
            borderRadius: '12px',
            border: '2px solid #e2e8f0',
          }}
        >
          <div
            style={{
              fontSize: '18px',
              fontWeight: '700',
              color: '#1e293b',
              marginBottom: '20px',
              opacity: interpolate(frame, [50, 65], [0, 1], { extrapolateRight: 'clamp' }),
            }}
          >
            Monthly Revenue Trend
          </div>

          {/* Simple Bar Chart */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', height: '140px' }}>
            {[65, 72, 58, 80, 85, 78, 92, 88].map((height, i) => {
              const delay = i * 5;
              const barHeight = interpolate(
                frame,
                [55 + delay, 75 + delay],
                [0, (height / 100) * 140],
                { extrapolateRight: 'clamp' }
              );
              const opacity = interpolate(
                frame,
                [55 + delay, 75 + delay],
                [0, 1],
                { extrapolateRight: 'clamp' }
              );

              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: `${barHeight}px`,
                      background: i === 6 ? 'linear-gradient(180deg, #f97316 0%, #ea580c 100%)' : 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)',
                      borderRadius: '8px 8px 0 0',
                      opacity,
                      boxShadow: i === 6 ? '0 4px 12px rgba(249, 115, 22, 0.4)' : '0 4px 12px rgba(59, 130, 246, 0.2)',
                    }}
                  />
                  <div style={{ fontSize: '12px', color: '#64748b', opacity }}>
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'][i]}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Insights Badge */}
      <div
        style={{
          position: 'absolute',
          top: '420px',
          right: '24px',
          padding: '10px 18px',
          background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
          borderRadius: '10px',
          color: 'white',
          fontSize: '13px',
          fontWeight: '600',
          boxShadow: '0 6px 16px rgba(139, 92, 246, 0.4)',
          opacity: interpolate(frame, [90, 105], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        📊 AI-Powered Insights
      </div>
    </div>
  );
};
