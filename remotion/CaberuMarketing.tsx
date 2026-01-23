import React from 'react';
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { ModernHeroScene } from './scenes/ModernHeroScene';
import { ProblemHookScene } from './scenes/ProblemHookScene';
import { DashboardIntroScene } from './scenes/DashboardIntroScene';
import { PatientPortalScene } from './scenes/PatientPortalScene';
import { AIVoiceCallScene } from './scenes/AIVoiceCallScene';
import { AnalyticsDashboardScene } from './scenes/AnalyticsDashboardScene';
import { TreatmentPlanScene } from './scenes/TreatmentPlanScene';
import { WhatsAppChatScene } from './scenes/WhatsAppChatScene';
import { MobileViewScene } from './scenes/MobileViewScene';
import { QuickFeatureMontage } from './scenes/QuickFeatureMontage';
import { SocialProofScene } from './scenes/SocialProofScene';
import { ModernCTAScene } from './scenes/ModernCTAScene';

interface CaberuMarketingProps {
  title: string;
}

/**
 * Scene Transition - Creates smooth transitions between scenes
 */
const SceneTransition: React.FC<{
  type: 'fade' | 'wipe' | 'zoom';
  startFrame: number;
  duration: number;
}> = ({ type, startFrame, duration }) => {
  const frame = useCurrentFrame();
  const localFrame = frame - startFrame;

  if (localFrame < 0 || localFrame > duration) return null;

  const progress = localFrame / duration;

  switch (type) {
    case 'fade':
      return (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: '#0f172a',
            opacity: Math.sin(progress * Math.PI),
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        />
      );
    case 'wipe':
      return (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
            clipPath: `inset(0 ${100 - progress * 100}% 0 0)`,
            opacity: 0.9,
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        />
      );
    case 'zoom':
      const scale = 1 + progress * 2;
      const opacity = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
      return (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.8) 0%, #0f172a 100%)',
            opacity,
            transform: `scale(${scale})`,
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        />
      );
    default:
      return null;
  }
};

/**
 * Caberu Marketing Video - 45 seconds (1350 frames @ 30fps)
 *
 * MODERN SaaS PRODUCT SHOWCASE
 * Inspired by: Linear, Vercel, Stripe
 *
 * ✓ Fast-paced editing (2-3s per scene)
 * ✓ Product-first approach
 * ✓ Dark mode aesthetic
 * ✓ Instant cuts, no slow fades
 * ✓ Morphing transitions
 *
 * Optimized Sequence (45 seconds @ 30fps):
 * 1.  Problem Hook (0-90): Fast chaos montage - 3s
 * 2.  Hero (90-150): Logo zoom into app - 2s
 * 3.  Patient Portal (150-210): Booking flow - 2s
 * 4.  AI Voice Call (210-270): AI answering - 2s
 * 5.  Dashboard (270-330): Overview - 2s
 * 6.  Smart Search (330-390): Cmd+K search - 2s
 * 7.  Payment Flow (390-450): Send payment link - 2s
 * 8.  Analytics (450-510): Revenue charts - 2s
 * 9.  Treatment Plan (510-570): Quick creation - 2s
 * 10. Messaging (570-630): WhatsApp integration - 2s
 * 11. Mobile View (630-690): PWA responsive - 2s
 * 12. Feature Grid (690-870): 10 features fast - 6s
 * 13. Social Proof (870-1050): Stats animation - 6s
 * 14. CTA (1050-1350): Clean, minimal - 10s
 */
export const CaberuMarketing: React.FC<CaberuMarketingProps> = ({ title }) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0a' }}>
      {/* Scene 1: Problem Hook - 0-90 frames (3 seconds) */}
      <Sequence from={0} durationInFrames={90}>
        <ProblemHookScene />
      </Sequence>

      {/* Scene 2: Modern Hero - 90-150 frames (2 seconds) */}
      <Sequence from={90} durationInFrames={60}>
        <ModernHeroScene />
      </Sequence>

      {/* Scene 3: Patient Portal Booking - 150-210 frames (2 seconds) */}
      <Sequence from={150} durationInFrames={60}>
        <PatientPortalScene />
      </Sequence>

      {/* Scene 4: AI Voice Call - 210-270 frames (2 seconds) */}
      <Sequence from={210} durationInFrames={60}>
        <AIVoiceCallScene />
      </Sequence>

      {/* Scene 5: Dashboard Overview - 270-330 frames (2 seconds) */}
      <Sequence from={270} durationInFrames={60}>
        <DashboardIntroScene
          showCursor={true}
          showIncomingCall={false}
          zoomToCall={false}
        />
      </Sequence>

      {/* Scene 6: Analytics Dashboard - 450-510 frames (2 seconds) */}
      <Sequence from={450} durationInFrames={60}>
        <AnalyticsDashboardScene />
      </Sequence>

      {/* Scene 7: Treatment Plan - 510-570 frames (2 seconds) */}
      <Sequence from={510} durationInFrames={60}>
        <TreatmentPlanScene />
      </Sequence>

      {/* Scene 8: WhatsApp/Messaging - 570-630 frames (2 seconds) */}
      <Sequence from={570} durationInFrames={60}>
        <WhatsAppChatScene />
      </Sequence>

      {/* Scene 9: Mobile PWA - 630-690 frames (2 seconds) */}
      <Sequence from={630} durationInFrames={60}>
        <MobileViewScene />
      </Sequence>

      {/* Scene 10: Ultra-Fast Feature Montage - 690-870 frames (6 seconds) */}
      <Sequence from={690} durationInFrames={180}>
        <QuickFeatureMontage />
      </Sequence>

      {/* Scene 11: Social Proof - 870-1050 frames (6 seconds) */}
      <Sequence from={870} durationInFrames={180}>
        <SocialProofScene />
      </Sequence>

      {/* Scene 12: CTA Scene - 1050-1350 frames (10 seconds) */}
      <Sequence from={1050} durationInFrames={300}>
        <ModernCTAScene />
      </Sequence>

      {/* Progress indicator (optional) */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: '2px',
          width: `${(frame / 1350) * 100}%`,
          background: 'linear-gradient(90deg, #667eea, #764ba2)',
          opacity: 0.4,
          zIndex: 999,
        }}
      />
    </AbsoluteFill>
  );
};
    </AbsoluteFill >
  );
};
