import React, { useMemo, useRef } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { generateParticles } from '../utils/animations';

interface FloatingParticlesProps {
  count?: number;
  color?: string;
  size?: number;
  speed?: number;
  bounds?: { x: number; y: number; z: number };
}

/**
 * Floating Particles - Ambient 3D particles that float gently in space
 * Creates depth and atmosphere in the scene
 */
export const FloatingParticles: React.FC<FloatingParticlesProps> = ({
  count = 50,
  color = '#3b82f6',
  size = 0.05,
  speed = 0.002,
  bounds = { x: 10, y: 10, z: 10 },
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const groupRef = useRef<THREE.Group>(null);

  // Generate particles once
  const particles = useMemo(() => generateParticles(count, bounds), [count, bounds]);

  // Animate particles based on frame
  const time = frame / fps;

  return (
    <group ref={groupRef}>
      {particles.map((particle) => {
        // Calculate animated position
        const y =
          particle.position[1] +
          Math.sin(time * particle.speed * 100 + particle.phase) * 0.5;
        const x =
          particle.position[0] +
          Math.sin(time * particle.speed * 50 + particle.phase * 2) * 0.3;
        const z =
          particle.position[2] +
          Math.cos(time * particle.speed * 75 + particle.phase) * 0.2;

        // Pulse opacity
        const opacity =
          0.4 + Math.sin(time * 2 + particle.phase) * 0.2;

        return (
          <mesh key={particle.id} position={[x, y, z]}>
            <sphereGeometry args={[particle.size * size * 20, 8, 8]} />
            <meshBasicMaterial
              color={particle.color || color}
              transparent
              opacity={opacity}
            />
          </mesh>
        );
      })}
    </group>
  );
};

/**
 * Glow Orb - A single glowing orb with bloom effect
 */
export const GlowOrb: React.FC<{
  position: [number, number, number];
  color?: string;
  size?: number;
  pulseSpeed?: number;
}> = ({ position, color = '#3b82f6', size = 0.3, pulseSpeed = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;

  const scale = 1 + Math.sin(time * pulseSpeed * 2) * 0.15;
  const opacity = 0.6 + Math.sin(time * pulseSpeed * 3) * 0.2;

  return (
    <group position={position}>
      {/* Core */}
      <mesh scale={scale}>
        <sphereGeometry args={[size, 32, 32]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} />
      </mesh>
      {/* Outer glow */}
      <mesh scale={scale * 1.5}>
        <sphereGeometry args={[size, 32, 32]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * 0.3} />
      </mesh>
      {/* Outer outer glow */}
      <mesh scale={scale * 2.2}>
        <sphereGeometry args={[size, 32, 32]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * 0.1} />
      </mesh>
    </group>
  );
};

/**
 * Light Ray - Volumetric light ray effect
 */
export const LightRay: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
  length?: number;
  width?: number;
}> = ({
  position,
  rotation = [0, 0, 0],
  color = '#3b82f6',
  length = 5,
  width = 0.1,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;

  const opacity = 0.1 + Math.sin(time * 0.5) * 0.05;

  return (
    <mesh position={position} rotation={rotation}>
      <cylinderGeometry args={[width, width * 2, length, 8]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </mesh>
  );
};
