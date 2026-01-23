import React, { Suspense, useMemo } from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { OrbitControls, PerspectiveCamera, Environment, Float, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { MacBook3D, IPhone3D, FloatingCard3D } from '../components/Device3D';
import { FloatingParticles, GlowOrb } from '../components/FloatingParticles';
import { easings, colors, orbit } from '../utils/animations';

/**
 * Hero 3D Scene - Premium floating MacBook with orbiting camera
 * Duration: 7 seconds (210 frames @ 30fps)
 * Inspired by: Vercel, Linear product shots
 */
export const Hero3DScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const time = frame / fps;

  // Camera animation - smooth orbit around the device
  const cameraProgress = interpolate(frame, [0, 180], [0, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });

  const cameraAngle = cameraProgress * Math.PI * 0.4;
  const cameraDistance = interpolate(frame, [0, 60, 180], [8, 5.5, 6], {
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });
  const cameraHeight = interpolate(frame, [0, 60, 180], [3, 2, 2.5], {
    extrapolateRight: 'clamp',
  });

  const cameraX = Math.sin(cameraAngle) * cameraDistance;
  const cameraZ = Math.cos(cameraAngle) * cameraDistance;

  // Entry animation
  const entryProgress = spring({
    frame,
    fps,
    from: 0,
    to: 1,
    config: { damping: 20, stiffness: 80 },
  });

  // Device entry
  const deviceScale = spring({
    frame: frame - 10,
    fps,
    from: 0.7,
    to: 1,
    config: { damping: 15, stiffness: 100 },
  });

  const deviceOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Feature labels that appear
  const labels = [
    { text: 'AI Voice Assistant', position: [2.5, 1.5, 0], delay: 60 },
    { text: 'Smart Scheduling', position: [-2.8, 0.5, 1], delay: 90 },
    { text: 'Real-time Analytics', position: [2.2, -0.5, 1.5], delay: 120 },
  ];

  // Fade out at end
  const fadeOut = interpolate(frame, [190, 210], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${colors.bgDark} 0%, ${colors.bgNavy} 50%, ${colors.bgPurple} 100%)`,
        opacity: fadeOut,
      }}
    >
      {/* 3D Canvas */}
      <ThreeCanvas
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          {/* Animated Camera */}
          <PerspectiveCamera
            makeDefault
            position={[cameraX, cameraHeight, cameraZ]}
            fov={45}
          />

          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} color="#ffffff" />
          <directionalLight position={[-5, 3, -5]} intensity={0.4} color="#8b5cf6" />
          <pointLight position={[0, 3, 0]} intensity={0.5} color="#3b82f6" />

          {/* Environment for reflections */}
          <Environment preset="city" />

          {/* Main MacBook */}
          <group
            scale={deviceScale}
            position={[0, 0, 0]}
            rotation={[0.1, 0, 0]}
          >
            <Float
              speed={1.5}
              rotationIntensity={0.1}
              floatIntensity={0.2}
              floatingRange={[-0.05, 0.05]}
            >
              <MacBook3D position={[0, 0, 0]} animate={false} />
            </Float>
          </group>

          {/* iPhone companion */}
          <group
            position={[2.5, -0.3, 0.5]}
            rotation={[0.1, -0.3, 0.05]}
          >
            <Float
              speed={2}
              rotationIntensity={0.15}
              floatIntensity={0.3}
              floatingRange={[-0.03, 0.03]}
            >
              <IPhone3D
                scale={spring({
                  frame: frame - 40,
                  fps,
                  from: 0,
                  to: 0.8,
                  config: { damping: 15, stiffness: 100 },
                })}
                animate={false}
              />
            </Float>
          </group>

          {/* Floating Feature Cards */}
          {labels.map((label, i) => {
            const cardScale = spring({
              frame: frame - label.delay,
              fps,
              from: 0,
              to: 1,
              config: { damping: 15, stiffness: 120 },
            });

            return (
              <Float
                key={i}
                speed={1.2 + i * 0.3}
                rotationIntensity={0.05}
                floatIntensity={0.15}
              >
                <FloatingCard3D
                  position={label.position as [number, number, number]}
                  rotation={[0, -cameraAngle * 0.3, 0]}
                  width={1.8}
                  height={0.5}
                  color="#1e293b"
                  glowColor={['#3b82f6', '#8b5cf6', '#06b6d4'][i]}
                  animate={false}
                >
                  <group position={[0, 0, 0.02]} scale={cardScale}>
                    {/* Label text placeholder */}
                  </group>
                </FloatingCard3D>
              </Float>
            );
          })}

          {/* Ambient Particles */}
          <FloatingParticles
            count={60}
            bounds={{ x: 8, y: 5, z: 8 }}
            size={0.8}
          />

          {/* Glow Orbs */}
          <GlowOrb position={[-4, 2, -3]} color="#3b82f6" size={0.2} pulseSpeed={0.8} />
          <GlowOrb position={[4, 1, -2]} color="#8b5cf6" size={0.15} pulseSpeed={1.2} />
          <GlowOrb position={[-3, -1, 2]} color="#06b6d4" size={0.18} pulseSpeed={1} />
          <GlowOrb position={[3, 2.5, 1]} color="#3b82f6" size={0.12} pulseSpeed={1.5} />

          {/* Contact Shadows */}
          <ContactShadows
            position={[0, -1.5, 0]}
            opacity={0.4}
            scale={10}
            blur={2}
            far={4}
            color="#000000"
          />

          {/* Grid floor (subtle) */}
          <gridHelper
            args={[20, 20, '#1e293b', '#1e293b']}
            position={[0, -1.5, 0]}
          />
        </Suspense>
      </ThreeCanvas>

      {/* 2D Overlay - Title and labels */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '60px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        {/* Tagline */}
        <div
          style={{
            opacity: interpolate(frame, [30, 50], [0, 1], { extrapolateRight: 'clamp' }),
            transform: `translateY(${interpolate(frame, [30, 50], [20, 0], { extrapolateRight: 'clamp' })}px)`,
            fontSize: '24px',
            fontWeight: 500,
            color: 'rgba(255, 255, 255, 0.7)',
            fontFamily: '"Inter", "DM Sans", system-ui, sans-serif',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '16px',
          }}
        >
          Introducing
        </div>

        {/* Logo / Brand */}
        <div
          style={{
            opacity: interpolate(frame, [40, 60], [0, 1], { extrapolateRight: 'clamp' }),
            transform: `translateY(${interpolate(frame, [40, 60], [30, 0], { extrapolateRight: 'clamp' })}px) scale(${spring({ frame: frame - 40, fps, from: 0.8, to: 1, config: { damping: 15, stiffness: 100 } })})`,
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
          }}
        >
          {/* Logo Icon */}
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '20px',
              background: colors.gradientBlue,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '42px',
              boxShadow: '0 20px 60px rgba(59, 130, 246, 0.4)',
            }}
          >
            🦷
          </div>
          <div
            style={{
              fontSize: '72px',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-3px',
              fontFamily: '"Inter", "DM Sans", system-ui, sans-serif',
            }}
          >
            Caberu
          </div>
        </div>

        {/* Subtitle */}
        <div
          style={{
            opacity: interpolate(frame, [60, 80], [0, 1], { extrapolateRight: 'clamp' }),
            transform: `translateY(${interpolate(frame, [60, 80], [20, 0], { extrapolateRight: 'clamp' })}px)`,
            fontSize: '28px',
            fontWeight: 500,
            color: 'rgba(255, 255, 255, 0.8)',
            fontFamily: '"Inter", "DM Sans", system-ui, sans-serif',
            marginTop: '20px',
          }}
        >
          AI-Powered Practice Management
        </div>
      </div>

      {/* Feature Labels (2D overlay positioned to match 3D cards) */}
      {labels.map((label, i) => {
        const labelOpacity = spring({
          frame: frame - label.delay - 10,
          fps,
          from: 0,
          to: 1,
          config: { damping: 15 },
        });

        const positions = [
          { left: '70%', top: '25%' },
          { left: '8%', top: '45%' },
          { left: '72%', top: '65%' },
        ];

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              ...positions[i],
              opacity: labelOpacity,
              transform: `translateY(${interpolate(frame, [label.delay, label.delay + 20], [15, 0], { extrapolateRight: 'clamp' })}px)`,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: ['#3b82f6', '#8b5cf6', '#06b6d4'][i],
                boxShadow: `0 0 20px ${['#3b82f6', '#8b5cf6', '#06b6d4'][i]}`,
              }}
            />
            <div
              style={{
                padding: '10px 20px',
                background: 'rgba(30, 41, 59, 0.8)',
                backdropFilter: 'blur(10px)',
                borderRadius: '8px',
                border: `1px solid ${['rgba(59, 130, 246, 0.3)', 'rgba(139, 92, 246, 0.3)', 'rgba(6, 182, 212, 0.3)'][i]}`,
                color: 'white',
                fontSize: '16px',
                fontWeight: 600,
                fontFamily: '"Inter", "DM Sans", system-ui, sans-serif',
              }}
            >
              {label.text}
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
          height: '200px',
          background: 'linear-gradient(to top, rgba(10, 10, 15, 0.8), transparent)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
