import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { springConfigs } from '../../utils/animations';

/**
 * Booking Scene - Calendar and appointment card animations
 * Duration: 120 frames (4 seconds @ 30fps)
 * Mobile-optimized
 */
export const BookingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Calendar card entrance
  const calendarScale = spring({
    frame: frame - 5,
    fps,
    from: 0.6,
    to: 1,
    config: springConfigs.bouncy,
  });
  const calendarOpacity = interpolate(frame, [5, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Appointment slots stagger in
  const slots = [
    { time: '09:00', name: 'Dr. Sarah M.', type: 'Checkup', color: '#3b82f6' },
    { time: '11:30', name: 'Dr. James K.', type: 'Cleaning', color: '#8b5cf6' },
    { time: '14:00', name: 'Dr. Lisa R.', type: 'Consult', color: '#06b6d4' },
  ];

  // Checkmark animation for the selected slot
  const checkScale = spring({
    frame: frame - 60,
    fps,
    from: 0,
    to: 1,
    config: { damping: 8, stiffness: 200 },
  });

  // Pulse on selected slot
  const selectedPulse = 0.5 + Math.sin((frame - 60) / 8) * 0.3;

  // Calendar days grid
  const days = Array.from({ length: 7 }, (_, i) => i + 15);
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(180deg, #0f172a 0%, #1a1a3e 50%, #1e1b4b 100%)',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: '"Inter", "DM Sans", system-ui, sans-serif',
      }}
    >
      {/* Background particles */}
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${15 + (i * 45) % 70}%`,
            top: `${10 + (i * 30) % 80}%`,
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            background: i % 2 === 0 ? '#3b82f6' : '#8b5cf6',
            opacity: 0.15 + Math.sin(frame / 15 + i) * 0.1,
          }}
        />
      ))}

      {/* Calendar card */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          opacity: calendarOpacity,
          transform: `scale(${calendarScale})`,
        }}
      >
        {/* Mini calendar widget */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '16px',
            backdropFilter: 'blur(20px)',
            width: '260px',
          }}
        >
          {/* Month header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
              padding: '0 4px',
            }}
          >
            <div style={{ color: 'white', fontSize: '15px', fontWeight: 700 }}>January 2025</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  background: 'rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '12px',
                }}
              >
                ‹
              </div>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  background: 'rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '12px',
                }}
              >
                ›
              </div>
            </div>
          </div>

          {/* Day labels */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
            {dayLabels.map((d, i) => (
              <div
                key={i}
                style={{
                  width: '30px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'rgba(255,255,255,0.35)',
                  fontSize: '10px',
                  fontWeight: 600,
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {days.map((day, i) => {
              const isSelected = day === 18;
              const dayScale = spring({
                frame: frame - 15 - i * 3,
                fps,
                from: 0,
                to: 1,
                config: springConfigs.snappy,
              });

              return (
                <div
                  key={i}
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: isSelected ? 700 : 500,
                    color: isSelected ? 'white' : 'rgba(255,255,255,0.6)',
                    background: isSelected
                      ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                      : 'transparent',
                    transform: `scale(${dayScale})`,
                    boxShadow: isSelected ? '0 4px 12px rgba(59, 130, 246, 0.4)' : 'none',
                  }}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </div>

        {/* Appointment slots */}
        {slots.map((slot, i) => {
          const slotY = spring({
            frame: frame - 30 - i * 8,
            fps,
            from: 30,
            to: 0,
            config: springConfigs.smooth,
          });
          const slotOpacity = interpolate(frame, [30 + i * 8, 42 + i * 8], [0, 1], {
            extrapolateRight: 'clamp',
          });

          const isSelected = i === 0 && frame > 55;

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                background: isSelected
                  ? `linear-gradient(135deg, ${slot.color}22, ${slot.color}11)`
                  : 'rgba(255, 255, 255, 0.04)',
                border: isSelected
                  ? `1px solid ${slot.color}66`
                  : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                width: '260px',
                opacity: slotOpacity,
                transform: `translateY(${slotY}px)`,
                boxShadow: isSelected ? `0 4px 20px ${slot.color}33` : 'none',
              }}
            >
              {/* Time */}
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: slot.color,
                  minWidth: '44px',
                }}
              >
                {slot.time}
              </div>

              {/* Info */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>{slot.name}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>{slot.type}</div>
              </div>

              {/* Checkmark or arrow */}
              {isSelected ? (
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${slot.color}, ${slot.color}cc)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: `scale(${checkScale})`,
                    boxShadow: `0 0 ${selectedPulse * 20}px ${slot.color}${Math.round(selectedPulse * 100).toString(16).padStart(2, '0')}`,
                  }}
                >
                  <span style={{ color: 'white', fontSize: '12px', fontWeight: 800 }}>✓</span>
                </div>
              ) : (
                <div
                  style={{
                    color: 'rgba(255,255,255,0.3)',
                    fontSize: '14px',
                  }}
                >
                  ›
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
