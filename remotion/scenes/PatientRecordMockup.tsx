import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

export const PatientRecordMockup: React.FC = () => {
  const frame = useCurrentFrame();

  const headerOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const headerScale = interpolate(frame, [0, 15], [0.95, 1], { extrapolateRight: 'clamp' });

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
      {/* Header with Patient Info - Enhanced */}
      <div
        style={{
          background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 50%, #7c3aed 100%)',
          padding: '30px',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          boxShadow: '0 4px 20px rgba(168, 85, 247, 0.3)',
          opacity: headerOpacity,
          transform: `scale(${headerScale})`,
        }}
      >
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '36px',
            border: '3px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          }}
        >
          👤
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '30px',
            fontWeight: 'bold',
            marginBottom: '6px',
            letterSpacing: '-0.5px',
          }}>
            Sarah Johnson
          </div>
          <div style={{
            fontSize: '17px',
            opacity: 0.95,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <span>Patient ID: #12345</span>
            <span>•</span>
            <span>Age: 34</span>
            <span>•</span>
            <span style={{
              padding: '4px 12px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '600',
            }}>
              Active
            </span>
          </div>
        </div>
      </div>

      {/* Content with enhanced styling */}
      <div style={{ padding: '30px', display: 'flex', gap: '28px' }}>
        {/* Left Column - Medical History */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: '22px',
              fontWeight: '800',
              color: '#1e293b',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              opacity: interpolate(frame, [15, 30], [0, 1], { extrapolateRight: 'clamp' }),
            }}
          >
            <span>📋</span>
            Medical History
          </div>

          {[
            { icon: '⚠️', label: 'Allergies', value: 'Penicillin' },
            { icon: '📅', label: 'Last Visit', value: 'Jan 10, 2026' },
            { icon: '🦷', label: 'Next Cleaning', value: 'Apr 15, 2026' },
            { icon: '💊', label: 'Medications', value: 'None' },
          ].map((item, i) => {
            const delay = i * 8;
            return (
              <div
                key={i}
                style={{
                  padding: '18px',
                  background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
                  borderRadius: '12px',
                  marginBottom: '12px',
                  fontSize: '16px',
                  color: '#475569',
                  border: '2px solid #e2e8f0',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
                  opacity: interpolate(
                    frame,
                    [25 + delay, 38 + delay],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                  transform: `translateY(${interpolate(
                    frame,
                    [25 + delay, 38 + delay],
                    [30, 0],
                    { extrapolateRight: 'clamp' }
                  )}px) scale(${interpolate(
                    frame,
                    [25 + delay, 38 + delay],
                    [0.9, 1],
                    { extrapolateRight: 'clamp' }
                  )})`,
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}>
                  <span style={{ fontSize: '20px' }}>{item.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#64748b',
                      marginBottom: '2px',
                    }}>
                      {item.label}
                    </div>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '700',
                      color: '#1e293b',
                    }}>
                      {item.value}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column - Treatment History */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: '22px',
              fontWeight: '800',
              color: '#1e293b',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              opacity: interpolate(frame, [15, 30], [0, 1], { extrapolateRight: 'clamp' }),
            }}
          >
            <span>🩺</span>
            Recent Treatments
          </div>

          {[
            { date: 'Jan 10, 2026', treatment: 'Dental Cleaning', dentist: 'Dr. Smith', status: 'Completed' },
            { date: 'Oct 5, 2025', treatment: 'Filling - Tooth #14', dentist: 'Dr. Johnson', status: 'Completed' },
            { date: 'Jul 22, 2025', treatment: 'X-Ray Examination', dentist: 'Dr. Smith', status: 'Completed' },
          ].map((treatment, i) => {
            const delay = i * 10;
            return (
              <div
                key={i}
                style={{
                  padding: '20px',
                  background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                  borderRadius: '12px',
                  marginBottom: '12px',
                  border: '2px solid #86efac',
                  boxShadow: '0 2px 8px rgba(34, 197, 94, 0.1)',
                  opacity: interpolate(
                    frame,
                    [30 + delay, 45 + delay],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                  transform: `translateY(${interpolate(
                    frame,
                    [30 + delay, 45 + delay],
                    [30, 0],
                    { extrapolateRight: 'clamp' }
                  )}px) scale(${interpolate(
                    frame,
                    [30 + delay, 45 + delay],
                    [0.9, 1],
                    { extrapolateRight: 'clamp' }
                  )})`,
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '10px',
                }}>
                  <div style={{
                    fontSize: '17px',
                    fontWeight: '700',
                    color: '#166534',
                  }}>
                    {treatment.treatment}
                  </div>
                  <div style={{
                    padding: '4px 10px',
                    background: '#22c55e',
                    color: 'white',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '700',
                  }}>
                    ✓ {treatment.status}
                  </div>
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#15803d',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}>
                  <span>📅 {treatment.date}</span>
                  <span>•</span>
                  <span>👨‍⚕️ {treatment.dentist}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Digital Badge with pulse */}
      <div
        style={{
          position: 'absolute',
          bottom: '30px',
          left: '30px',
          padding: '14px 24px',
          background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 50%, #7c3aed 100%)',
          borderRadius: '16px',
          color: 'white',
          fontSize: '16px',
          fontWeight: '700',
          boxShadow: '0 10px 30px rgba(168, 85, 247, 0.5)',
          opacity: interpolate(frame, [60, 75], [0, 1], { extrapolateRight: 'clamp' }),
          transform: `scale(${1 + Math.sin(frame / 10) * 0.05})`,
        }}
      >
        📋 Complete Digital Health Records
      </div>
    </div>
  );
};
