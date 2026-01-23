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
import { PerspectiveCamera, Float, RoundedBox, Sphere, Ring } from '@react-three/drei';
import * as THREE from 'three';
import { FloatingParticles, GlowOrb } from '../components/FloatingParticles';
import { colors } from '../utils/animations';

/**
 * CTA 3D Scene - Dramatic finale with converging elements
 * Duration: 8 seconds (240 frames @ 30fps)
 * All elements converge to center, logo prominently displayed
 */

// Converging particle that moves toward center
const ConvergingParticle: React.FC<{
  startPos: [number, number, number];
  frame: number;
  fps: number;
  delay: number;
  color: string;
  size: number;
}> = ({ startPos, frame, fps, delay, color, size }) => {
  const progress = spring({
    frame: frame - delay,
    fps,
    from: 0,
    to: 1,
    config: { damping: 25, stiffness: 80 },
  });

  // Move from start position to center
  const x = startPos[0] * (1 - progress);
  const y = startPos[1] * (1 - progress);
  const z = startPos[2] * (1 - progress);

  // Scale down as it approaches center
  const scale = interpolate(progress, [0, 0.8, 1], [1, 0.8, 0]);

  if (scale <= 0) return null;

  return (
    <Sphere args={[size, 8, 8]} position={[x, y, z]} scale={scale}>
      <meshBasicMaterial color={color} transparent opacity={0.8} />
    </Sphere>
  );
};

// Logo 3D component for finale
const Logo3DFinale: React.FC<{
  frame: number;
  fps: number;
}> = ({ frame, fps }) => {
  const entryScale = spring({
    frame: frame - 60,
    fps,
    from: 0,
    to: 1,
    config: { damping: 15, stiffness: 100 },
  });

  const rotation = spring({
    frame: frame - 60,
    fps,
    from: Math.PI * 2,
    to: 0,
    config: { damping: 20, stiffness: 80 },
  });

  const glowPulse = 0.5 + Math.sin((frame - 60) * 0.08) * 0.3;
  const floatY = Math.sin((frame - 60) * 0.04) * 0.1;

  return (
    <Float speed={1.5} rotationIntensity={0.02} floatIntensity={0.05}>
      <group
        scale={entryScale}
        rotation={[0, rotation, 0]}
        position={[0, floatY, 0]}
      >
        {/* Main logo box */}
        <RoundedBox args={[1.5, 1.5, 0.3]} radius={0.3} smoothness={4}>
          <meshStandardMaterial
            color="#3b82f6"
            metalness={0.4}
            roughness={0.3}
            emissive="#3b82f6"
            emissiveIntensity={glowPulse * 0.4}
          />
        </RoundedBox>

        {/* Inner glow sphere */}
        <Sphere args={[1, 32, 32]}>
          <meshBasicMaterial
            color="#3b82f6"
            transparent
            opacity={glowPulse * 0.15}
          />
        </Sphere>

        {/* Outer glow */}
        <Sphere args={[1.5, 32, 32]}>
          <meshBasicMaterial
            color="#3b82f6"
            transparent
            opacity={glowPulse * 0.08}
          />
        </Sphere>

        {/* Orbiting rings */}
        {[0, 1, 2].map((i) => {
          const ringRotation = ((frame - 60) * 0.02 + i * (Math.PI * 2 / 3));
          const ringOpacity = entryScale * 0.3;

          return (
            <group key={i} rotation={[Math.PI / 4 + i * 0.3, ringRotation, 0]}>
              <Ring args={[1.8, 1.85, 64]}>
                <meshBasicMaterial
                  color={['#3b82f6', '#8b5cf6', '#06b6d4'][i]}
                  transparent
                  opacity={ringOpacity}
                />
              </Ring>
            </group>
          );
        })}
      </group>
    </Float>
  );
};

