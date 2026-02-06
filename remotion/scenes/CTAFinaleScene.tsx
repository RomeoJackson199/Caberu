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
import { FloatingParticles, GlowOrb } from '../components/FloatingParticles';
import { colors } from '../utils/animations';

/**
 * CTAFinaleScene - Short, punchy call-to-action (8 seconds = 240 frames)
 * Clean, confident, no fluff. Logo + CTA + done.
 */

const OrbitingRing: React.FC<{
  index: number;
  frame: number;
  entryScale: number;
}> = ({ index, frame, entryScale }) => {
  const ringRotation = frame * 0.015 + index * (Math.PI * 2 / 3);
  const ringOpacity = entryScale * 0.25;

  return (
    <group rotation={[Math.PI / 4 + index * 0.35, ringRotation, 0]}>
      <Ring args={[1.6, 1.64, 64]}>
        <meshBasicMaterial
          color={['#3b82f6', '#8b5cf6', '#06b6d4'][index]}
          transparent
          opacity={ringOpacity}
        />
      </Ring>
    </group>
  );
};

export const CTAFinaleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Camera: subtle dolly in
  const cameraZ = interpolate(frame, [0, 60, 240], [6, 4.5, 4.2], {
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });

  // Logo entry
  const logoScale = spring({
    frame: frame - 10,
    fps,
    from: 0,
    to: 1,
    config: { damping: 15, stiffness: 100 },
  });

  const logoRotation = spring({
    frame: frame - 10,
    fps,
    from: Math.PI,
    to: 0,
    config: { damping: 20, stiffness: 80 },
  });

  const glowPulse = 0.5 + Math.sin(frame * 0.06) * 0.2;

  // Text animations
  const brandOpacity = spring({
    frame: frame - 30,
    fps,
    from: 0,
    to: 1,
    config: { damping: 18 },
  });

  const taglineOpacity = spring({
    frame: frame - 50,
    fps,
    from: 0,
    to: 1,
    config: { damping: 18 },
  });

  const buttonScale = spring({
    frame: frame - 70,
    fps,
    from: 0,
    to: 1,
    config: { damping: 12, stiffness: 140 },
  });

  const buttonGlow = 0.3 + Math.sin((frame - 70) * 0.08) * 0.15;

  const contactOpacity = spring({
    frame: frame - 100,
    fps,
    from: 0,
    to: 1,
    config: { damping: 20 },
  });

  // Final hold - no fade out so it lingers
  const finalFade = interpolate(frame, [220, 240], [1, 0.95], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 40%, ${colors.bgNavy} 0%, ${colors.bgDark} 100%)`,
        fontFamily: '"Inter", "SF Pro Display", system-ui, sans-serif',
        opacity: finalFade,
      }}
    >
      {/* 3D Canvas */}
      <ThreeCanvas width={1920} height={1080}>
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[0, 0.3, cameraZ]} fov={50} />

          <ambientLight intensity={0.25} />
          <directionalLight position={[5, 5, 5]} intensity={0.4} />
          <pointLight position={[0, 0, 2]} intensity={0.8} color="#3b82f6" />
          <pointLight position={[-2, 1, 1]} intensity={0.3} color="#8b5cf6" />

          {/* Center logo shape */}
          <Float speed={1.2} rotationIntensity={0.02} floatIntensity={0.04}>
            <group scale={logoScale} rotation={[0, logoRotation, 0]}>
              <RoundedBox args={[1.3, 1.3, 0.25]} radius={0.25} smoothness={4}>
                <meshStandardMaterial
                  color="#3b82f6"
                  metalness={0.4}
                  roughness={0.3}
                  emissive="#3b82f6"
                  emissiveIntensity={glowPulse * 0.35}
                />
              </RoundedBox>

              {/* Inner glow */}
              <Sphere args={[0.9, 32, 32]}>
                <meshBasicMaterial color="#3b82f6" transparent opacity={glowPulse * 0.1} />
              </Sphere>

              {/* Orbiting rings */}
              {[0, 1, 2].map((i) => (
                <OrbitingRing key={i} index={i} frame={frame} entryScale={logoScale} />
              ))}
            </group>
          </Float>

          {/* Ambient particles */}
          <FloatingParticles
            count={25}
            bounds={{ x: 8, y: 5, z: 6 }}
            size={0.3}
            speed={0.001}
          />

          <GlowOrb position={[-3, 1.5, -3]} color="#3b82f6" size={0.2} pulseSpeed={0.6} />
          <GlowOrb position={[3, -1, -2]} color="#8b5cf6" size={0.15} pulseSpeed={0.9} />
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
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: '60px',
          }}
        >
          {/* Brand name */}
          <div
            style={{
              opacity: brandOpacity,
              transform: `scale(${spring({ frame: frame - 30, fps, from: 0.9, to: 1, config: { damping: 15 } })})`,
              fontSize: '72px',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 50%, #c7d2fe 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-3px',
              marginBottom: '16px',
            }}
          >
            Caberu
          </div>

          {/* Tagline */}
          <div
            style={{
              opacity: taglineOpacity,
              fontSize: '28px',
              fontWeight: 500,
              color: 'rgba(255, 255, 255, 0.85)',
              marginBottom: '48px',
            }}
          >
            AI-Powered Practice Management
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
                padding: '18px 48px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: 700,
                color: 'white',
                boxShadow: `0 8px 30px rgba(59, 130, 246, ${buttonGlow}), 0 0 50px rgba(59, 130, 246, ${buttonGlow * 0.4})`,
                border: '1px solid rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              Start Your Free Trial
              <span style={{ fontSize: '16px', opacity: 0.8 }}>&#8594;</span>
            </div>
          </div>

          {/* Subtext */}
          <div
            style={{
              opacity: spring({ frame: frame - 90, fps, from: 0, to: 1, config: { damping: 20 } }),
              marginTop: '16px',
              fontSize: '15px',
              color: 'rgba(255, 255, 255, 0.45)',
            }}
          >
            14 days free &middot; No credit card required
          </div>
        </div>

        {/* Contact info */}
        <div
          style={{
            position: 'absolute',
            bottom: '50px',
            display: 'flex',
            alignItems: 'center',
            gap: '32px',
            opacity: contactOpacity,
          }}
        >
          <span
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            caberu.be
          </span>
          <div
            style={{
              width: '1px',
              height: '20px',
              background: 'rgba(255, 255, 255, 0.15)',
            }}
          />
          <span
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            hello@caberu.be
          </span>
        </div>
      </div>

      {/* Vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0, 0, 0, 0.4) 100%)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
