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
 * Caberu Marketing Video - 60 seconds (1800 frames @ 30fps)
 *
 * ENHANCED SaaS Product Demo featuring:
 * ✓ Problem → Solution narrative with kinetic text
 * ✓ Real UI matching the actual application
 * ✓ Smooth cursor animations with click effects
 * ✓ Dynamic zoom-in transitions on features
 * ✓ Fast-paced editing with speed lines
 * ✓ Spring physics for natural motion
 * ✓ Feature highlights and callouts
 * ✓ Social proof with animated counters
 * ✓ Modern SaaS aesthetic throughout
 *
 * Optimized Sequence (60 seconds @ 30fps):
 * 1.  Problem Hook (0-60): Chaos montage with speed effects
 * 2.  Hero (60-150): Logo + "There's a better way" intro
 * 3.  Patient Portal (150-270): Self-service booking with cursor
 * 4.  AI Voice Call (270-390): AI answering calls - waveform animation
 * 5.  Dashboard (390-510): Full dashboard with feature highlights
 * 6.  Analytics (510-630): Revenue charts and KPIs
 * 7.  Treatment Plan (630-750): Creating plans with cursor clicks
 * 8.  Messaging (750-870): WhatsApp/chat communication
 * 9.  Mobile View (870-990): PWA mobile experience
 * 10. Feature Grid (990-1170): 10-feature montage with stagger
 * 11. Social Proof (1170-1380): Stats, testimonials, trust badges
 * 12. CTA (1380-1800): Strong call-to-action with contact info
 */
export const CaberuMarketing: React.FC<CaberuMarketingProps> = ({ title }) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: '#0F172A' }}>
      {/* Scene 1: Problem Hook - 0-60 frames (2 seconds) */}
      <Sequence from={0} durationInFrames={60}>
        <ProblemHookScene />
      </Sequence>

      {/* Transition: Fade */}
      <SceneTransition type="fade" startFrame={55} duration={10} />

      {/* Scene 2: Modern Hero - 60-150 frames (3 seconds) */}
      <Sequence from={60} durationInFrames={90}>
        <ModernHeroScene />
      </Sequence>

      {/* Transition: Zoom */}
      <SceneTransition type="zoom" startFrame={145} duration={10} />

      {/* Scene 3: Patient Portal Booking - 150-270 frames (4 seconds) */}
      <Sequence from={150} durationInFrames={120}>
        <PatientPortalScene />
      </Sequence>

      {/* Scene 4: AI Voice Call Interface - 270-390 frames (4 seconds) */}
      <Sequence from={270} durationInFrames={120}>
        <AIVoiceCallScene />
      </Sequence>

      {/* Scene 5: Dashboard Overview - 390-510 frames (4 seconds) */}
      <Sequence from={390} durationInFrames={120}>
        <DashboardIntroScene
          showCursor={true}
          showIncomingCall={true}
          zoomToCall={false}
        />
      </Sequence>

      {/* Scene 6: Analytics Dashboard - 510-630 frames (4 seconds) */}
      <Sequence from={510} durationInFrames={120}>
        <AnalyticsDashboardScene />
      </Sequence>

      {/* Scene 7: Treatment Plan Creation - 630-750 frames (4 seconds) */}
      <Sequence from={630} durationInFrames={120}>
        <TreatmentPlanScene />
      </Sequence>

      {/* Scene 8: WhatsApp/Messaging - 750-870 frames (4 seconds) */}
      <Sequence from={750} durationInFrames={120}>
        <WhatsAppChatScene />
      </Sequence>

      {/* Scene 9: Mobile PWA View - 870-990 frames (4 seconds) */}
      <Sequence from={870} durationInFrames={120}>
        <MobileViewScene />
      </Sequence>

      {/* Scene 10: Feature Montage - 990-1170 frames (6 seconds) */}
      <Sequence from={990} durationInFrames={180}>
        <QuickFeatureMontage />
      </Sequence>

      {/* Scene 11: Social Proof - 1170-1380 frames (7 seconds) */}
      <Sequence from={1170} durationInFrames={210}>
        <SocialProofScene />
      </Sequence>

      {/* Scene 12: CTA Scene - 1380-1800 frames (14 seconds) */}
      <Sequence from={1380} durationInFrames={420}>
        <ModernCTAScene />
      </Sequence>

      {/* Global progress indicator (optional - shows video progress) */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: '3px',
          width: `${(frame / 1800) * 100}%`,
          background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
          opacity: 0.6,
          zIndex: 999,
        }}
      />
    </AbsoluteFill>
  );
};
