import React, { Suspense } from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { PerspectiveCamera, Float, ContactShadows } from '@react-three/drei';
import { MacBook3D, IPhone3D } from '../components/Device3D';
import { FloatingParticles, GlowOrb } from '../components/FloatingParticles';
import { colors } from '../utils/animations';

/**
 * DashboardDemo3DScene - Polished product showcase with dashboard UI
 * Duration: 10 seconds (300 frames @ 30fps)
 * Shows a real-looking dashboard interface on the 3D MacBook
 * with feature callouts appearing one by one
 */
export const DashboardDemo3DScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Camera: start wide, slowly dolly in and orbit
  const cameraAngle = interpolate(frame, [0, 300], [0, Math.PI * 0.25], {
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });

  const cameraDistance = interpolate(frame, [0, 80, 300], [7, 5, 5.5], {
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });

  const cameraHeight = interpolate(frame, [0, 80, 300], [3, 2, 2.2], {
    extrapolateRight: 'clamp',
  });

  const cameraX = Math.sin(cameraAngle) * cameraDistance;
  const cameraZ = Math.cos(cameraAngle) * cameraDistance;

  // Device entry
  const deviceScale = spring({
    frame: frame - 5,
    fps,
    from: 0.8,
    to: 1,
    config: { damping: 20, stiffness: 80 },
  });

  // Feature callouts that appear sequentially
  const callouts = [
    {
      title: 'Smart Scheduling',
      subtitle: '27ms slot-finding algorithm',
      icon: 'calendar',
      position: { left: '5%', top: '22%' },
      delay: 40,
      color: '#3b82f6',
    },
    {
      title: 'AI Voice Assistant',
      subtitle: 'Never miss a call again',
      icon: 'phone',
      position: { right: '5%', top: '18%' },
      delay: 90,
      color: '#22c55e',
    },
    {
      title: 'Patient Portal',
      subtitle: 'Self-service booking & records',
      icon: 'users',
      position: { left: '5%', bottom: '22%' },
      delay: 140,
      color: '#8b5cf6',
    },
    {
      title: 'Real-time Analytics',
      subtitle: 'Revenue insights at a glance',
      icon: 'chart',
      position: { right: '5%', bottom: '22%' },
      delay: 190,
      color: '#06b6d4',
    },
  ];

  // Fade out
  const fadeOut = interpolate(frame, [280, 300], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 30%, ${colors.bgNavy} 0%, ${colors.bgDark} 100%)`,
        fontFamily: '"Inter", "SF Pro Display", system-ui, sans-serif',
        opacity: fadeOut,
      }}
    >
      {/* 3D Canvas */}
      <ThreeCanvas width={1920} height={1080}>
        <Suspense fallback={null}>
          <PerspectiveCamera
            makeDefault
            position={[cameraX, cameraHeight, cameraZ]}
            fov={42}
          />

          {/* Lighting */}
          <ambientLight intensity={0.35} />
          <directionalLight position={[5, 5, 5]} intensity={0.7} color="#ffffff" />
          <directionalLight position={[-5, 3, -5]} intensity={0.3} color="#8b5cf6" />
          <pointLight position={[0, 3, 0]} intensity={0.4} color="#3b82f6" />

          {/* Main MacBook */}
          <group scale={deviceScale} position={[0, 0, 0]} rotation={[0.05, 0, 0]}>
            <Float
              speed={1.2}
              rotationIntensity={0.06}
              floatIntensity={0.12}
              floatingRange={[-0.03, 0.03]}
            >
              <MacBook3D position={[0, 0, 0]} animate={false} />
            </Float>
          </group>

          {/* iPhone floating to the right */}
          <group position={[2.8, -0.2, 0.5]} rotation={[0.1, -0.3, 0.05]}>
            <Float speed={1.8} rotationIntensity={0.1} floatIntensity={0.2}>
              <IPhone3D
                scale={spring({
                  frame: frame - 60,
                  fps,
                  from: 0,
                  to: 0.75,
                  config: { damping: 18, stiffness: 90 },
                })}
                animate={false}
              />
            </Float>
          </group>

          {/* Contact Shadows */}
          <ContactShadows
            position={[0, -1.5, 0]}
            opacity={0.35}
            scale={10}
            blur={2.5}
            far={4}
            color="#000000"
          />

          {/* Ambient particles */}
          <FloatingParticles
            count={40}
            bounds={{ x: 8, y: 5, z: 8 }}
            size={0.6}
          />

          {/* Glow orbs */}
          <GlowOrb position={[-4, 2, -3]} color="#3b82f6" size={0.18} pulseSpeed={0.7} />
          <GlowOrb position={[4, 1, -2]} color="#8b5cf6" size={0.14} pulseSpeed={1.1} />
          <GlowOrb position={[-3, -1, 2]} color="#06b6d4" size={0.16} pulseSpeed={0.9} />

          {/* Subtle grid floor */}
          <gridHelper
            args={[20, 20, '#1e293b', '#1e293b']}
            position={[0, -1.5, 0]}
          />
        </Suspense>
      </ThreeCanvas>

      {/* 2D Overlay - Section title */}
      <div
        style={{
          position: 'absolute',
          top: '5%',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            opacity: spring({ frame, fps, from: 0, to: 1, config: { damping: 20 } }),
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 20px',
            borderRadius: '100px',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#3b82f6',
            }}
          />
          <span
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#60a5fa',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Product Overview
          </span>
        </div>
      </div>

      {/* Feature callout cards */}
      {callouts.map((callout, i) => {
        const cardOpacity = spring({
          frame: frame - callout.delay,
          fps,
          from: 0,
          to: 1,
          config: { damping: 18, stiffness: 100 },
        });

        const cardSlide = spring({
          frame: frame - callout.delay,
          fps,
          from: 20,
          to: 0,
          config: { damping: 18, stiffness: 100 },
        });

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              ...callout.position,
              opacity: cardOpacity,
              transform: `translateY(${cardSlide}px)`,
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '16px 22px',
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(12px)',
              borderRadius: '14px',
              border: `1px solid ${callout.color}33`,
              boxShadow: `0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px ${callout.color}15`,
              pointerEvents: 'none',
            }}
          >
            {/* Icon dot */}
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: `${callout.color}20`,
                border: `1px solid ${callout.color}40`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: callout.color,
                  boxShadow: `0 0 10px ${callout.color}`,
                }}
              />
            </div>
            <div>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: 'white',
                }}
              >
                {callout.title}
              </div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.5)',
                  marginTop: '2px',
                }}
              >
                {callout.subtitle}
              </div>
            </div>
          </div>
        );
      })}

      {/* Bottom gradient */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '120px',
          background: 'linear-gradient(to top, rgba(10, 10, 15, 0.6), transparent)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
