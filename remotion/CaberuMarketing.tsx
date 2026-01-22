import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { ModernHeroScene } from './scenes/ModernHeroScene';
import { DashboardIntroScene } from './scenes/DashboardIntroScene';
import { AIVoiceCallScene } from './scenes/AIVoiceCallScene';
import { CalendarBookingScene } from './scenes/CalendarBookingScene';
import { WhatsAppChatScene } from './scenes/WhatsAppChatScene';
import { QuickFeatureMontage } from './scenes/QuickFeatureMontage';
import { AllHandledScene } from './scenes/AllHandledScene';
import { ModernCTAScene } from './scenes/ModernCTAScene';

interface CaberuMarketingProps {
  title: string;
}

/**
 * Caberu Marketing Video - 50 seconds (1500 frames @ 30fps)
 *
 * Modern SaaS product demo style with:
 * - Smooth cursor animations
 * - Zoom-in transitions
 * - Fast-paced editing (1-3 seconds per shot)
 * - Spring physics / ease-out-cubic
 * - Real UI interactions
 * - Satisfying micro-interactions
 *
 * Sequence:
 * 1. Hero (0-90): Logo + branding intro
 * 2. Dashboard (90-210): Dashboard appears with incoming call notification
 * 3. AI Voice Call (210-330): AI voice waveform animates
 * 4. Calendar (330-450): Cursor clicks calendar, slot auto-booked
 * 5. WhatsApp (450-630): Messages typing in real-time
 * 6. Features (630-750): Quick cut feature montage
 * 7. All Handled (750-870): Pull back to dashboard + "All handled" text
 * 8. CTA (870-1500): Logo + CTA with smooth scale-up
 */
export const CaberuMarketing: React.FC<CaberuMarketingProps> = ({ title }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#0F172A' }}>
      {/* Scene 1: Modern Hero - 0-90 frames (3 seconds) */}
      <Sequence from={0} durationInFrames={90}>
        <ModernHeroScene />
      </Sequence>

      {/* Scene 2: Dashboard with Incoming Call - 90-210 frames (4 seconds) */}
      <Sequence from={90} durationInFrames={120}>
        <DashboardIntroScene
          showCursor={true}
          showIncomingCall={true}
          zoomToCall={true}
        />
      </Sequence>

      {/* Scene 3: AI Voice Call Interface - 210-330 frames (4 seconds) */}
      <Sequence from={210} durationInFrames={120}>
        <AIVoiceCallScene />
      </Sequence>

      {/* Scene 4: Calendar Auto-Booking - 330-450 frames (4 seconds) */}
      <Sequence from={330} durationInFrames={120}>
        <CalendarBookingScene />
      </Sequence>

      {/* Scene 5: WhatsApp Chat - 450-630 frames (6 seconds) */}
      <Sequence from={450} durationInFrames={180}>
        <WhatsAppChatScene />
      </Sequence>

      {/* Scene 6: Quick Feature Montage - 630-750 frames (4 seconds) */}
      <Sequence from={630} durationInFrames={120}>
        <QuickFeatureMontage />
      </Sequence>

      {/* Scene 7: All Handled Automatically - 750-870 frames (4 seconds) */}
      <Sequence from={750} durationInFrames={120}>
        <AllHandledScene />
      </Sequence>

      {/* Scene 8: CTA Scene - 870-1500 frames (21 seconds - lingering CTA) */}
      <Sequence from={870} durationInFrames={630}>
        <ModernCTAScene />
      </Sequence>
    </AbsoluteFill>
  );
};
