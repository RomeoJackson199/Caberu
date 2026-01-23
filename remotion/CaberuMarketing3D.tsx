import React from 'react';
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { ProblemHookScene } from './scenes/ProblemHookScene';
import { LogoReveal3DScene } from './scenes/LogoReveal3DScene';
import { Hero3DScene } from './scenes/Hero3DScene';
import { AIVoice3DScene } from './scenes/AIVoice3DScene';
import { FeatureShowcase3DScene } from './scenes/FeatureShowcase3DScene';
import { SocialProof3DScene } from './scenes/SocialProof3DScene';
import { CTA3DScene } from './scenes/CTA3DScene';

interface CaberuMarketing3DProps {
  title?: string;
}

/**
 * Caberu Marketing Video 3D - Premium 60-second SaaS Marketing Video
 *
 * Tech Stack: Remotion + React Three Fiber + @react-three/drei
 * Style: Linear, Vercel, Stripe, Arc Browser inspired
 *
 * Visual Features:
 * ✓ Dark mode aesthetic (deep navy/black backgrounds)
 * ✓ Glassmorphism UI elements
 * ✓ 3D floating devices (MacBook, iPhone)
 * ✓ Ambient particles and glow orbs
 * ✓ Camera orbits and smooth transitions
 * ✓ Spring physics animations
 *
 * Scene Timeline @ 30fps (1800 frames = 60 seconds):
 *
 * 1. Problem Hook (0-90 frames, 3s)
 *    - Chaos montage: ringing phones, missed calls
 *    - Glitch effects, red warning pulses
 *    - "Sound familiar?" text
 *
 * 2. Logo Reveal (90-150 frames, 2s)
 *    - Particles converge to form Caberu logo
 *    - 3D logo materializes with glow
 *    - "There's a better way" tagline
 *
 * 3. Hero Product Shot (150-360 frames, 7s)
 *    - 3D MacBook floating with dashboard on screen
 *    - Camera slowly orbits around device
 *    - Feature labels appear pointing to UI
 *    - iPhone companion device
 *
 * 4. AI Voice Demo (360-540 frames, 6s)
 *    - 3D audio waveform visualization
 *    - Phone with incoming call animation
 *    - Real-time transcription appearing
 *    - Stats: 98% answer rate, 24/7, <2s response
 *
 * 5. Feature Showcase (540-900 frames, 12s)
 *    - Camera flies through gallery of feature cards
 *    - 6 features, 2s each
 *    - Smart Scheduling, WhatsApp, Analytics, Portal, GDPR, Performance
 *
 * 6. Social Proof (900-1080 frames, 6s)
 *    - 3D Belgium map with practice locations
 *    - Animated counters: 150+ practices, 50k+ appointments
 *    - Trust badges: GDPR, ISO 27001, 99.9% SLA
 *    - Testimonial quote card
 *
 * 7. CTA Finale (1080-1800 frames, 24s)
 *    - All elements converge to center
 *    - Logo with orbiting rings and glow
 *    - "Transform Your Practice"
 *    - CTA button with animation
 *    - Contact info: caberu.be
 */
export const CaberuMarketing3D: React.FC<CaberuMarketing3DProps> = ({
  title = 'Caberu - Transform Your Practice',
}) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0f' }}>
      {/* Scene 1: Problem Hook - 0-90 frames (3 seconds) */}
      <Sequence from={0} durationInFrames={90}>
        <ProblemHookScene />
      </Sequence>

      {/* Scene 2: Logo Reveal - 90-150 frames (2 seconds) */}
      <Sequence from={90} durationInFrames={60}>
        <LogoReveal3DScene />
      </Sequence>

      {/* Scene 3: Hero Product Shot - 150-360 frames (7 seconds) */}
      <Sequence from={150} durationInFrames={210}>
        <Hero3DScene />
      </Sequence>

      {/* Scene 4: AI Voice Demo - 360-540 frames (6 seconds) */}
      <Sequence from={360} durationInFrames={180}>
        <AIVoice3DScene />
      </Sequence>

      {/* Scene 5: Feature Showcase - 540-900 frames (12 seconds) */}
      <Sequence from={540} durationInFrames={360}>
        <FeatureShowcase3DScene />
      </Sequence>

      {/* Scene 6: Social Proof - 900-1080 frames (6 seconds) */}
      <Sequence from={900} durationInFrames={180}>
        <SocialProof3DScene />
      </Sequence>

      {/* Scene 7: CTA Finale - 1080-1800 frames (24 seconds - extended hold) */}
      <Sequence from={1080} durationInFrames={720}>
        <CTA3DScene />
      </Sequence>

      {/* Progress indicator (optional, subtle) */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: '2px',
          width: `${(frame / 1800) * 100}%`,
          background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4)',
          opacity: 0.3,
          zIndex: 999,
        }}
      />
    </AbsoluteFill>
  );
};
