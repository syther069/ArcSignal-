'use client';

import React from 'react';

export function MarketCardSkeleton() {
  return (
    <div className="bg-[#1c1b1b] rounded-2xl p-6 flex flex-col gap-5 border border-white/5 animate-pulse relative overflow-hidden">
      {/* Top badges */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-5 w-16 bg-[#2a2a2a] rounded-md" />
          <div className="h-5 w-12 bg-[#2a2a2a] rounded-md" />
        </div>
        <div className="h-4 w-16 bg-[#2a2a2a] rounded-full" />
      </div>

      {/* Question title placeholder */}
      <div className="space-y-2">
        <div className="h-6 bg-[#2a2a2a] rounded-md w-4/5" />
        <div className="h-6 bg-[#2a2a2a] rounded-md w-3/5" />
      </div>

      {/* AI Insight Box Skeleton */}
      <div className="bg-[#0f172a]/60 rounded-xl p-4 space-y-3">
        <div className="flex justify-between items-center">
          <div className="h-4 w-20 bg-[#2a2a2a] rounded" />
          <div className="h-4 w-24 bg-[#2a2a2a] rounded" />
        </div>
        <div className="h-1.5 w-full bg-[#1e293b] rounded-full overflow-hidden">
          <div className="h-full bg-[#2a2a2a] w-2/3" />
        </div>
        <div className="h-3 w-full bg-[#2a2a2a] rounded" />
        <div className="h-3 w-4/5 bg-[#2a2a2a] rounded" />
      </div>

      {/* Pools Skeleton */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#0f172a]/60 p-4 rounded-xl space-y-2">
          <div className="h-3 w-16 bg-[#2a2a2a] rounded" />
          <div className="h-6 w-20 bg-[#2a2a2a] rounded" />
        </div>
        <div className="bg-[#0f172a]/60 p-4 rounded-xl space-y-2">
          <div className="h-3 w-16 bg-[#2a2a2a] rounded" />
          <div className="h-6 w-20 bg-[#2a2a2a] rounded" />
        </div>
      </div>

      {/* Action buttons skeleton */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="h-10 bg-[#2a2a2a] rounded-xl" />
        <div className="h-10 bg-[#2a2a2a] rounded-xl" />
      </div>
    </div>
  );
}
