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
import { colors, animateCounter } from '../utils/animations';

/**
 * Social Proof 3D Scene - Belgium map with practice locations and stats
 * Duration: 6 seconds (180 frames @ 30fps)
 */

// Belgium shape (simplified polygon for 3D extrusion)
const BelgiumMap3D: React.FC<{
  frame: number;
  fps: number;
}> = ({ frame, fps }) => {
  const entryScale = spring({
    frame,
    fps,
    from: 0.7,
    to: 1,
    config: { damping: 20, stiffness: 100 },
  });

  const rotation = frame * 0.002;
  const floatY = Math.sin(frame * 0.03) * 0.1;

  // Practice locations (approximate coordinates on map)
  const practices = useMemo(() => [
    { name: 'Brussels', position: [0, 0.2, 0.05] as [number, number, number], delay: 30 },
    { name: 'Antwerp', position: [0.4, 0.6, 0.05] as [number, number, number], delay: 45 },
    { name: 'Ghent', position: [-0.3, 0.5, 0.05] as [number, number, number], delay: 60 },
    { name: 'Bruges', position: [-0.7, 0.5, 0.05] as [number, number, number], delay: 75 },
    { name: 'Liège', position: [0.8, 0.1, 0.05] as [number, number, number], delay: 90 },
    { name: 'Leuven', position: [0.3, 0.3, 0.05] as [number, number, number], delay: 105 },
    { name: 'Namur', position: [0.4, -0.2, 0.05] as [number, number, number], delay: 120 },
    { name: 'Charleroi', position: [0.1, -0.3, 0.05] as [number, number, number], delay: 135 },
  ], []);

  return (
    <group
      scale={entryScale * 2}
      rotation={[0.3, rotation, 0]}
      position={[0, floatY, 0]}
    >
      {/* Simplified Belgium shape */}
      <RoundedBox args={[2, 1.5, 0.05]} radius={0.1} smoothness={4}>
        <meshStandardMaterial
          color="#1e3a5f"
          metalness={0.3}
          roughness={0.7}
          transparent
          opacity={0.9}
        />
      </RoundedBox>

      {/* Country outline glow */}
      <mesh position={[0, 0, -0.03]}>
        <planeGeometry args={[2.1, 1.6]} />
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.15 + Math.sin(frame * 0.1) * 0.05}
        />
      </mesh>

      {/* Grid pattern overlay */}
      <mesh position={[0, 0, 0.026]}>
        <planeGeometry args={[1.95, 1.45]} />
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.05}
          wireframe
        />
      </mesh>

      {/* Practice location dots */}
      {practices.map((practice, i) => {
        const dotScale = spring({
          frame: frame - practice.delay,
          fps,
          from: 0,
          to: 1,
          config: { damping: 12, stiffness: 180 },
        });

        const pulseScale = 1 + Math.sin((frame - practice.delay) * 0.15 + i) * 0.2;

        return (
          <group key={i} position={practice.position}>
            {/* Pulsing ring */}
            {frame > practice.delay && (
              <>
                <Ring
                  args={[0.04 * pulseScale, 0.06 * pulseScale, 16]}
                  rotation={[-Math.PI / 2, 0, 0]}
                  position={[0, 0.01, 0]}
                >
                  <meshBasicMaterial
                    color="#3b82f6"
                    transparent
                    opacity={0.3 / pulseScale}
                  />
                </Ring>
                <Ring
                  args={[0.08 * pulseScale, 0.1 * pulseScale, 16]}
                  rotation={[-Math.PI / 2, 0, 0]}
                  position={[0, 0.01, 0]}
                >
                  <meshBasicMaterial
                    color="#3b82f6"
                    transparent
                    opacity={0.15 / pulseScale}
                  />
                </Ring>
              </>
            )}

            {/* Main dot */}
            <Sphere args={[0.04, 16, 16]} scale={dotScale}>
              <meshBasicMaterial
                color="#3b82f6"
              />
            </Sphere>

            {/* Glow */}
            <Sphere args={[0.06, 16, 16]} scale={dotScale}>
              <meshBasicMaterial
                color="#3b82f6"
                transparent
                opacity={0.3}
              />
            </Sphere>
          </group>
        );
      })}

      {/* Connection lines between dots */}
      {practices.slice(0, -1).map((practice, i) => {
        const nextPractice = practices[i + 1];
        const lineOpacity = spring({
          frame: frame - Math.max(practice.delay, nextPractice.delay) - 10,
          fps,
          from: 0,
          to: 0.15,
          config: { damping: 20 },
        });

        if (frame < Math.max(practice.delay, nextPractice.delay)) return null;

        return (
          <line key={`line-${i}`}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([
                  ...practice.position,
                  ...nextPractice.position,
                ])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial
              color="#3b82f6"
              transparent
              opacity={lineOpacity}
            />
          </line>
        );
      })}
    </group>
  );
};

