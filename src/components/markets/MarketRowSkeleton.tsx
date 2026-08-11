'use client';

import React from 'react';

export function MarketRowSkeleton() {
  return (
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 rounded-xl border border-white/[0.05] bg-[#171717] px-4 py-3.5 animate-pulse">
      {/* Left */}
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-4 w-14 bg-white/[0.06] rounded" />
          <div className="h-4 w-10 bg-white/[0.06] rounded" />
          <div className="h-4 w-16 bg-white/[0.06] rounded-full" />
          <div className="h-3 w-20 bg-white/[0.04] rounded ml-auto xl:ml-2" />
        </div>
        <div className="h-5 w-3/4 bg-white/[0.08] rounded" />
      </div>

      {/* Center */}
      <div className="flex flex-col gap-2 min-w-[200px] lg:min-w-[220px] xl:px-4 xl:border-x xl:border-white/[0.06]">
        <div className="flex justify-between">
          <div className="h-3.5 w-16 bg-white/[0.06] rounded" />
          <div className="h-3.5 w-16 bg-white/[0.06] rounded" />
        </div>
        <div className="h-1.5 w-full bg-white/[0.06] rounded-full" />
        <div className="flex justify-between">
          <div className="h-3 w-16 bg-white/[0.04] rounded" />
          <div className="h-3 w-20 bg-white/[0.04] rounded" />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 min-w-[240px]">
        <div className="h-9 flex-1 bg-white/[0.06] rounded-lg" />
        <div className="h-9 flex-1 bg-white/[0.06] rounded-lg" />
        <div className="h-5 w-5 bg-white/[0.04] rounded-full" />
      </div>
    </div>
  );
}
