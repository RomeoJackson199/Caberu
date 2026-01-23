import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { AnimatedCursor } from '../components/AnimatedCursor';

/**
 * TreatmentPlanScene - Shows the dentist creating a treatment plan
 * Matches the real TreatmentPlanEditor UI exactly
 */
export const TreatmentPlanScene: React.FC = () => {
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

  // Treatment items appearing one by one
  const treatmentItems = [
    { name: 'Root Canal Treatment', tooth: '#14', qty: 1, price: 850 },
    { name: 'Porcelain Crown', tooth: '#14', qty: 1, price: 1200 },
    { name: 'Post-op Consultation', tooth: '-', qty: 1, price: 75 },
  ];

  const totalPrice = treatmentItems.reduce((sum, item) => sum + item.price * item.qty, 0);

  // Cursor positions for interaction
  const cursorPositions = [
    { x: 800, y: 400, frame: 0 },
    { x: 950, y: 650, frame: 40 }, // Move to "Propose to Patient" button
    { x: 950, y: 650, frame: 60 }, // Click
  ];

  // Button click animation
  const proposeButtonScale = interpolate(frame, [58, 62, 70], [1, 0.95, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Success notification
  const successOpacity = spring({
    frame: frame - 65,
    fps,
    from: 0,
    to: 1,
    config: { damping: 15, stiffness: 100 },
  });

  // Zoom effect on click - zooms into the "Propose to Patient" button area
  const zoomProgress = spring({
    frame: frame - 58,
    fps,
    from: 0,
    to: 1,
    config: { damping: 25, stiffness: 80 },
  });

  const zoomScale = interpolate(zoomProgress, [0, 1], [1, 1.3]);
  const zoomX = interpolate(zoomProgress, [0, 1], [0, -150]);
  const zoomY = interpolate(zoomProgress, [0, 1], [0, -200]);

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
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34, 197, 94, 0.1) 0%, transparent 60%)',
          bottom: '-100px',
          right: '-100px',
        }}
      />

      {/* Treatment Plan Editor Container */}
      <div
        style={{
          width: '1100px',
          background: '#ffffff',
          borderRadius: '20px',
          overflow: 'hidden',
          fontFamily: '"Inter", "DM Sans", system-ui, sans-serif',
          transform: `scale(${containerScale * zoomScale}) translate(${zoomX}px, ${zoomY}px)`,
          opacity: containerOpacity,
          boxShadow: '0 25px 80px rgba(0, 0, 0, 0.3)',
          transformOrigin: 'bottom center',
        }}
      >
        {/* Header matching real TreatmentPlanEditor CardHeader with ClipboardList icon */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          {/* ClipboardList icon representation */}
          <div
            style={{
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
            }}
          >
            📋
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#18181b' }}>
              Treatment Plan
            </span>
            {/* Draft badge - matches outline variant */}
            <span
              style={{
                padding: '2px 8px',
                background: 'transparent',
                border: '1px solid rgba(245, 158, 11, 0.5)',
                borderRadius: '6px',
                color: '#f59e0b',
                fontSize: '11px',
                fontWeight: '500',
              }}
            >
              Draft
            </span>
            {/* Version badge */}
            <span
              style={{
                padding: '2px 8px',
                background: '#f1f5f9',
                borderRadius: '6px',
                color: '#64748b',
                fontSize: '11px',
                fontWeight: '500',
              }}
            >
              v1
            </span>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '24px 28px' }}>
          {/* Title and Template Row */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px', fontWeight: '500' }}>
                Plan Title
              </div>
              <div
                style={{
                  padding: '12px 16px',
                  background: '#f8fafc',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: '10px',
                  fontSize: '15px',
                  color: '#18181b',
                }}
              >
                Root Canal Treatment - Tooth #14
              </div>
            </div>
            <div style={{ width: '200px' }}>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px', fontWeight: '500' }}>
                Apply Template
              </div>
              <div
                style={{
                  padding: '12px 16px',
                  background: '#f8fafc',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: '10px',
                  fontSize: '14px',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>Select template</span>
                <span>▾</span>
              </div>
            </div>
          </div>

          {/* Treatment Items Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
              Treatment Items
            </div>
            <div
              style={{
                padding: '6px 12px',
                color: '#3b82f6',
                fontSize: '13px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
              }}
            >
              <span>+</span> Add Item
            </div>
          </div>

          {/* Treatment Items List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {treatmentItems.map((item, index) => {
              const itemOpacity = spring({
                frame: frame - 15 - index * 8,
                fps,
                from: 0,
                to: 1,
                config: { damping: 15, stiffness: 100 },
              });

              const itemY = spring({
                frame: frame - 15 - index * 8,
                fps,
                from: 20,
                to: 0,
                config: { damping: 15, stiffness: 100 },
              });

              return (
                <div
                  key={index}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 80px 70px 120px 40px',
                    gap: '12px',
                    alignItems: 'center',
                    padding: '14px 16px',
                    background: '#f8fafc',
                    borderRadius: '10px',
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                    opacity: itemOpacity,
                    transform: `translateY(${itemY}px)`,
                  }}
                >
                  <div
                    style={{
                      padding: '10px 14px',
                      background: '#ffffff',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: '#18181b',
                    }}
                  >
                    {item.name}
                  </div>
                  <div
                    style={{
                      padding: '10px 14px',
                      background: '#ffffff',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: '#18181b',
                      textAlign: 'center',
                    }}
                  >
                    {item.tooth}
                  </div>
                  <div
                    style={{
                      padding: '10px 14px',
                      background: '#ffffff',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: '#18181b',
                      textAlign: 'center',
                    }}
                  >
                    {item.qty}
                  </div>
                  <div
                    style={{
                      padding: '10px 14px',
                      background: '#ffffff',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: '#18181b',
                      textAlign: 'right',
                    }}
                  >
                    ${item.price.toFixed(2)}
                  </div>
                  <div
                    style={{
                      padding: '8px',
                      color: '#ef4444',
                      fontSize: '16px',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    🗑️
                  </div>
                </div>
              );
            })}
          </div>

          {/* Separator */}
          <div style={{ height: '1px', background: 'rgba(0, 0, 0, 0.08)', margin: '20px 0' }} />

          {/* Total */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '15px', fontWeight: '500' }}>
              <span>💰</span>
              Estimated Total
            </div>
            <div
              style={{
                fontSize: '28px',
                fontWeight: '700',
                color: '#18181b',
                opacity: spring({
                  frame: frame - 40,
                  fps,
                  from: 0,
                  to: 1,
                  config: { damping: 15 },
                }),
              }}
            >
              ${totalPrice.toFixed(2)}
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px', fontWeight: '500' }}>
              Notes (visible to patient)
            </div>
            <div
              style={{
                padding: '14px 16px',
                background: '#f8fafc',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '10px',
                fontSize: '14px',
                color: '#64748b',
                minHeight: '60px',
              }}
            >
              Treatment recommended after X-ray evaluation. Crown placement 2 weeks after root canal completion.
            </div>
          </div>

          {/* Action Buttons - matching real TreatmentPlanEditor */}
          <div style={{ display: 'flex', gap: '8px', paddingTop: '8px' }}>
            {/* Save Draft - outline variant */}
            <div
              style={{
                flex: 1,
                padding: '10px 16px',
                border: '1px solid rgba(0, 0, 0, 0.15)',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#18181b',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                background: 'transparent',
              }}
            >
              {/* Save icon */}
              <span style={{ fontSize: '14px' }}>💾</span>
              Save Draft
            </div>
            {/* Propose to Patient - primary variant */}
            <div
              style={{
                flex: 1,
                padding: '10px 16px',
                background: '#18181b',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: 'white',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                transform: `scale(${proposeButtonScale})`,
              }}
            >
              {/* Send icon */}
              <span style={{ fontSize: '14px' }}>📤</span>
              Propose to Patient
            </div>
          </div>
        </div>

        {/* Success notification */}
        {frame > 65 && (
          <div
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              padding: '16px 24px',
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              borderRadius: '12px',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 10px 40px rgba(34, 197, 94, 0.4)',
              opacity: successOpacity,
              transform: `translateY(${(1 - successOpacity) * -20}px)`,
            }}
          >
            <span style={{ fontSize: '24px' }}>✓</span>
            <div>
              <div style={{ fontWeight: '600', fontSize: '15px' }}>Treatment Plan Sent!</div>
              <div style={{ fontSize: '13px', opacity: 0.9 }}>Patient will receive notification</div>
            </div>
          </div>
        )}
      </div>

      {/* Animated cursor */}
      <AnimatedCursor
        positions={cursorPositions}
        clickFrames={[60]}
        startFrame={5}
      />

      {/* Label */}
      <div
        style={{
          position: 'absolute',
          bottom: '40px',
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
        Digital Treatment Plans • Direct to Patient
      </div>
    </AbsoluteFill>
  );
};
