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
import { ResultsScene } from './scenes/ResultsScene';
import { IntegrationsScene } from './scenes/IntegrationsScene';

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
 * ✓ Seamless integrations showcase
 * ✓ Real transformation results
 *
 * Optimized Sequence (60 seconds @ 30fps):
 * 1.  Problem Hook (0-60): Chaos montage with speed effects
 * 2.  Hero (60-150): Logo + "There's a better way" intro
 * 3.  Patient Portal (150-240): Self-service booking with cursor
 * 4.  AI Voice Call (240-330): AI answering calls - waveform animation
 * 5.  Dashboard (330-420): Full dashboard with feature highlights
 * 6.  Analytics (420-510): Revenue charts and KPIs
 * 7.  Treatment Plan (510-600): Creating plans with cursor clicks
 * 8.  Messaging (600-690): WhatsApp/chat communication
 * 9.  Mobile View (690-780): PWA mobile experience
 * 10. Integrations (780-870): Seamless dental software integrations
 * 11. Feature Grid (870-1020): 10-feature montage with stagger
 * 12. Results (1020-1140): Real transformation metrics
 * 13. Social Proof (1140-1320): Stats, testimonials, trust badges
 * 14. CTA (1320-1800): Strong call-to-action with urgency
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

      {/* Scene 3: Patient Portal Booking - 150-240 frames (3 seconds) */}
      <Sequence from={150} durationInFrames={90}>
        <PatientPortalScene />
      </Sequence>

      {/* Transition: Wipe */}
      <SceneTransition type="wipe" startFrame={235} duration={10} />

      {/* Scene 4: AI Voice Call Interface - 240-330 frames (3 seconds) */}
      <Sequence from={240} durationInFrames={90}>
        <AIVoiceCallScene />
      </Sequence>

      {/* Transition: Fade */}
      <SceneTransition type="fade" startFrame={325} duration={10} />

      {/* Scene 5: Dashboard Overview - 330-420 frames (3 seconds) */}
      <Sequence from={330} durationInFrames={90}>
        <DashboardIntroScene
          showCursor={true}
          showIncomingCall={true}
          zoomToCall={false}
        />
      </Sequence>

      {/* Transition: Zoom */}
      <SceneTransition type="zoom" startFrame={415} duration={10} />

      {/* Scene 6: Analytics Dashboard - 420-510 frames (3 seconds) */}
      <Sequence from={420} durationInFrames={90}>
        <AnalyticsDashboardScene />
      </Sequence>

      {/* Transition: Wipe */}
      <SceneTransition type="wipe" startFrame={505} duration={10} />

      {/* Scene 7: Treatment Plan Creation - 510-600 frames (3 seconds) */}
      <Sequence from={510} durationInFrames={90}>
        <TreatmentPlanScene />
      </Sequence>

      {/* Transition: Fade */}
      <SceneTransition type="fade" startFrame={595} duration={10} />

      {/* Scene 8: WhatsApp/Messaging - 600-690 frames (3 seconds) */}
      <Sequence from={600} durationInFrames={90}>
        <WhatsAppChatScene />
      </Sequence>

      {/* Transition: Zoom */}
      <SceneTransition type="zoom" startFrame={685} duration={10} />

      {/* Scene 9: Mobile PWA View - 690-780 frames (3 seconds) */}
      <Sequence from={690} durationInFrames={90}>
        <MobileViewScene />
      </Sequence>

      {/* Transition: Wipe */}
      <SceneTransition type="wipe" startFrame={775} duration={10} />

      {/* Scene 10: Integrations - 780-870 frames (3 seconds) */}
      <Sequence from={780} durationInFrames={90}>
        <IntegrationsScene />
      </Sequence>

      {/* Transition: Zoom */}
      <SceneTransition type="zoom" startFrame={865} duration={10} />

      {/* Scene 11: Feature Montage - 870-1020 frames (5 seconds) */}
      <Sequence from={870} durationInFrames={150}>
        <QuickFeatureMontage />
      </Sequence>

      {/* Transition: Fade */}
      <SceneTransition type="fade" startFrame={1015} duration={10} />

      {/* Scene 12: Results - 1020-1140 frames (4 seconds) */}
      <Sequence from={1020} durationInFrames={120}>
        <ResultsScene />
      </Sequence>

      {/* Transition: Zoom */}
      <SceneTransition type="zoom" startFrame={1135} duration={10} />

      {/* Scene 13: Social Proof - 1140-1320 frames (6 seconds) */}
      <Sequence from={1140} durationInFrames={180}>
        <SocialProofScene />
      </Sequence>

      {/* Transition: Wipe */}
      <SceneTransition type="wipe" startFrame={1315} duration={10} />

      {/* Scene 14: CTA Scene - 1320-1800 frames (16 seconds) */}
      <Sequence from={1320} durationInFrames={480}>
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
