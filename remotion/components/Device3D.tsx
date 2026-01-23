import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import * as THREE from 'three';
import { RoundedBox, Text } from '@react-three/drei';

/**
 * 3D MacBook Pro - A stylized floating laptop with screen content
 */
export const MacBook3D: React.FC<{
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  screenContent?: React.ReactNode;
  animate?: boolean;
}> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  animate = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;

  // Floating animation
  const floatY = animate ? Math.sin(time * 1.5) * 0.1 : 0;
  const floatRotation = animate ? Math.sin(time * 0.8) * 0.02 : 0;

  // Screen dimensions (16:10 aspect ratio for MacBook)
  const screenWidth = 3.2;
  const screenHeight = 2;
  const bezelWidth = 0.05;
  const bodyDepth = 0.08;
  const lidAngle = -Math.PI * 0.05; // Slightly open

  return (
    <group
      position={[position[0], position[1] + floatY, position[2]]}
      rotation={[rotation[0] + floatRotation, rotation[1], rotation[2] + floatRotation * 0.5]}
      scale={scale}
    >
      {/* Laptop Base (Bottom part with keyboard) */}
      <group position={[0, -0.05, 0]}>
        {/* Main body */}
        <RoundedBox args={[screenWidth + 0.2, bodyDepth, 2.2]} radius={0.02} smoothness={4}>
          <meshStandardMaterial
            color="#1a1a1a"
            metalness={0.9}
            roughness={0.2}
          />
        </RoundedBox>

        {/* Keyboard area (darker) */}
        <mesh position={[0, bodyDepth / 2 + 0.001, -0.15]}>
          <planeGeometry args={[screenWidth - 0.2, 1.4]} />
          <meshStandardMaterial color="#0a0a0a" metalness={0.5} roughness={0.7} />
        </mesh>

        {/* Trackpad */}
        <RoundedBox
          args={[1.2, 0.01, 0.8]}
          radius={0.005}
          smoothness={4}
          position={[0, bodyDepth / 2 + 0.005, 0.5]}
        >
          <meshStandardMaterial color="#1f1f1f" metalness={0.7} roughness={0.3} />
        </RoundedBox>

        {/* Keyboard keys (simplified grid) */}
        {[...Array(5)].map((_, row) =>
          [...Array(12)].map((_, col) => {
            const keyWidth = 0.2;
            const keyHeight = 0.15;
            const gap = 0.03;
            const startX = -((12 * (keyWidth + gap)) / 2) + keyWidth / 2;
            const startZ = -0.6 - (row * (keyHeight + gap));

            return (
              <RoundedBox
                key={`key-${row}-${col}`}
                args={[keyWidth, 0.015, keyHeight]}
                radius={0.01}
                smoothness={2}
                position={[
                  startX + col * (keyWidth + gap),
                  bodyDepth / 2 + 0.008,
                  startZ,
                ]}
              >
                <meshStandardMaterial color="#2a2a2a" metalness={0.3} roughness={0.8} />
              </RoundedBox>
            );
          })
        )}
      </group>

      {/* Laptop Lid (Screen part) */}
      <group
        position={[0, 0.95, -1.05]}
        rotation={[lidAngle, 0, 0]}
      >
        {/* Screen frame */}
        <RoundedBox
          args={[screenWidth + 0.15, screenHeight + 0.2, 0.04]}
          radius={0.02}
          smoothness={4}
        >
          <meshStandardMaterial
            color="#1a1a1a"
            metalness={0.9}
            roughness={0.2}
          />
        </RoundedBox>

        {/* Screen bezel */}
        <mesh position={[0, 0, 0.021]}>
          <planeGeometry args={[screenWidth + 0.1, screenHeight + 0.15]} />
          <meshStandardMaterial color="#000000" />
        </mesh>

        {/* Screen display */}
        <mesh position={[0, -0.02, 0.022]}>
          <planeGeometry args={[screenWidth, screenHeight]} />
          <meshBasicMaterial color="#0f172a" />
        </mesh>

        {/* Dashboard preview on screen */}
        <group position={[0, -0.02, 0.023]}>
          {/* Header bar */}
          <mesh position={[0, screenHeight / 2 - 0.1, 0]}>
            <planeGeometry args={[screenWidth - 0.1, 0.15]} />
            <meshBasicMaterial color="#1e293b" />
          </mesh>

          {/* Sidebar */}
          <mesh position={[-screenWidth / 2 + 0.25, -0.1, 0]}>
            <planeGeometry args={[0.4, screenHeight - 0.4]} />
            <meshBasicMaterial color="#1e293b" />
          </mesh>

          {/* Content cards */}
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[-0.5 + i * 0.9, 0.4, 0]}>
              <planeGeometry args={[0.8, 0.35]} />
              <meshBasicMaterial color={['#3b82f6', '#8b5cf6', '#06b6d4'][i]} transparent opacity={0.3} />
            </mesh>
          ))}

          {/* Calendar grid */}
          <mesh position={[0.3, -0.3, 0]}>
            <planeGeometry args={[1.8, 0.8]} />
            <meshBasicMaterial color="#1e293b" />
          </mesh>
        </group>

        {/* Camera notch */}
        <mesh position={[0, screenHeight / 2 + 0.03, 0.025]}>
          <circleGeometry args={[0.015, 16]} />
          <meshBasicMaterial color="#1a1a1a" />
        </mesh>

        {/* Apple logo (simplified) */}
        <mesh position={[0, 0, -0.021]}>
          <circleGeometry args={[0.1, 32]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {/* Reflection/shine effect */}
      <pointLight position={[2, 3, 2]} intensity={0.5} color="#ffffff" />
    </group>
  );
};

