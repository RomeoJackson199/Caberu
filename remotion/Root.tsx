import React from 'react';
import { Composition } from 'remotion';
import { CaberuMarketing } from './CaberuMarketing';
import { CaberuMarketing3D } from './CaberuMarketing3D';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Original 2D Marketing Video (45 seconds) */}
      <Composition
        id="CaberuMarketing"
        component={CaberuMarketing}
        durationInFrames={1800}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: 'Caberu - Transform Your Dental Practice',
        }}
      />

      {/* Premium 3D Marketing Video (60 seconds) */}
      <Composition
        id="CaberuMarketing3D"
        component={CaberuMarketing3D}
        durationInFrames={1800}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: 'Caberu - AI-Powered Practice Management',
        }}
      />

      {/* Short version for social media (30 seconds) */}
      <Composition
        id="CaberuMarketing3D-Short"
        component={CaberuMarketing3D}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: 'Caberu - Transform Your Practice',
        }}
      />

      {/* Square format for Instagram (60 seconds) */}
      <Composition
        id="CaberuMarketing3D-Square"
        component={CaberuMarketing3D}
        durationInFrames={1800}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={{
          title: 'Caberu - AI-Powered Practice Management',
        }}
      />

      {/* Vertical format for TikTok/Reels (60 seconds) */}
      <Composition
        id="CaberuMarketing3D-Vertical"
        component={CaberuMarketing3D}
        durationInFrames={1800}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          title: 'Caberu - AI-Powered Practice Management',
        }}
      />
    </>
  );
};
