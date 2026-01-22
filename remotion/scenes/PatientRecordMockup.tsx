import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';

export const PatientRecordMockup: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

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
              opacity: spring({
                frame: frame - 10,
                fps,
                from: 0,
                to: 1,
                config: { damping: 15 },
              }),
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
            const delay = i * 6;
            const itemOpacity = spring({
              frame: frame - (15 + delay),
              fps,
              from: 0,
              to: 1,
              config: { damping: 15, stiffness: 120 },
            });

            const itemY = spring({
              frame: frame - (15 + delay),
              fps,
              from: 40,
              to: 0,
              config: { damping: 18, stiffness: 100 },
            });

            const itemScale = spring({
              frame: frame - (15 + delay),
              fps,
              from: 0.9,
              to: 1,
              config: { damping: 16, stiffness: 110 },
            });

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
                  opacity: itemOpacity,
                  transform: `translateY(${itemY}px) scale(${itemScale})`,
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
              opacity: spring({
                frame: frame - 10,
                fps,
                from: 0,
                to: 1,
                config: { damping: 15 },
              }),
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
            const delay = i * 6;
            const treatmentOpacity = spring({
              frame: frame - (35 + delay),
              fps,
              from: 0,
              to: 1,
              config: { damping: 15, stiffness: 120 },
            });

            const treatmentY = spring({
              frame: frame - (35 + delay),
              fps,
              from: 40,
              to: 0,
              config: { damping: 18, stiffness: 100 },
            });

            const treatmentScale = spring({
              frame: frame - (35 + delay),
              fps,
              from: 0.9,
              to: 1,
              config: { damping: 16, stiffness: 110 },
            });

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
                  opacity: treatmentOpacity,
                  transform: `translateY(${treatmentY}px) scale(${treatmentScale})`,
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
          bottom: '20px',
          right: '20px',
          padding: '12px 20px',
          background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
          borderRadius: '12px',
          color: 'white',
          fontSize: '14px',
          fontWeight: '700',
          boxShadow: '0 8px 24px rgba(168, 85, 247, 0.4)',
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
        <span style={{ fontSize: '16px' }}>📋</span>
        <span>Digital Health Records</span>
      </div>
    </div>
  );
};
