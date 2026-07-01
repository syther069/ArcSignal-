'use client';

import React from 'react';

export default function RightSidebar() {
  return (
    <aside className="fixed right-0 top-16 h-[calc(100vh-64px)] w-[320px] bg-background border-l border-white/10 hidden xl:flex flex-col py-6 px-6 z-40 overflow-y-auto">
      
      {/* Market Pulse Section */}
      <div className="mb-10">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest">
            Market Pulse
          </h3>
          <span className="text-[10px] text-tertiary font-bold tracking-widest uppercase">Live</span>
        </div>
        
        {/* Simple CSS Bar Chart Placeholder */}
        <div className="h-32 flex items-end justify-between gap-1 mb-2">
          {[40, 60, 30, 80, 50, 45, 90, 70, 55].map((height, i) => (
            <div 
              key={i} 
              className={`w-full rounded-t-sm ${i === 3 || i === 6 ? 'bg-primary' : 'bg-surface-container-highest'}`}
              style={{ height: `${height}%` }}
            ></div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-on-surface-variant font-mono">
          <span>08:00</span>
          <span>12:00</span>
          <span>16:00</span>
        </div>
      </div>

      {/* Activity Feed Section */}
      <div>
        <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-6">
          Activity Feed
        </h3>

        <div className="flex flex-col gap-6 relative">
          {/* Vertical line connecting feed items */}
          <div className="absolute left-1.5 top-2 bottom-2 w-px bg-white/10"></div>

          {/* Feed Item 1 */}
          <div className="relative pl-6">
            <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-primary ring-4 ring-background"></div>
            <p className="text-sm text-on-surface mb-1">
              <span className="font-bold text-primary">0x4F...2A</span> followed <span className="font-semibold">BTC Volatility</span>
            </p>
            <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-widest">
              2M AGO • 1.4 ETH
            </p>
          </div>

          {/* Feed Item 2 */}
          <div className="relative pl-6">
            <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-tertiary ring-4 ring-background"></div>
            <p className="text-sm text-on-surface mb-1">
              <span className="font-bold">Signal Alert:</span> AI Confidence spiked on <span className="font-semibold">L2 TVL</span>
            </p>
            <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-widest">
              14M AGO • INSIGHT
            </p>
          </div>

          {/* Feed Item 3 */}
          <div className="relative pl-6">
            <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-primary/60 ring-4 ring-background"></div>
            <p className="text-sm text-on-surface mb-1">
              <span className="font-bold text-primary">0x9E...8B</span> faded <span className="font-semibold">Global Compute</span>
            </p>
            <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-widest">
              22M AGO • 0.8 ETH
            </p>
          </div>

          {/* Feed Item 4 */}
          <div className="relative pl-6">
            <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-primary/40 ring-4 ring-background"></div>
            <p className="text-sm text-on-surface mb-1">
              <span className="font-bold text-primary">0x1B...5C</span> followed <span className="font-semibold">DAO Gov</span>
            </p>
            <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-widest">
              45M AGO • 10.0 ETH
            </p>
          </div>
        </div>
      </div>

    </aside>
  );
}
