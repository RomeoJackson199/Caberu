import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const HomepageSkeleton = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Skeleton */}
      <header className="h-16 border-b border-border/40 flex items-center px-6">
        <Skeleton className="h-8 w-32" />
        <div className="ml-auto flex gap-4">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>
      </header>

      {/* Hero Section Skeleton */}
      <section className="min-h-[80vh] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center">
        <div className="container mx-auto px-8 md:px-16 xl:px-24 max-w-5xl">
          <div className="space-y-6">
            <Skeleton className="h-14 w-3/4 bg-slate-700/50" />
            <Skeleton className="h-12 w-1/2 bg-blue-400/20" />
            <div className="space-y-3 pt-4">
              <Skeleton className="h-6 w-2/3 bg-slate-600/40" />
              <Skeleton className="h-6 w-1/2 bg-slate-600/40" />
            </div>
            <Skeleton className="h-14 w-48 mt-6 bg-blue-600/30 rounded-lg" />
          </div>
        </div>
      </section>

      {/* Feature Cards Section Skeleton */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto mb-16 space-y-4">
            <Skeleton className="h-12 w-3/4 mx-auto" />
            <Skeleton className="h-6 w-1/2 mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div 
                key={i} 
                className="bg-muted/30 rounded-2xl p-8 border border-border/50 space-y-4"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <Skeleton className="h-16 w-16 rounded-2xl" />
                <Skeleton className="h-6 w-3/4" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomepageSkeleton;
