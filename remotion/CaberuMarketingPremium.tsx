import React from 'react';
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { ProblemHookScenePro } from './scenes/ProblemHookScenePro';
import { LogoReveal3DScene } from './scenes/LogoReveal3DScene';
import { DashboardDemo3DScene } from './scenes/DashboardDemo3DScene';
import { AIVoice3DScene } from './scenes/AIVoice3DScene';
import { FeatureShowcase3DScene } from './scenes/FeatureShowcase3DScene';
import { SocialProof3DScene } from './scenes/SocialProof3DScene';
import { CTAFinaleScene } from './scenes/CTAFinaleScene';

interface CaberuMarketingPremiumProps {
  title?: string;
}

/**
 * CaberuMarketingPremium - Improved 60-second marketing video
 *
 * Changes from the original CaberuMarketing3D:
 * - Professional problem hook (no emoji spam)
 * - New dashboard demo scene (shows the actual product)
 * - Rebalanced timing - CTA cut from 24s to 8s
 * - More breathing room for product showcase
 * - Smoother pacing with cross-fade transitions
 *
 * Timeline @ 30fps (1800 frames = 60 seconds):
 *
 * 1. Problem Hook      (0-120,    4s)  - Professional notification chaos
 * 2. Logo Reveal       (110-200,  3s)  - Particles converge to logo
 * 3. Dashboard Demo    (190-490, 10s)  - MacBook + feature callouts
 * 4. AI Voice Demo     (480-660,  6s)  - Voice assistant showcase
 * 5. Feature Showcase   (650-1010,12s)  - Camera flies through feature cards
 * 6. Social Proof      (1000-1220,7s+) - Belgium map + stats
 * 7. CTA Finale        (1210-1800,~20s) - Clean CTA with hold
 *
 * Cross-fades: 10-frame overlaps between scenes for smoothness
 */
export const CaberuMarketingPremium: React.FC<CaberuMarketingPremiumProps> = ({
  title = 'Caberu - Transform Your Practice',
}) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0f' }}>
      {/* Scene 1: Professional Problem Hook - 0-120 frames (4 seconds) */}
      <Sequence from={0} durationInFrames={120}>
        <ProblemHookScenePro />
      </Sequence>

      {/* Scene 2: Logo Reveal - 110-200 frames (3 seconds) */}
      <Sequence from={110} durationInFrames={90}>
        <LogoReveal3DScene />
      </Sequence>

      {/* Scene 3: Dashboard Demo - 190-490 frames (10 seconds) */}
      <Sequence from={190} durationInFrames={300}>
        <DashboardDemo3DScene />
      </Sequence>

      {/* Scene 4: AI Voice Demo - 480-660 frames (6 seconds) */}
      <Sequence from={480} durationInFrames={180}>
        <AIVoice3DScene />
      </Sequence>

      {/* Scene 5: Feature Showcase - 650-1010 frames (12 seconds) */}
      <Sequence from={650} durationInFrames={360}>
        <FeatureShowcase3DScene />
      </Sequence>

      {/* Scene 6: Social Proof - 1000-1220 frames (7.3 seconds) */}
      <Sequence from={1000} durationInFrames={220}>
        <SocialProof3DScene />
      </Sequence>

      {/* Scene 7: CTA Finale - 1210-1800 frames (~20 seconds with hold) */}
      <Sequence from={1210} durationInFrames={590}>
        <CTAFinaleScene />
      </Sequence>

      {/* Progress bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: '2px',
          width: `${(frame / 1800) * 100}%`,
          background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4)',
          opacity: 0.25,
          zIndex: 999,
        }}
      />
    </AbsoluteFill>
  );
};
