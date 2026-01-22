import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

export const PatientRecordMockup: React.FC = () => {
  const frame = useCurrentFrame();

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
      {/* Header with Patient Info */}
      <div
        style={{
          background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
          padding: '24px',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
          }}
        >
          👤
        </div>
        <div>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>Sarah Johnson</div>
          <div style={{ fontSize: '16px', opacity: 0.9 }}>Patient ID: #12345 • Age: 34</div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '24px', display: 'flex', gap: '24px' }}>
        {/* Left Column - Medical History */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: '20px',
              fontWeight: '700',
              color: '#1e293b',
              marginBottom: '16px',
              opacity: interpolate(frame, [20, 35], [0, 1], { extrapolateRight: 'clamp' }),
            }}
          >
            Medical History
          </div>

          {['Allergies: Penicillin', 'Last Visit: Jan 10, 2026', 'Next Cleaning: Apr 15, 2026'].map((item, i) => (
            <div
              key={i}
              style={{
                padding: '14px',
                background: '#f8fafc',
                borderRadius: '8px',
                marginBottom: '10px',
                fontSize: '15px',
                color: '#475569',
                border: '1px solid #e2e8f0',
                opacity: interpolate(
                  frame,
                  [30 + i * 8, 42 + i * 8],
                  [0, 1],
                  { extrapolateRight: 'clamp' }
                ),
                transform: `translateY(${interpolate(
                  frame,
                  [30 + i * 8, 42 + i * 8],
                  [20, 0],
                  { extrapolateRight: 'clamp' }
                )}px)`,
              }}
            >
              {item}
            </div>
          ))}
        </div>

        {/* Right Column - Treatment History */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: '20px',
              fontWeight: '700',
              color: '#1e293b',
              marginBottom: '16px',
              opacity: interpolate(frame, [20, 35], [0, 1], { extrapolateRight: 'clamp' }),
            }}
          >
            Recent Treatments
          </div>

          {[
            { date: 'Jan 10, 2026', treatment: 'Dental Cleaning', dentist: 'Dr. Smith' },
            { date: 'Oct 5, 2025', treatment: 'Filling - Tooth #14', dentist: 'Dr. Johnson' },
            { date: 'Jul 22, 2025', treatment: 'X-Ray Examination', dentist: 'Dr. Smith' },
          ].map((treatment, i) => (
            <div
              key={i}
              style={{
                padding: '16px',
                background: '#f0fdf4',
                borderRadius: '8px',
                marginBottom: '10px',
                border: '2px solid #bbf7d0',
                opacity: interpolate(
                  frame,
                  [35 + i * 10, 48 + i * 10],
                  [0, 1],
                  { extrapolateRight: 'clamp' }
                ),
                transform: `translateY(${interpolate(
                  frame,
                  [35 + i * 10, 48 + i * 10],
                  [20, 0],
                  { extrapolateRight: 'clamp' }
                )}px)`,
              }}
            >
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#166534', marginBottom: '4px' }}>
                {treatment.treatment}
              </div>
              <div style={{ fontSize: '13px', color: '#15803d' }}>
                {treatment.date} • {treatment.dentist}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Digital Badge */}
      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          left: '24px',
          padding: '10px 18px',
          background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
          borderRadius: '10px',
          color: 'white',
          fontSize: '13px',
          fontWeight: '600',
          boxShadow: '0 6px 16px rgba(168, 85, 247, 0.4)',
          opacity: interpolate(frame, [65, 80], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        📋 Complete Digital Records
      </div>
    </div>
  );
};
