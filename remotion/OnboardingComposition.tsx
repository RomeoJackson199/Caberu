import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { WelcomeScene } from './scenes/onboarding/WelcomeScene';
import { BookingScene } from './scenes/onboarding/BookingScene';
import { ConnectedScene } from './scenes/onboarding/ConnectedScene';
import { SecureScene } from './scenes/onboarding/SecureScene';

/**
 * Onboarding Composition - 4 scenes played in sequence
 * Each scene: 120 frames (4 seconds @ 30fps)
 * Total: 480 frames (16 seconds)
 *
 * Used by the Welcome page with @remotion/player
 * The player seeks to scene boundaries as the user navigates slides.
 */

export const SCENE_DURATION = 120; // frames per scene
export const TOTAL_SCENES = 4;
export const TOTAL_FRAMES = SCENE_DURATION * TOTAL_SCENES; // 480 frames

interface OnboardingCompositionProps {
  title?: string;
}

export const OnboardingComposition: React.FC<OnboardingCompositionProps> = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0f' }}>
      <Sequence from={0} durationInFrames={SCENE_DURATION}>
        <WelcomeScene />
      </Sequence>

      <Sequence from={SCENE_DURATION} durationInFrames={SCENE_DURATION}>
        <BookingScene />
      </Sequence>

      <Sequence from={SCENE_DURATION * 2} durationInFrames={SCENE_DURATION}>
        <ConnectedScene />
      </Sequence>

      <Sequence from={SCENE_DURATION * 3} durationInFrames={SCENE_DURATION}>
        <SecureScene />
      </Sequence>
    </AbsoluteFill>
  );
};
