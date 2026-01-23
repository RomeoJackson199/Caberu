import React from 'react';
import { Player } from '@remotion/player';
import { CaberuMarketing } from '../../../remotion/CaberuMarketing';

export const VideoShowcase: React.FC = () => {
  return (
    <section className="relative py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
            See Caberu in Action
          </h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Watch how Caberu transforms dental practice management with AI-powered automation
          </p>
        </div>

        <div className="relative max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-slate-800/50 bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-xl">
          <Player
            component={CaberuMarketing}
            durationInFrames={1350}
            compositionWidth={1920}
            compositionHeight={1080}
            fps={30}
            controls
            autoPlay
            loop
            style={{
              width: '100%',
              aspectRatio: '16/9',
            }}
            inputProps={{
              title: 'Transform Your Dental Practice',
            }}
          />
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-slate-400">
            Start your free 14-day trial today • No credit card required
          </p>
        </div>
      </div>
    </section>
  );
};
