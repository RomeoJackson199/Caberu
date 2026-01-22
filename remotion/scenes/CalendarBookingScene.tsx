import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { AnimatedCursor } from '../components/AnimatedCursor';

export const CalendarBookingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Zoom in from previous scene
  const zoomIn = spring({
    frame,
    fps,
    from: 1.8,
    to: 1,
    config: { damping: 25, stiffness: 80 },
  });

  const containerOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Calendar days
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const calendarDays = [
    [20, 21, 22, 23, 24, 25, 26],
    [27, 28, 29, 30, 31, 1, 2],
  ];

  // Time slots
  const timeSlots = [
    { time: '09:00', available: false },
    { time: '10:00', available: false },
    { time: '11:00', available: true },
    { time: '14:00', available: true, highlight: true },
    { time: '15:00', available: true },
    { time: '16:00', available: false },
  ];

  // Booking animation
  const bookingFrame = 50;
  const isBooked = frame > bookingFrame + 20;
  const bookingProgress = spring({
    frame: frame - bookingFrame,
    fps,
    config: { damping: 12, stiffness: 200 },
  });

  // Checkmark animation
  const checkmarkScale = spring({
    frame: frame - bookingFrame - 15,
    fps,
    config: { damping: 10, stiffness: 300 },
  });

  // Cursor positions
  const cursorPositions = [
    { x: 600, y: 400, frame: 0 },
    { x: 780, y: 320, frame: 20 },
    { x: 830, y: 420, frame: 35 },
    { x: 830, y: 420, frame: 50 },
  ];

  // Fade out
  const fadeOut = interpolate(frame, [100, 118], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1a1f35 50%, #0f172a 100%)',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: '"DM Sans", system-ui, sans-serif',
        opacity: containerOpacity * fadeOut,
      }}
    >
      {/* Background elements */}
      <div
        style={{
          position: 'absolute',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)',
          top: '-100px',
          right: '-100px',
        }}
      />

      {/* Scene Title */}
      <div
        style={{
          position: 'absolute',
          top: '60px',
          left: '50%',
          transform: 'translateX(-50%)',
          opacity: interpolate(frame, [5, 20], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        <div style={{ color: '#ffffff', fontSize: '48px', fontWeight: '700', textAlign: 'center', letterSpacing: '-1px' }}>
          Smart Calendar Booking
        </div>
        <div style={{ color: '#94a3b8', fontSize: '22px', textAlign: 'center', marginTop: '12px' }}>
          AI automatically finds the best slot and books it instantly
        </div>
      </div>

      {/* Calendar Interface */}
      <div
        style={{
          display: 'flex',
          gap: '40px',
          transform: `scale(${zoomIn})`,
          marginTop: '60px',
        }}
      >
        {/* Calendar Grid */}
        <div
          style={{
            width: '500px',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '28px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          }}
        >
          {/* Calendar Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
            }}
          >
            <div style={{ color: '#ffffff', fontSize: '24px', fontWeight: '700' }}>
              January 2026
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                  fontSize: '18px',
                }}
              >
                ‹
              </div>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                  fontSize: '18px',
                }}
              >
                ›
              </div>
            </div>
          </div>

          {/* Days of week */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '12px' }}>
            {daysOfWeek.map((day) => (
              <div
                key={day}
                style={{
                  textAlign: 'center',
                  color: '#64748b',
                  fontSize: '13px',
                  fontWeight: '600',
                  padding: '8px',
                }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          {calendarDays.map((week, weekIndex) => (
            <div key={weekIndex} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '8px' }}>
              {week.map((day, dayIndex) => {
                const isSelected = day === 23;
                const isToday = day === 23;
                const itemDelay = weekIndex * 7 + dayIndex;
                const itemOpacity = spring({
                  frame: frame - 10 - itemDelay,
                  fps,
                  config: { damping: 15 },
                });

                return (
                  <div
                    key={dayIndex}
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isSelected
                        ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                        : 'rgba(255, 255, 255, 0.03)',
                      border: isToday && !isSelected ? '2px solid rgba(59, 130, 246, 0.5)' : '1px solid transparent',
                      color: isSelected ? '#ffffff' : day > 19 ? '#ffffff' : '#64748b',
                      fontSize: '16px',
                      fontWeight: isSelected ? '700' : '500',
                      opacity: itemOpacity,
                      boxShadow: isSelected ? '0 4px 16px rgba(59, 130, 246, 0.4)' : 'none',
                    }}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Time Slots Panel */}
        <div
          style={{
            width: '380px',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '28px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div style={{ color: '#ffffff', fontSize: '20px', fontWeight: '700', marginBottom: '20px' }}>
            Available Times
          </div>
          <div style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
            Thursday, January 23, 2026
          </div>

          {timeSlots.map((slot, index) => {
            const isHighlighted = slot.highlight && frame > 30;
            const isBookedSlot = slot.highlight && isBooked;
            const slotOpacity = spring({
              frame: frame - 15 - index * 4,
              fps,
              config: { damping: 15 },
            });

            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  marginBottom: '10px',
                  borderRadius: '14px',
                  background: isBookedSlot
                    ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.1) 100%)'
                    : isHighlighted
                    ? `linear-gradient(135deg, rgba(59, 130, 246, ${0.2 + Math.sin(frame / 6) * 0.1}) 0%, rgba(59, 130, 246, 0.1) 100%)`
                    : slot.available
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(255, 255, 255, 0.02)',
                  border: isBookedSlot
                    ? '2px solid rgba(34, 197, 94, 0.5)'
                    : isHighlighted
                    ? '2px solid rgba(59, 130, 246, 0.5)'
                    : '1px solid rgba(255, 255, 255, 0.05)',
                  opacity: slotOpacity,
                  transform: isHighlighted && !isBookedSlot ? `scale(${1 + Math.sin(frame / 6) * 0.01})` : 'scale(1)',
                  boxShadow: isHighlighted
                    ? `0 4px 20px rgba(59, 130, 246, ${0.2 + Math.sin(frame / 6) * 0.1})`
                    : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: isBookedSlot
                        ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                        : slot.available
                        ? 'rgba(59, 130, 246, 0.2)'
                        : 'rgba(239, 68, 68, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                    }}
                  >
                    {isBookedSlot ? '✓' : slot.available ? '🕐' : '✕'}
                  </div>
                  <div>
                    <div style={{ color: '#ffffff', fontSize: '17px', fontWeight: '600' }}>
                      {slot.time}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '13px' }}>
                      {isBookedSlot ? 'Booked!' : slot.available ? '60 min available' : 'Unavailable'}
                    </div>
                  </div>
                </div>

                {isBookedSlot ? (
                  <div
                    style={{
                      padding: '8px 16px',
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                      borderRadius: '10px',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '700',
                      transform: `scale(${checkmarkScale})`,
                      boxShadow: '0 4px 12px rgba(34, 197, 94, 0.4)',
                    }}
                  >
                    ✓ Confirmed
                  </div>
                ) : slot.available ? (
                  <div
                    style={{
                      padding: '8px 16px',
                      background: isHighlighted
                        ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                        : 'rgba(59, 130, 246, 0.2)',
                      borderRadius: '10px',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '600',
                    }}
                  >
                    Book
                  </div>
                ) : null}
              </div>
            );
          })}

          {/* AI Badge */}
          <div
            style={{
              marginTop: '20px',
              padding: '14px 20px',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.08) 100%)',
              borderRadius: '14px',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              opacity: spring({
                frame: frame - 55,
                fps,
                config: { damping: 15 },
              }),
            }}
          >
            <span style={{ fontSize: '22px' }}>🤖</span>
            <div>
              <div style={{ color: '#a78bfa', fontSize: '14px', fontWeight: '600' }}>
                AI Selected Best Time
              </div>
              <div style={{ color: '#94a3b8', fontSize: '12px' }}>
                Based on patient preference
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cursor */}
      <AnimatedCursor
        positions={cursorPositions}
        clickFrames={[48]}
        startFrame={5}
      />
    </AbsoluteFill>
  );
};