export const CTA3DScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Generate converging particles
  const convergingParticles = useMemo(() => {
    return Array.from({ length: 100 }, (_, i) => {
      const angle = (i / 100) * Math.PI * 2;
      const radius = 5 + Math.random() * 5;
      const height = (Math.random() - 0.5) * 6;

      return {
        id: i,
        startPos: [
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius,
        ] as [number, number, number],
        delay: Math.random() * 40,
        color: ['#3b82f6', '#8b5cf6', '#06b6d4', '#ffffff'][Math.floor(Math.random() * 4)],
        size: 0.03 + Math.random() * 0.05,
      };
    });
  }, []);

  // Camera zoom
  const cameraZ = interpolate(frame, [0, 60, 180, 240], [8, 5, 4, 4.5], {
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });

  const cameraY = interpolate(frame, [0, 60], [1, 0.5], {
    extrapolateRight: 'clamp',
  });

  // Title animations
  const titleScale = spring({
    frame: frame - 80,
    fps,
    from: 0.8,
    to: 1,
    config: { damping: 15, stiffness: 100 },
  });

  const titleOpacity = spring({
    frame: frame - 80,
    fps,
    from: 0,
    to: 1,
    config: { damping: 20 },
  });

  // CTA button animation
  const buttonScale = spring({
    frame: frame - 120,
    fps,
    from: 0,
    to: 1,
    config: { damping: 12, stiffness: 150 },
  });

  const buttonGlow = 0.3 + Math.sin((frame - 120) * 0.1) * 0.2;

  // Contact info animation
  const contactOpacity = spring({
    frame: frame - 160,
    fps,
    from: 0,
    to: 1,
    config: { damping: 20 },
  });

  // Final fade
  const finalFade = interpolate(frame, [220, 240], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at center, ${colors.bgNavy} 0%, ${colors.bgDark} 100%)`,
        opacity: finalFade,
      }}
    >
      {/* 3D Canvas */}
      <ThreeCanvas
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <PerspectiveCamera
            makeDefault
            position={[0, cameraY, cameraZ]}
            fov={50}
          />

          {/* Lighting */}
          <ambientLight intensity={0.3} />
          <directionalLight position={[5, 5, 5]} intensity={0.5} />
          <pointLight position={[0, 0, 2]} intensity={1} color="#3b82f6" />
          <pointLight position={[-2, 1, 1]} intensity={0.5} color="#8b5cf6" />

          {/* Converging particles */}
          {convergingParticles.map((p) => (
            <ConvergingParticle
              key={p.id}
              startPos={p.startPos}
              frame={frame}
              fps={fps}
              delay={p.delay}
              color={p.color}
              size={p.size}
            />
          ))}

          {/* Center Logo */}
          <Logo3DFinale frame={frame} fps={fps} />

          {/* Background particles (slower, ambient) */}
          <FloatingParticles
            count={30}
            bounds={{ x: 10, y: 6, z: 8 }}
            size={0.3}
            speed={0.001}
          />

          {/* Accent orbs */}
          <GlowOrb position={[-4, 2, -4]} color="#3b82f6" size={0.3} pulseSpeed={0.6} />
          <GlowOrb position={[4, -1, -3]} color="#8b5cf6" size={0.25} pulseSpeed={0.8} />
          <GlowOrb position={[-3, -2, -2]} color="#06b6d4" size={0.2} pulseSpeed={1} />
          <GlowOrb position={[3, 2, -5]} color="#3b82f6" size={0.15} pulseSpeed={1.2} />
        </Suspense>
      </ThreeCanvas>

      {/* 2D Overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        {/* Main CTA content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: '80px',
          }}
        >
          {/* Logo emoji placeholder */}
          <div
            style={{
              opacity: spring({ frame: frame - 60, fps, from: 0, to: 1, config: { damping: 20 } }),
              fontSize: '80px',
              marginBottom: '20px',
            }}
          >
            🦷
          </div>

          {/* Brand name */}
          <div
            style={{
              opacity: titleOpacity,
              transform: `scale(${titleScale})`,
              fontSize: '80px',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 50%, #c7d2fe 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontFamily: '"Inter", "DM Sans", system-ui, sans-serif',
              letterSpacing: '-4px',
              marginBottom: '16px',
            }}
          >
            Caberu
          </div>

          {/* Tagline */}
          <div
            style={{
              opacity: spring({ frame: frame - 100, fps, from: 0, to: 1, config: { damping: 20 } }),
              fontSize: '32px',
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.9)',
              fontFamily: '"Inter", "DM Sans", system-ui, sans-serif',
              marginBottom: '40px',
            }}
          >
            Transform Your Practice
          </div>

          {/* CTA Button */}
          <div
            style={{
              transform: `scale(${buttonScale})`,
              opacity: buttonScale,
            }}
          >
            <div
              style={{
                padding: '20px 50px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                borderRadius: '12px',
                fontSize: '20px',
                fontWeight: 700,
                color: 'white',
                fontFamily: '"Inter", "DM Sans", system-ui, sans-serif',
                boxShadow: `0 10px 40px rgba(59, 130, 246, ${buttonGlow}), 0 0 60px rgba(59, 130, 246, ${buttonGlow * 0.5})`,
                border: '1px solid rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              Start Free Trial
              <span style={{ fontSize: '18px' }}>→</span>
            </div>
          </div>

          {/* Pricing hint */}
          <div
            style={{
              opacity: spring({ frame: frame - 140, fps, from: 0, to: 1, config: { damping: 20 } }),
              marginTop: '20px',
              fontSize: '16px',
              color: 'rgba(255, 255, 255, 0.6)',
              fontFamily: '"Inter", "DM Sans", system-ui, sans-serif',
            }}
          >
            Starting at €249/month • No credit card required
          </div>
        </div>

        {/* Contact info */}
        <div
          style={{
            position: 'absolute',
            bottom: '60px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            opacity: contactOpacity,
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '40px',
              alignItems: 'center',
            }}
          >
            {/* Website */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'rgba(59, 130, 246, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                }}
              >
                🌐
              </div>
              <span
                style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: 'white',
                  fontFamily: '"Inter", "DM Sans", system-ui, sans-serif',
                }}
              >
                caberu.be
              </span>
            </div>

            {/* Divider */}
            <div
              style={{
                width: '1px',
                height: '30px',
                background: 'rgba(255, 255, 255, 0.2)',
              }}
            />

            {/* Email */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'rgba(139, 92, 246, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                }}
              >
                ✉️
              </div>
              <span
                style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: 'white',
                  fontFamily: '"Inter", "DM Sans", system-ui, sans-serif',
                }}
              >
                hello@caberu.be
              </span>
            </div>
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: '14px',
              color: 'rgba(255, 255, 255, 0.5)',
              fontFamily: '"Inter", "DM Sans", system-ui, sans-serif',
            }}
          >
            AI-Powered Practice Management for Belgian Healthcare
          </div>
        </div>
      </div>

      {/* Vignette effect */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0, 0, 0, 0.5) 100%)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
