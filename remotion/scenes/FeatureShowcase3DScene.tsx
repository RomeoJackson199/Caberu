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
import { PerspectiveCamera, Float, RoundedBox, Text } from '@react-three/drei';
import * as THREE from 'three';
import { FloatingParticles, GlowOrb } from '../components/FloatingParticles';
import { FloatingCard3D } from '../components/Device3D';
import { colors } from '../utils/animations';

/**
 * Feature Showcase 3D Scene - Camera flies through floating feature cards
 * Duration: 12 seconds (360 frames @ 30fps)
 * Each feature gets spotlight for ~2 seconds
 */

// Feature card with icon and description
const Feature3DCard: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
  icon: string;
  title: string;
  description: string;
  color: string;
  frame: number;
  fps: number;
  activeFrame: number;
  duration: number;
}> = ({
  position,
  rotation = [0, 0, 0],
  icon,
  title,
  description,
  color,
  frame,
  fps,
  activeFrame,
  duration,
}) => {
  // Scale animation when feature becomes active
  const isActive = frame >= activeFrame && frame < activeFrame + duration;
  const entryProgress = spring({
    frame: frame - activeFrame + 30,
    fps,
    from: 0,
    to: 1,
    config: { damping: 20, stiffness: 100 },
  });

  const activeScale = isActive
    ? spring({
        frame: frame - activeFrame,
        fps,
        from: 1,
        to: 1.15,
        config: { damping: 15, stiffness: 120 },
      })
    : spring({
        frame: frame - activeFrame - duration,
        fps,
        from: 1.15,
        to: 1,
        config: { damping: 15, stiffness: 120 },
      });

  const glowIntensity = isActive ? 0.3 + Math.sin(frame * 0.15) * 0.1 : 0.1;

  return (
    <Float
      speed={1.5}
      rotationIntensity={0.05}
      floatIntensity={0.1}
    >
      <group
        position={position}
        rotation={rotation}
        scale={entryProgress * (isActive ? activeScale : 1)}
      >
        {/* Card background */}
        <RoundedBox args={[2.5, 1.6, 0.1]} radius={0.1} smoothness={4}>
          <meshStandardMaterial
            color="#1e293b"
            metalness={0.1}
            roughness={0.8}
            transparent
            opacity={0.95}
          />
        </RoundedBox>

        {/* Glow border when active */}
        {isActive && (
          <mesh position={[0, 0, -0.01]}>
            <planeGeometry args={[2.6, 1.7]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={glowIntensity}
            />
          </mesh>
        )}

        {/* Icon circle */}
        <group position={[-0.7, 0.3, 0.06]}>
          <RoundedBox args={[0.5, 0.5, 0.05]} radius={0.1} smoothness={4}>
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={isActive ? 0.4 : 0.2}
              metalness={0.3}
              roughness={0.5}
            />
          </RoundedBox>
        </group>

        {/* Content area (placeholder for text) */}
        <mesh position={[0.3, 0.3, 0.06]}>
          <planeGeometry args={[1.4, 0.2]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
        </mesh>

        <mesh position={[0.2, -0.1, 0.06]}>
          <planeGeometry args={[1.6, 0.15]} />
          <meshBasicMaterial color="#94a3b8" transparent opacity={0.5} />
        </mesh>

        <mesh position={[0.1, -0.35, 0.06]}>
          <planeGeometry args={[1.4, 0.15]} />
          <meshBasicMaterial color="#94a3b8" transparent opacity={0.3} />
        </mesh>
      </group>
    </Float>
  );
};

export const FeatureShowcase3DScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Features with their timing
  const features = useMemo(() => [
    {
      icon: '📅',
      title: 'Smart Scheduling',
      description: '27ms slot-finding algorithm',
      color: '#3b82f6',
      position: [-3, 1, -2] as [number, number, number],
      rotation: [0, 0.3, 0] as [number, number, number],
      activeFrame: 0,
    },
    {
      icon: '💬',
      title: 'WhatsApp Integration',
      description: 'Direct patient messaging',
      color: '#25D366',
      position: [3, 0.5, -1] as [number, number, number],
      rotation: [0, -0.3, 0] as [number, number, number],
      activeFrame: 60,
    },
    {
      icon: '📊',
      title: 'Real-time Analytics',
      description: 'Business intelligence dashboard',
      color: '#8b5cf6',
      position: [-2.5, -1, 0] as [number, number, number],
      rotation: [0, 0.2, 0] as [number, number, number],
      activeFrame: 120,
    },
    {
      icon: '📱',
      title: 'Patient Portal',
      description: 'Self-service booking & records',
      color: '#06b6d4',
      position: [2.5, -0.5, 1] as [number, number, number],
      rotation: [0, -0.25, 0] as [number, number, number],
      activeFrame: 180,
    },
    {
      icon: '🔒',
      title: 'GDPR Compliant',
      description: 'Belgian data protection standards',
      color: '#22c55e',
      position: [0, 1.5, -3] as [number, number, number],
      rotation: [0.1, 0, 0] as [number, number, number],
      activeFrame: 240,
    },
    {
      icon: '⚡',
      title: 'Fast Performance',
      description: '99.9% uptime guarantee',
      color: '#f59e0b',
      position: [0, -1.5, 2] as [number, number, number],
      rotation: [-0.1, 0, 0] as [number, number, number],
      activeFrame: 300,
    },
  ], []);

  // Camera path through the features
  const cameraPath = interpolate(frame, [0, 360], [0, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });

  // Calculate camera position based on which feature is active
  const activeFeatureIndex = Math.min(
    Math.floor(frame / 60),
    features.length - 1
  );
  const activeFeature = features[activeFeatureIndex];

  // Smooth camera movement to focus on active feature
  const targetX = interpolate(
    frame,
    features.map((f, i) => i * 60),
    features.map(f => f.position[0] * 0.3),
    { extrapolateRight: 'clamp' }
  );

  const targetY = interpolate(
    frame,
    features.map((f, i) => i * 60),
    features.map(f => f.position[1] * 0.3 + 1),
    { extrapolateRight: 'clamp' }
  );

  const cameraZ = interpolate(frame, [0, 60, 360], [8, 5, 5.5], {
    extrapolateRight: 'clamp',
  });

  // Feature indicator title
  const currentFeature = features[activeFeatureIndex];

  // Fade out
  const fadeOut = interpolate(frame, [345, 360], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${colors.bgDark} 0%, #0c1222 50%, ${colors.bgNavy} 100%)`,
        opacity: fadeOut,
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
            position={[targetX, targetY, cameraZ]}
            fov={50}
          />

          {/* Lighting */}
          <ambientLight intensity={0.3} />
          <directionalLight position={[5, 5, 5]} intensity={0.6} />
          <pointLight
            position={[activeFeature.position[0], activeFeature.position[1], activeFeature.position[2] + 2]}
            intensity={0.8}
            color={activeFeature.color}
          />

          {/* Feature Cards */}
          {features.map((feature, i) => (
            <Feature3DCard
              key={i}
              position={feature.position}
              rotation={feature.rotation}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              color={feature.color}
              frame={frame}
              fps={fps}
              activeFrame={feature.activeFrame}
              duration={60}
            />
          ))}

          {/* Connection lines between cards */}
          {features.slice(0, -1).map((feature, i) => {
            const nextFeature = features[i + 1];
            const lineOpacity = interpolate(
              frame,
              [feature.activeFrame, feature.activeFrame + 30],
              [0, 0.2],
              { extrapolateRight: 'clamp' }
            );

            return (
              <line key={`line-${i}`}>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    count={2}
                    array={new Float32Array([
                      ...feature.position,
                      ...nextFeature.position,
                    ])}
                    itemSize={3}
                  />
                </bufferGeometry>
                <lineBasicMaterial
                  color={feature.color}
                  transparent
                  opacity={lineOpacity}
                />
              </line>
            );
          })}

          {/* Background Particles */}
          <FloatingParticles
            count={50}
            bounds={{ x: 10, y: 6, z: 8 }}
            size={0.5}
          />

          {/* Ambient Glow Orbs */}
          <GlowOrb position={[-5, 3, -5]} color="#3b82f6" size={0.3} pulseSpeed={0.8} />
          <GlowOrb position={[5, -2, -4]} color="#8b5cf6" size={0.25} pulseSpeed={1.2} />
          <GlowOrb position={[0, 4, -6]} color="#06b6d4" size={0.2} pulseSpeed={1} />
        </Suspense>
      </ThreeCanvas>

      {/* 2D Overlay - Feature indicator */}
      <div
        style={{
          position: 'absolute',
          top: '6%',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'rgba(255, 255, 255, 0.5)',
            fontFamily: '"Inter", "DM Sans", system-ui, sans-serif',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}
        >
          Feature {activeFeatureIndex + 1} of {features.length}
        </div>
        <div
          style={{
            fontSize: '42px',
            fontWeight: 800,
            color: 'white',
            fontFamily: '"Inter", "DM Sans", system-ui, sans-serif',
          }}
        >
          {currentFeature.icon} {currentFeature.title}
        </div>
        <div
          style={{
            fontSize: '20px',
            fontWeight: 500,
            color: currentFeature.color,
            fontFamily: '"Inter", "DM Sans", system-ui, sans-serif',
            marginTop: '8px',
          }}
        >
          {currentFeature.description}
        </div>
      </div>

      {/* Progress dots */}
      <div
        style={{
          position: 'absolute',
          bottom: '8%',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '12px',
        }}
      >
        {features.map((feature, i) => (
          <div
            key={i}
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: i === activeFeatureIndex ? feature.color : 'rgba(255, 255, 255, 0.2)',
              boxShadow: i === activeFeatureIndex ? `0 0 15px ${feature.color}` : 'none',
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};
