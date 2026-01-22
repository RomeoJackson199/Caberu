import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { HeroScene } from './scenes/HeroScene';
import { FeatureScene } from './scenes/FeatureScene';
import { StatsScene } from './scenes/StatsScene';
import { CTAScene } from './scenes/CTAScene';

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
        <FeatureScene
          icon="📅"
          title="Smart Scheduling"
          description="AI-powered appointment calendar that reduces no-shows"
          gradient="from-blue-500 to-cyan-500"
        />
      </Sequence>

      {/* Feature 2: Patient Records - 270-390 frames (4 seconds) */}
      <Sequence from={270} durationInFrames={120}>
        <FeatureScene
          icon="📋"
          title="Digital Health Records"
          description="Complete patient history at your fingertips"
          gradient="from-purple-500 to-pink-500"
        />
      </Sequence>

      {/* Feature 3: AI Assistant - 390-510 frames (4 seconds) */}
      <Sequence from={390} durationInFrames={120}>
        <FeatureScene
          icon="🤖"
          title="AI-Powered Assistant"
          description="Intelligent triage and 24/7 patient support"
          gradient="from-green-500 to-emerald-500"
        />
      </Sequence>

      {/* Feature 4: Analytics - 510-630 frames (4 seconds) */}
      <Sequence from={510} durationInFrames={120}>
        <FeatureScene
          icon="📊"
          title="Practice Analytics"
          description="Data-driven insights to grow your practice"
          gradient="from-orange-500 to-red-500"
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
