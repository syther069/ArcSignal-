'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface ActivityItem {
  id: string;
  marketId: string;
  walletAddress: string;
  side: number;
  amountUsdc: number;
  question: string;
  category: string;
}

export default function RightSidebar() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadActivity() {
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        const res = await fetch('/api/activity');
        if (res.ok) {
          const data = await res.json();
          if (data.activities && data.activities.length > 0) {
            setActivities(data.activities.slice(0, 5));
          }
        }
      } catch (e) {
        console.error('Failed to load sidebar activity:', e);
      } finally {
        setLoading(false);
      }
    }

    loadActivity();
    const interval = setInterval(loadActivity, 20000);

    const handleVisibility = () => {
      if (!document.hidden) {
        loadActivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);


  return (
    <aside className="fixed right-0 top-16 h-[calc(100vh-64px)] w-[320px] bg-background border-l border-white/10 hidden xl:flex flex-col py-6 px-6 z-40 overflow-y-auto custom-scrollbar">
      {/* Market Pulse Section */}
      <div className="mb-10">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest">
            Market Pulse
          </h3>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[10px] text-tertiary font-bold tracking-widest uppercase">Live</span>
          </div>
        </div>

        {/* Dynamic CSS Bar Chart */}
        <div className="h-28 flex items-end justify-between gap-1 mb-2">
          {[40, 65, 30, 85, 55, 45, 95, 70, 60, 80].map((height, i) => (
            <div
              key={i}
              className={`w-full rounded-t-sm transition-all duration-500 ${
                i === 3 || i === 6 ? 'bg-primary' : 'bg-surface-container-highest hover:bg-primary/50'
              }`}
              style={{ height: `${height}%` }}
            ></div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-on-surface-variant font-mono">
          <span>08:00</span>
          <span>12:00</span>
          <span>16:00</span>
          <span>20:00</span>
        </div>
      </div>

      {/* Activity Feed Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest">
            Live Stakes
          </h3>
          <span className="text-[10px] text-primary font-mono font-bold uppercase tracking-wider">
            USDC • ARC
          </span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs font-mono text-slate-500">
            LOADING ACTIVITY...
          </div>
        ) : activities.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono text-slate-500">
            NO RECENT STAKES
          </div>
        ) : (
          <div className="flex flex-col gap-5 relative">
            {/* Vertical line connecting feed items */}
            <div className="absolute left-1.5 top-2 bottom-2 w-px bg-white/10"></div>

            {activities.map((act) => {
              const isFollow = act.side === 0;
              const shortWallet = `${act.walletAddress.slice(0, 6)}...${act.walletAddress.slice(-4)}`;

              return (
                <div key={act.id} className="relative pl-6">
                  <div
                    className={`absolute left-0 top-1.5 w-3 h-3 rounded-full ring-4 ring-background ${
                      isFollow ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                  ></div>
                  <p className="text-sm text-on-surface mb-1 leading-snug">
                    <span className="font-bold text-primary font-mono text-xs">{shortWallet}</span>{' '}
                    <span className={isFollow ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                      {isFollow ? 'followed' : 'faded'}
                    </span>{' '}
                    <Link
                      href={`/market/${act.marketId}`}
                      className="font-semibold hover:text-primary transition-colors line-clamp-1 text-xs text-slate-200"
                    >
                      {act.question}
                    </Link>
                  </p>
                  <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
                    <strong className="text-white font-bold">{act.amountUsdc.toLocaleString()} USDC</strong>
                    <span>•</span>
                    <span className={isFollow ? 'text-emerald-400/80' : 'text-rose-400/80'}>
                      {isFollow ? 'FOLLOW' : 'FADE'}
                    </span>
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
