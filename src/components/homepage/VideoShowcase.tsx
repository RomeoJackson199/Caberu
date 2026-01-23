import React from 'react';
import { Player } from '@remotion/player';
import { CaberuMarketing3D } from '../../../remotion/CaberuMarketing3D';

export const VideoShowcase: React.FC = () => {
  return (
    <section className="relative py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Ambient glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </span>
            <span className="text-sm font-medium text-blue-400">New: Premium 3D Experience</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent mb-4">
            See Caberu in Action
          </h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Watch how Caberu transforms healthcare practice management with AI-powered automation
          </p>
        </div>

        <div className="relative max-w-5xl mx-auto">
          {/* Glow border effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 rounded-2xl opacity-20 blur-lg" />

          <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-700/50 bg-slate-900">
            <Player
              component={CaberuMarketing3D}
              durationInFrames={1800}
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
                title: 'Caberu - AI-Powered Practice Management',
              }}
            />
          </div>
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
