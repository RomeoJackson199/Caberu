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
import { PerspectiveCamera, Float, RoundedBox, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { FloatingParticles, GlowOrb } from '../components/FloatingParticles';
import { colors } from '../utils/animations';

/**
 * AI Voice 3D Scene - 3D audio waveform visualization
 * Duration: 6 seconds (180 frames @ 30fps)
 * Shows AI assistant answering calls with dynamic wave visualization
 */

// 3D Audio Bar component
const AudioBar3D: React.FC<{
  position: [number, number, number];
  frame: number;
  index: number;
  baseHeight: number;
}> = ({ position, frame, index, baseHeight }) => {
  // Create pseudo-random audio-like animation
  const seed = index * 1.3 + 0.5;
  const frequency1 = 0.15 + (index % 5) * 0.02;
  const frequency2 = 0.08 + (index % 3) * 0.03;
  const phase = index * 0.5;

  const audioLevel =
    0.3 +
    Math.abs(Math.sin(frame * frequency1 + phase)) * 0.4 +
    Math.abs(Math.sin(frame * frequency2 + phase * 2)) * 0.3;

  const height = baseHeight * audioLevel;

  // Color based on height
  const colorIntensity = interpolate(audioLevel, [0.3, 1], [0.3, 1]);

  return (
    <group position={position}>
      <RoundedBox
        args={[0.08, height, 0.08]}
        radius={0.02}
        smoothness={4}
        position={[0, height / 2, 0]}
      >
        <meshStandardMaterial
          color="#3b82f6"
          emissive="#3b82f6"
          emissiveIntensity={colorIntensity * 0.5}
          metalness={0.3}
          roughness={0.5}
        />
      </RoundedBox>

      {/* Glow effect */}
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[0.12, height + 0.1, 0.12]} />
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={colorIntensity * 0.1}
        />
      </mesh>
    </group>
  );
};

