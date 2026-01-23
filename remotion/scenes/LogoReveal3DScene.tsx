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
import { PerspectiveCamera, Float, RoundedBox, Text3D, Center } from '@react-three/drei';
import * as THREE from 'three';
import { FloatingParticles, GlowOrb } from '../components/FloatingParticles';
import { colors } from '../utils/animations';

/**
 * Logo Reveal 3D Scene - Particles converge to form the Caberu logo
 * Duration: 2 seconds (60 frames @ 30fps)
 * Inspired by: Arc Browser, Linear reveals
 */

// Individual particle that animates from random position to final position
const LogoParticle: React.FC<{
  startPos: [number, number, number];
  endPos: [number, number, number];
  frame: number;
  fps: number;
  delay: number;
  color: string;
  size: number;
}> = ({ startPos, endPos, frame, fps, delay, color, size }) => {
  const progress = spring({
    frame: frame - delay,
    fps,
    from: 0,
    to: 1,
    config: { damping: 20, stiffness: 150 },
  });

  const x = startPos[0] + (endPos[0] - startPos[0]) * progress;
  const y = startPos[1] + (endPos[1] - startPos[1]) * progress;
  const z = startPos[2] + (endPos[2] - startPos[2]) * progress;

  const scale = interpolate(progress, [0, 0.5, 1], [0.3, 1.2, 1]);
  const opacity = interpolate(progress, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <mesh position={[x, y, z]} scale={scale}>
      <sphereGeometry args={[size, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </mesh>
  );
};

// 3D Logo Icon (Tooth emoji represented as 3D shape)
const Logo3D: React.FC<{
  frame: number;
  fps: number;
}> = ({ frame, fps }) => {
  const scale = spring({
    frame: frame - 15,
    fps,
    from: 0,
    to: 1,
    config: { damping: 15, stiffness: 120 },
  });

  const rotation = spring({
    frame: frame - 15,
    fps,
    from: -Math.PI,
    to: 0,
    config: { damping: 20, stiffness: 100 },
  });

  const glow = 0.4 + Math.sin(frame / 10) * 0.2;

  return (
    <group scale={scale} rotation={[0, rotation, 0]}>
      {/* Main logo box */}
      <RoundedBox args={[1.5, 1.5, 0.3]} radius={0.3} smoothness={4}>
        <meshStandardMaterial
          color="#3b82f6"
          metalness={0.3}
          roughness={0.4}
          emissive="#3b82f6"
          emissiveIntensity={glow * 0.3}
        />
      </RoundedBox>

      {/* Inner glow */}
      <mesh>
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={glow * 0.1}
        />
      </mesh>

      {/* Outer glow */}
      <mesh>
        <sphereGeometry args={[1.8, 32, 32]} />
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={glow * 0.05}
        />
      </mesh>
    </group>
  );
};

export const LogoReveal3DScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Generate particles that will form the logo
  const particles = useMemo(() => {
    const count = 80;
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2;
      const radius = 0.5 + Math.random() * 0.3;

      // End positions form a square/logo shape
      const endX = (Math.cos(angle) * radius) * (Math.random() > 0.5 ? 1 : -1) * 0.5;
      const endY = (Math.sin(angle) * radius) * (Math.random() > 0.5 ? 1 : -1) * 0.5;
      const endZ = (Math.random() - 0.5) * 0.2;

      return {
        id: i,
        startPos: [
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
        ] as [number, number, number],
        endPos: [endX, endY, endZ] as [number, number, number],
        delay: Math.random() * 10,
        color: ['#3b82f6', '#8b5cf6', '#06b6d4', '#ffffff'][Math.floor(Math.random() * 4)],
        size: 0.03 + Math.random() * 0.05,
      };
    });
  }, []);

  // Camera zoom
  const cameraZ = interpolate(frame, [0, 30, 60], [8, 4, 5], {
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });

  // Tagline animation
  const taglineOpacity = spring({
    frame: frame - 35,
    fps,
    from: 0,
    to: 1,
    config: { damping: 20, stiffness: 100 },
  });

  const taglineY = spring({
    frame: frame - 35,
    fps,
    from: 30,
    to: 0,
    config: { damping: 18, stiffness: 100 },
  });

  // Fade out
  const fadeOut = interpolate(frame, [50, 60], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: colors.bgDark,
        opacity: fadeOut,
      }}
    >
      {/* 3D Canvas */}
      <ThreeCanvas
        width={width}
        height={height}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <PerspectiveCamera
            makeDefault
            position={[0, 0, cameraZ]}
            fov={50}
          />

          {/* Lighting */}
          <ambientLight intensity={0.3} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} />
          <pointLight position={[0, 0, 3]} intensity={0.6} color="#3b82f6" />
          <pointLight position={[-3, 2, 2]} intensity={0.4} color="#8b5cf6" />

          {/* Converging Particles */}
          {particles.map((p) => (
            <LogoParticle
              key={p.id}
              startPos={p.startPos}
              endPos={p.endPos}
              frame={frame}
              fps={fps}
              delay={p.delay}
              color={p.color}
              size={p.size}
            />
          ))}

          {/* Central Logo */}
          <Logo3D frame={frame} fps={fps} />

          {/* Background Particles */}
          <FloatingParticles
            count={30}
            bounds={{ x: 10, y: 8, z: 8 }}
            size={0.5}
          />

          {/* Accent Glow Orbs */}
          <GlowOrb position={[-3, 2, -2]} color="#3b82f6" size={0.3} pulseSpeed={1.5} />
          <GlowOrb position={[3, -1, -3]} color="#8b5cf6" size={0.25} pulseSpeed={1.2} />
          <GlowOrb position={[0, 3, -4]} color="#06b6d4" size={0.2} pulseSpeed={1} />
        </Suspense>
      </ThreeCanvas>

      {/* 2D Overlay - Tagline */}
      <div
        style={{
          position: 'absolute',
          bottom: '20%',
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            opacity: taglineOpacity,
            transform: `translateY(${taglineY}px)`,
            fontSize: '32px',
            fontWeight: 600,
            color: 'rgba(255, 255, 255, 0.9)',
            fontFamily: '"Inter", "DM Sans", system-ui, sans-serif',
            textAlign: 'center',
          }}
        >
          There's a better way
        </div>
      </div>

      {/* Radial gradient overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at center, transparent 30%, rgba(10, 10, 15, 0.5) 100%)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
