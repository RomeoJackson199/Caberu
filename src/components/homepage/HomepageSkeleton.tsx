import React from "react";
import { cn } from "@/lib/utils";

// Animated skeleton with shimmer effect
const Shimmer = ({ className }: { className?: string }) => (
  <div 
    className={cn(
      "relative overflow-hidden bg-slate-700/40 rounded-lg",
      "before:absolute before:inset-0 before:-translate-x-full",
      "before:animate-[shimmer_2s_infinite]",
      "before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
      className
    )} 
  />
);

export const HomepageSkeleton = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header Skeleton */}
      <header className="h-16 flex items-center px-6 border-b border-white/5">
        <Shimmer className="h-8 w-28" />
        <div className="ml-auto flex gap-3">
          <Shimmer className="h-9 w-20 rounded-full" />
          <Shimmer className="h-9 w-24 rounded-full" />
        </div>
      </header>

      {/* Hero Section Skeleton */}
      <section className="min-h-[90vh] flex items-center justify-center px-6 pt-10">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="flex justify-center">
            <Shimmer className="h-9 w-52 rounded-full" />
          </div>
          
          {/* Headline */}
          <div className="space-y-3">
            <Shimmer className="h-14 w-full max-w-lg mx-auto" />
            <Shimmer className="h-14 w-3/4 mx-auto bg-blue-500/10" />
          </div>
          
          {/* Subheadline */}
          <div className="space-y-2">
            <Shimmer className="h-6 w-2/3 mx-auto" />
            <Shimmer className="h-5 w-1/2 mx-auto opacity-60" />
          </div>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Shimmer className="h-14 w-48 rounded-xl bg-blue-600/20" />
            <Shimmer className="h-14 w-40 rounded-xl border border-white/10" />
          </div>
          
          {/* Trust badges */}
          <div className="flex justify-center gap-6 pt-6">
            <Shimmer className="h-5 w-28" />
            <Shimmer className="h-5 w-24" />
            <Shimmer className="h-5 w-24" />
          </div>
        </div>
      </section>

      {/* Stats Card Skeleton - positioned on right (desktop only) */}
      <div className="hidden lg:block fixed top-1/2 right-16 -translate-y-1/2">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 w-80">
          <div className="text-center space-y-6">
            <Shimmer className="h-5 w-44 mx-auto" />
            <Shimmer className="h-4 w-56 mx-auto" />
            <div className="grid grid-cols-3 gap-4 pt-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Shimmer className="h-8 w-12 mx-auto" />
                  <Shimmer className="h-3 w-16 mx-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomepageSkeleton;