/**
 * 3D iPhone - A stylized floating phone with screen content
 */
export const IPhone3D: React.FC<{
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  animate?: boolean;
}> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  animate = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;

  const floatY = animate ? Math.sin(time * 2) * 0.05 : 0;
  const floatRotation = animate ? Math.sin(time) * 0.03 : 0;

  // iPhone Pro Max dimensions (scaled)
  const width = 0.8;
  const height = 1.7;
  const depth = 0.08;
  const cornerRadius = 0.08;

  return (
    <group
      position={[position[0], position[1] + floatY, position[2]]}
      rotation={[rotation[0] + floatRotation, rotation[1], rotation[2]]}
      scale={scale}
    >
      {/* Phone body */}
      <RoundedBox args={[width, height, depth]} radius={cornerRadius} smoothness={4}>
        <meshStandardMaterial
          color="#1a1a1a"
          metalness={0.9}
          roughness={0.1}
        />
      </RoundedBox>

      {/* Screen bezel */}
      <mesh position={[0, 0, depth / 2 + 0.001]}>
        <planeGeometry args={[width - 0.04, height - 0.04]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      {/* Screen display */}
      <mesh position={[0, 0, depth / 2 + 0.002]}>
        <planeGeometry args={[width - 0.06, height - 0.06]} />
        <meshBasicMaterial color="#0f172a" />
      </mesh>

      {/* Dynamic Island */}
      <RoundedBox
        args={[0.25, 0.08, 0.01]}
        radius={0.04}
        smoothness={4}
        position={[0, height / 2 - 0.12, depth / 2 + 0.003]}
      >
        <meshBasicMaterial color="#000000" />
      </RoundedBox>

      {/* App UI preview */}
      <group position={[0, 0, depth / 2 + 0.003]}>
        {/* Header */}
        <mesh position={[0, height / 2 - 0.25, 0]}>
          <planeGeometry args={[width - 0.1, 0.12]} />
          <meshBasicMaterial color="#1e293b" />
        </mesh>

        {/* Cards */}
        {[0, 1].map((i) => (
          <mesh key={i} position={[0, 0.3 - i * 0.4, 0]}>
            <planeGeometry args={[width - 0.12, 0.3]} />
            <meshBasicMaterial
              color={i === 0 ? '#3b82f6' : '#8b5cf6'}
              transparent
              opacity={0.3}
            />
          </mesh>
        ))}

        {/* Navigation bar */}
        <mesh position={[0, -height / 2 + 0.1, 0]}>
          <planeGeometry args={[width - 0.1, 0.1]} />
          <meshBasicMaterial color="#1e293b" />
        </mesh>
      </group>

      {/* Camera bump */}
      <group position={[-width / 2 + 0.18, height / 2 - 0.18, -depth / 2 - 0.01]}>
        <RoundedBox args={[0.25, 0.25, 0.02]} radius={0.03} smoothness={4}>
          <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.2} />
        </RoundedBox>
        {/* Camera lenses */}
        {[
          [0.05, 0.05],
          [-0.05, 0.05],
          [0.05, -0.05],
        ].map(([x, y], i) => (
          <mesh key={i} position={[x, y, -0.015]}>
            <circleGeometry args={[0.04, 16]} />
            <meshStandardMaterial color="#0a0a0a" metalness={0.9} roughness={0.1} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

/**
 * 3D Floating UI Card - Glassmorphism card floating in 3D space
 */
export const FloatingCard3D: React.FC<{
  position?: [number, number, number];
  rotation?: [number, number, number];
  width?: number;
  height?: number;
  color?: string;
  glowColor?: string;
  animate?: boolean;
  children?: React.ReactNode;
}> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 2,
  height = 1.2,
  color = '#1e293b',
  glowColor = '#3b82f6',
  animate = true,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;

  const floatY = animate ? Math.sin(time * 1.2) * 0.05 : 0;
  const floatRotation = animate ? Math.sin(time * 0.6) * 0.01 : 0;

  return (
    <group
      position={[position[0], position[1] + floatY, position[2]]}
      rotation={[rotation[0] + floatRotation, rotation[1], rotation[2]]}
    >
      {/* Card shadow */}
      <mesh position={[0.05, -0.05, -0.1]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.3} />
      </mesh>

      {/* Card body */}
      <RoundedBox args={[width, height, 0.02]} radius={0.04} smoothness={4}>
        <meshStandardMaterial
          color={color}
          metalness={0.1}
          roughness={0.8}
          transparent
          opacity={0.9}
        />
      </RoundedBox>

      {/* Glow border effect */}
      <mesh position={[0, 0, 0.011]}>
        <planeGeometry args={[width - 0.02, height - 0.02]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={0.05}
        />
      </mesh>

      {/* Border highlight */}
      <RoundedBox args={[width + 0.01, height + 0.01, 0.005]} radius={0.045} smoothness={4} position={[0, 0, -0.01]}>
        <meshBasicMaterial color={glowColor} transparent opacity={0.2} />
      </RoundedBox>

      {children}
    </group>
  );
};