// Trust badge 3D component
const TrustBadge3D: React.FC<{
  position: [number, number, number];
  icon: string;
  label: string;
  frame: number;
  fps: number;
  delay: number;
}> = ({ position, icon, label, frame, fps, delay }) => {
  const scale = spring({
    frame: frame - delay,
    fps,
    from: 0,
    to: 1,
    config: { damping: 15, stiffness: 120 },
  });

  return (
    <Float speed={1.5} rotationIntensity={0.05} floatIntensity={0.1}>
      <group position={position} scale={scale}>
        <RoundedBox args={[0.8, 0.4, 0.05]} radius={0.05} smoothness={4}>
          <meshStandardMaterial
            color="#1e293b"
            metalness={0.1}
            roughness={0.8}
            transparent
            opacity={0.9}
          />
        </RoundedBox>
        {/* Icon area */}
        <mesh position={[-0.25, 0, 0.03]}>
          <circleGeometry args={[0.1, 16]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={0.3} />
        </mesh>
      </group>
    </Float>
  );
};

export const SocialProof3DScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Stats with counters
  const stats = [
    { value: 150, suffix: '+', label: 'Practices', color: '#3b82f6', delay: 20 },
    { value: 50000, suffix: '+', label: 'Appointments/mo', color: '#8b5cf6', delay: 40 },
    { value: 99.9, suffix: '%', label: 'Uptime', color: '#22c55e', delay: 60 },
  ];

  // Trust badges
  const badges = [
    { icon: '🔒', label: 'GDPR', delay: 80 },
    { icon: '🛡️', label: 'ISO 27001', delay: 95 },
    { icon: '✓', label: '99.9% SLA', delay: 110 },
  ];

  // Camera movement
  const cameraZ = interpolate(frame, [0, 60], [7, 5.5], {
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });

  const cameraRotation = interpolate(frame, [0, 180], [0, 0.1], {
    extrapolateRight: 'clamp',
  });

  // Fade out
  const fadeOut = interpolate(frame, [165, 180], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${colors.bgDark} 0%, #0a1628 50%, ${colors.bgNavy} 100%)`,
        opacity: fadeOut,
      }}
    >
      {/* 3D Canvas */}
      <ThreeCanvas
        width={1920}
        height={1080}
      >
        <Suspense fallback={null}>
          <PerspectiveCamera
            makeDefault
            position={[cameraRotation, 2, cameraZ]}
            fov={50}
          />

          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 5, 5]} intensity={0.6} />
          <pointLight position={[0, 2, 3]} intensity={0.5} color="#3b82f6" />

          {/* Belgium Map */}
          <BelgiumMap3D frame={frame} fps={fps} />

          {/* Trust Badges floating around */}
          {badges.map((badge, i) => (
            <TrustBadge3D
              key={i}
              position={[
                -2.5 + i * 1.2,
                -1.8,
                0.5,
              ]}
              icon={badge.icon}
              label={badge.label}
              frame={frame}
              fps={fps}
              delay={badge.delay}
            />
          ))}

          {/* Background Particles */}
          <FloatingParticles
            count={35}
            bounds={{ x: 8, y: 5, z: 6 }}
            size={0.4}
          />

          {/* Accent orbs */}
          <GlowOrb position={[-4, 2, -3]} color="#3b82f6" size={0.25} pulseSpeed={0.8} />
          <GlowOrb position={[4, 1, -2]} color="#8b5cf6" size={0.2} pulseSpeed={1.2} />
        </Suspense>
      </ThreeCanvas>

      {/* 2D Overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          pointerEvents: 'none',
        }}
      >
        {/* Title */}
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
              opacity: spring({ frame, fps, from: 0, to: 1, config: { damping: 20 } }),
              fontSize: '18px',
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.6)',
              fontFamily: '"Inter", "DM Sans", system-ui, sans-serif',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
            Trusted Across Belgium
          </div>
          <div
            style={{
              opacity: spring({ frame: frame - 10, fps, from: 0, to: 1, config: { damping: 20 } }),
              fontSize: '48px',
              fontWeight: 800,
              color: 'white',
              fontFamily: '"Inter", "DM Sans", system-ui, sans-serif',
            }}
          >
            Growing Every Day
          </div>
        </div>

        {/* Stats row */}
        <div
          style={{
            position: 'absolute',
            bottom: '25%',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '80px',
          }}
        >
          {stats.map((stat, i) => {
            const statOpacity = spring({
              frame: frame - stat.delay,
              fps,
              from: 0,
              to: 1,
              config: { damping: 15 },
            });

            const statY = spring({
              frame: frame - stat.delay,
              fps,
              from: 30,
              to: 0,
              config: { damping: 15 },
            });

            const animatedValue = animateCounter(
              frame,
              stat.delay,
              60,
              0,
              stat.value
            );

            return (
              <div
                key={i}
                style={{
                  textAlign: 'center',
                  opacity: statOpacity,
                  transform: `translateY(${statY}px)`,
                }}
              >
                <div
                  style={{
                    fontSize: '56px',
                    fontWeight: 800,
                    color: stat.color,
                    fontFamily: '"Inter", "DM Sans", system-ui, sans-serif',
                    lineHeight: 1,
                  }}
                >
                  {stat.value === 99.9
                    ? (animatedValue / 10).toFixed(1)
                    : animatedValue.toLocaleString()}
                  {stat.suffix}
                </div>
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: 500,
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontFamily: '"Inter", "DM Sans", system-ui, sans-serif',
                    marginTop: '8px',
                  }}
                >
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Trust badges text labels */}
        <div
          style={{
            position: 'absolute',
            bottom: '8%',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '40px',
          }}
        >
          {badges.map((badge, i) => {
            const badgeOpacity = spring({
              frame: frame - badge.delay,
              fps,
              from: 0,
              to: 1,
              config: { damping: 15 },
            });

            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  background: 'rgba(30, 41, 59, 0.8)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '8px',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  opacity: badgeOpacity,
                }}
              >
                <span style={{ fontSize: '20px' }}>{badge.icon}</span>
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#22c55e',
                    fontFamily: '"Inter", "DM Sans", system-ui, sans-serif',
                  }}
                >
                  {badge.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Testimonial quote */}
        <div
          style={{
            position: 'absolute',
            right: '5%',
            top: '35%',
            width: '320px',
            padding: '24px',
            background: 'rgba(30, 41, 59, 0.9)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            opacity: spring({
              frame: frame - 60,
              fps,
              from: 0,
              to: 1,
              config: { damping: 20 },
            }),
            transform: `translateX(${spring({
              frame: frame - 60,
              fps,
              from: 30,
              to: 0,
              config: { damping: 20 },
            })}px)`,
          }}
        >
          <div
            style={{
              fontSize: '32px',
              color: '#8b5cf6',
              fontFamily: 'Georgia, serif',
              marginBottom: '12px',
            }}
          >
            "
          </div>
          <div
            style={{
              fontSize: '15px',
              color: 'rgba(255, 255, 255, 0.9)',
              fontFamily: '"Inter", "DM Sans", system-ui, sans-serif',
              lineHeight: 1.6,
              marginBottom: '16px',
            }}
          >
            Caberu transformed how we manage our practice. Our patients love the convenience.
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
              }}
            />
            <div>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'white',
                  fontFamily: '"Inter", "DM Sans", system-ui, sans-serif',
                }}
              >
                Dr. Sophie Van Damme
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontFamily: '"Inter", "DM Sans", system-ui, sans-serif',
                }}
              >
                Dental Practice, Brussels
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
