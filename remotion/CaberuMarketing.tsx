import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
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
 * Caberu Marketing Video - 60 seconds (1800 frames @ 30fps)
 *
 * Enhanced SaaS product demo with:
 * - Problem → Solution narrative
 * - Real UI matching the actual application
 * - Smooth cursor animations
 * - Zoom-in transitions
 * - Fast-paced editing
 * - Spring physics / ease-out-cubic
 * - Social proof and trust indicators
 *
 * New Sequence (60 seconds):
 * 1. Problem Hook (0-60): Chaos montage - missed calls, no-shows, paper mess
 * 2. Hero (60-150): Logo + branding intro "There's a better way"
 * 3. Patient Portal (150-270): Patient self-service booking flow
 * 4. AI Voice Call (270-390): AI answers and confirms appointments
 * 5. Dashboard Overview (390-510): Full dentist dashboard with metrics
 * 6. Analytics (510-630): Charts showing revenue and insights
 * 7. Treatment Plan (630-750): Creating and sending treatment plans
 * 8. WhatsApp/Messaging (750-870): Real-time patient communication
 * 9. Mobile View (870-990): PWA mobile experience
 * 10. Feature Montage (990-1170): Expanded 10 features grid
 * 11. Social Proof (1170-1380): Stats, testimonials, trust badges
 * 12. CTA (1380-1800): Strong call-to-action
 */
export const CaberuMarketing: React.FC<CaberuMarketingProps> = ({ title }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#0F172A' }}>
      {/* Scene 1: Problem Hook - 0-60 frames (2 seconds) */}
      <Sequence from={0} durationInFrames={60}>
        <ProblemHookScene />
      </Sequence>

      {/* Scene 2: Modern Hero - 60-150 frames (3 seconds) */}
      <Sequence from={60} durationInFrames={90}>
        <ModernHeroScene />
      </Sequence>

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
    </AbsoluteFill>
  );
};
