import React from 'react';
import { Composition } from 'remotion';
import { CaberuMarketing } from './CaberuMarketing';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="CaberuMarketing"
        component={CaberuMarketing}
        durationInFrames={900} // 30 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: 'Caberu - Transform Your Dental Practice',
        }}
      />
    </>
  );
};
