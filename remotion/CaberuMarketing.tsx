import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { HeroScene } from './scenes/HeroScene';
import { FeatureSceneWithMockup } from './scenes/FeatureSceneWithMockup';
import { StatsScene } from './scenes/StatsScene';
import { CTAScene } from './scenes/CTAScene';
import { SchedulingMockup } from './scenes/SchedulingMockup';
import { PatientRecordMockup } from './scenes/PatientRecordMockup';
import { AIChatMockup } from './scenes/AIChatMockup';
import { AnalyticsMockup } from './scenes/AnalyticsMockup';

interface CaberuMarketingProps {
  title: string;
}

export const CaberuMarketing: React.FC<CaberuMarketingProps> = ({ title }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#0F172A' }}>
      {/* Hero Scene - 0-150 frames (5 seconds) */}
      <Sequence from={0} durationInFrames={150}>
        <HeroScene title={title} />
      </Sequence>

      {/* Feature 1: Smart Scheduling - 150-270 frames (4 seconds) */}
      <Sequence from={150} durationInFrames={120}>
        <FeatureSceneWithMockup
          title="Smart Scheduling"
          description="AI-powered appointment calendar that reduces no-shows"
          mockup={SchedulingMockup}
        />
      </Sequence>

      {/* Feature 2: Patient Records - 270-390 frames (4 seconds) */}
      <Sequence from={270} durationInFrames={120}>
        <FeatureSceneWithMockup
          title="Digital Health Records"
          description="Complete patient history at your fingertips"
          mockup={PatientRecordMockup}
        />
      </Sequence>

      {/* Feature 3: AI Assistant - 390-510 frames (4 seconds) */}
      <Sequence from={390} durationInFrames={120}>
        <FeatureSceneWithMockup
          title="AI-Powered Assistant"
          description="Intelligent triage and 24/7 patient support"
          mockup={AIChatMockup}
        />
      </Sequence>

      {/* Feature 4: Analytics - 510-630 frames (4 seconds) */}
      <Sequence from={510} durationInFrames={120}>
        <FeatureSceneWithMockup
          title="Practice Analytics"
          description="Data-driven insights to grow your practice"
          mockup={AnalyticsMockup}
        />
      </Sequence>

      {/* Stats Scene - 630-750 frames (4 seconds) */}
      <Sequence from={630} durationInFrames={120}>
        <StatsScene />
      </Sequence>

      {/* CTA Scene - 750-900 frames (5 seconds) */}
      <Sequence from={750} durationInFrames={150}>
        <CTAScene />
      </Sequence>
    </AbsoluteFill>
  );
};