// Circular Audio Visualizer
const CircularVisualizer: React.FC<{
  frame: number;
  fps: number;
  radius: number;
  barCount: number;
}> = ({ frame, fps, radius, barCount }) => {
  const bars = useMemo(() => {
    return Array.from({ length: barCount }, (_, i) => {
      const angle = (i / barCount) * Math.PI * 2;
      return {
        id: i,
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        angle,
      };
    });
  }, [barCount, radius]);

  // Rotation animation
  const rotation = frame * 0.005;

  return (
    <group rotation={[0, rotation, 0]}>
      {bars.map((bar) => (
        <AudioBar3D
          key={bar.id}
          position={[bar.x, 0, bar.z]}
          frame={frame}
          index={bar.id}
          baseHeight={1.5}
        />
      ))}

      {/* Inner ring glow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[radius - 0.3, radius + 0.3, 64]} />
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.1 + Math.sin(frame * 0.1) * 0.05}
        />
      </mesh>
    </group>
  );
};

// Phone mockup with incoming call
const PhoneMockup3D: React.FC<{
  frame: number;
  fps: number;
  position: [number, number, number];
}> = ({ frame, fps, position }) => {
  const ringPulse = 1 + Math.sin(frame * 0.5) * 0.03;

  return (
    <group position={position}>
      {/* Phone body */}
      <RoundedBox
        args={[0.7, 1.4, 0.05]}
        radius={0.06}
        smoothness={4}
        scale={ringPulse}
      >
        <meshStandardMaterial
          color="#1a1a1a"
          metalness={0.8}
          roughness={0.2}
        />
      </RoundedBox>

      {/* Screen */}
      <mesh position={[0, 0, 0.03]}>
        <planeGeometry args={[0.62, 1.3]} />
        <meshBasicMaterial color="#0f172a" />
      </mesh>

      {/* Incoming call UI */}
      <group position={[0, 0, 0.035]}>
        {/* Caller name */}
        <mesh position={[0, 0.3, 0]}>
          <planeGeometry args={[0.5, 0.1]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={0.3} />
        </mesh>

        {/* Call icon */}
        <Sphere args={[0.08, 16, 16]} position={[0, -0.1, 0]}>
          <meshBasicMaterial
            color="#22c55e"
            transparent
            opacity={0.8 + Math.sin(frame * 0.3) * 0.2}
          />
        </Sphere>

        {/* Ring animation */}
        {[1, 2, 3].map((i) => {
          const scale = 1 + i * 0.3 + ((frame * 0.05 + i * 0.5) % 1.5);
          const opacity = interpolate(
            (frame * 0.05 + i * 0.5) % 1.5,
            [0, 1.5],
            [0.5, 0]
          );

          return (
            <mesh key={i} position={[0, -0.1, 0]} scale={scale}>
              <ringGeometry args={[0.07, 0.09, 32]} />
              <meshBasicMaterial
                color="#22c55e"
                transparent
                opacity={opacity}
              />
            </mesh>
          );
        })}
      </group>
    </group>
  );
};

export const AIVoice3DScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const time = frame / fps;

  // Entry animation
  const entryScale = spring({
    frame,
    fps,
    from: 0.8,
    to: 1,
    config: { damping: 20, stiffness: 100 },
  });

  // Camera movement
  const cameraY = interpolate(frame, [0, 60, 180], [3, 2, 2.5], {
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });

  const cameraZ = interpolate(frame, [0, 60], [6, 4.5], {
    extrapolateRight: 'clamp',
  });

  // Stats animation
  const stats = [
    { value: '98%', label: 'Call Answer Rate', delay: 40 },
    { value: '24/7', label: 'Availability', delay: 60 },
    { value: '<2s', label: 'Response Time', delay: 80 },
  ];

  // Transcription text appearing
  const transcriptionProgress = interpolate(frame, [60, 150], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const transcriptionText = "Hello, this is Dr. Smith's office. How may I help you today?";
  const visibleChars = Math.floor(transcriptionProgress * transcriptionText.length);

  // Fade out
  const fadeOut = interpolate(frame, [165, 180], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${colors.bgDark} 0%, ${colors.bgNavy} 100%)`,
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
            position={[0, cameraY, cameraZ]}
            fov={50}
          />

          {/* Lighting */}
          <ambientLight intensity={0.3} />
          <directionalLight position={[5, 5, 5]} intensity={0.6} />
          <pointLight position={[0, 2, 0]} intensity={0.8} color="#3b82f6" />
          <pointLight position={[-2, 0, 2]} intensity={0.4} color="#22c55e" />

          {/* Circular Audio Visualizer */}
          <group position={[0, -0.5, 0]} scale={entryScale}>
            <CircularVisualizer
              frame={frame}
              fps={fps}
              radius={1.2}
              barCount={32}
            />
          </group>

          {/* Center AI Orb */}
          <Float speed={2} rotationIntensity={0.2} floatIntensity={0.3}>
            <group position={[0, 0.5, 0]}>
              <Sphere args={[0.3, 32, 32]}>
                <meshStandardMaterial
                  color="#3b82f6"
                  emissive="#3b82f6"
                  emissiveIntensity={0.5 + Math.sin(frame * 0.1) * 0.3}
                  metalness={0.5}
                  roughness={0.3}
                />
              </Sphere>

              {/* Pulsing rings */}
              {[1, 2, 3].map((i) => {
                const scale = 1 + ((frame * 0.02 + i * 0.3) % 2);
                const opacity = interpolate(
                  (frame * 0.02 + i * 0.3) % 2,
                  [0, 2],
                  [0.4, 0]
                );

                return (
                  <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} scale={scale}>
                    <ringGeometry args={[0.28, 0.32, 32]} />
                    <meshBasicMaterial
                      color="#3b82f6"
                      transparent
                      opacity={opacity}
                    />
                  </mesh>
                );
              })}
            </group>
          </Float>

          {/* Phone with incoming call */}
          <PhoneMockup3D
            frame={frame}
            fps={fps}
            position={[-2.5, 0.5, 0]}
          />

          {/* Background Particles */}
          <FloatingParticles
            count={40}
            bounds={{ x: 8, y: 5, z: 6 }}
            size={0.6}
          />

          {/* Accent Glow Orbs */}
          <GlowOrb position={[3, 1, -2]} color="#22c55e" size={0.2} pulseSpeed={1.5} />
          <GlowOrb position={[-3, -1, -2]} color="#3b82f6" size={0.15} pulseSpeed={1.2} />
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
            top: '8%',
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
              color: '#22c55e',
              fontFamily: '"Inter", "DM Sans", system-ui, sans-serif',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
            AI Voice Assistant
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
            Never Miss a Call
          </div>
        </div>

        {/* Transcription box */}
        <div
          style={{
            position: 'absolute',
            bottom: '25%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '600px',
            padding: '20px 30px',
            background: 'rgba(30, 41, 59, 0.9)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            opacity: interpolate(frame, [50, 70], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#22c55e',
                boxShadow: '0 0 10px #22c55e',
                animation: 'pulse 1s infinite',
              }}
            />
            <span
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#22c55e',
                fontFamily: '"Inter", "DM Sans", system-ui, sans-serif',
              }}
            >
              AI Responding
            </span>
          </div>
          <div
            style={{
              fontSize: '20px',
              color: 'white',
              fontFamily: '"Inter", "DM Sans", system-ui, sans-serif',
              lineHeight: 1.6,
            }}
          >
            {transcriptionText.slice(0, visibleChars)}
            <span
              style={{
                opacity: Math.sin(frame * 0.3) > 0 ? 1 : 0,
                color: '#3b82f6',
              }}
            >
              |
            </span>
          </div>
        </div>

        {/* Stats */}
        <div
          style={{
            position: 'absolute',
            bottom: '8%',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '60px',
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
              from: 20,
              to: 0,
              config: { damping: 15 },
            });

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
                    fontSize: '36px',
                    fontWeight: 800,
                    color: ['#3b82f6', '#22c55e', '#8b5cf6'][i],
                    fontFamily: '"Inter", "DM Sans", system-ui, sans-serif',
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontFamily: '"Inter", "DM Sans", system-ui, sans-serif',
                  }}
                >
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
