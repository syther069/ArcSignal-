'use client';

import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { Market, Stake } from '@/types';

interface PositionWithMarket extends Stake {
  market?: Market;
}

export default function LiveActivityPanel() {
  const { address, isConnected } = useAccount();
  const [positions, setPositions] = useState<PositionWithMarket[]>([]);
  const [marketPulse, setMarketPulse] = useState<Market[]>([]);
  const [recentActivity, setRecentActivity] = useState<Stake[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      try {
        const response = await fetch('/api/markets');
        const payload = await response.json();
        setMarketPulse((payload.markets ?? []).slice(0, 3));
        setPositions([]);
        setRecentActivity([]);
      } catch (err) {
        console.error('Error fetching activity panel data', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [isConnected, address]);

  return (
    <aside className="w-[380px] shrink-0 sticky top-24 h-[calc(100vh-96px)] overflow-y-auto pr-4 pb-8 space-y-6 hidden xl:block custom-scrollbar">
      {/* SECTION 1: YOUR POSITIONS */}
      <div className="glass-card p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <span className="text-xs uppercase text-slate-400 tracking-wider font-bold">Your Positions</span>
          <span className="text-[10px] bg-sky-500/10 border border-sky-500/30 text-sky-400 px-1.5 py-0.5 rounded font-mono">
            {positions.length} Active
          </span>
        </div>

        {!isConnected ? (
          <div className="py-8 text-center space-y-2">
            <span className="material-symbols-outlined text-3xl text-slate-500 block">account_balance_wallet</span>
            <p className="text-xs text-slate-400">CONNECT WALLET TO VIEW POSITIONS</p>
          </div>
        ) : loading ? (
          <div className="py-8 text-center text-xs text-slate-500 font-mono">LOADING POSITIONS...</div>
        ) : positions.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 font-mono">NO ACTIVE PREDICTIONS</div>
        ) : (
          <div className="space-y-3">
            {positions.map((pos) => {
              const isFollow = pos.side === 0;
              const pnlPositive = (pos.pnl ?? 0) >= 0;
              return (
                <div key={pos.id} className="bg-black/20 border border-white/5 p-3 rounded space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-semibold text-slate-200 line-clamp-2">
                      {pos.market?.title || 'Unknown Market'}
                    </span>
                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded font-mono shrink-0 ${
                      isFollow
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                        : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                    }`}>
                      {isFollow ? 'FOLLOW' : 'FADE'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Staked: <strong className="text-slate-200">{pos.amountUsdc} USDC</strong></span>
                    {pos.pnl !== undefined && (
                      <span className={pnlPositive ? 'text-emerald-400' : 'text-rose-400'}>
                        {pnlPositive ? '+' : ''}{pos.pnl} USDC P&L
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: MARKET PULSE */}
      <div className="glass-card p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <span className="text-xs uppercase text-slate-400 tracking-wider font-bold">Market Pulse</span>
          <span className="text-[10px] text-cyan-400 font-mono">Live Pools</span>
        </div>

        {loading ? (
          <div className="py-4 text-center text-xs text-slate-500 font-mono">LOADING...</div>
        ) : marketPulse.length === 0 ? (
          <div className="py-4 text-center text-xs text-slate-500 font-mono">NO ACTIVE MARKETS</div>
        ) : (
          <div className="space-y-4">
            {marketPulse.map((market) => {
              const total = market.followPool + market.fadePool;
              const followPercent = total > 0 ? (market.followPool / total) * 100 : 0;
              const fadePercent = total > 0 ? (market.fadePool / total) * 100 : 0;

              return (
                <div key={market.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-200">
                    <span className="truncate pr-2">{market.title}</span>
                    <span className="font-mono text-slate-400 shrink-0">{total.toLocaleString()} USDC</span>
                  </div>
                  {total === 0 ? (
                    <div className="h-2 w-full bg-white/5 rounded-full flex items-center justify-center">
                      <span className="text-[8px] font-mono text-slate-600">NO LIQUIDITY</span>
                    </div>
                  ) : (
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden flex">
                      <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${followPercent}%` }} />
                      <div className="h-full bg-rose-500 transition-all duration-500" style={{ width: `${fadePercent}%` }} />
                    </div>
                  )}
                  <div className="flex justify-between text-[9px] font-mono text-slate-400">
                    <span>FOLLOW: {followPercent.toFixed(0)}%</span>
                    <span>FADE: {fadePercent.toFixed(0)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 3: RECENT ACTIVITY */}
      <div className="glass-card p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <span className="text-xs uppercase text-slate-400 tracking-wider font-bold">Recent Activity</span>
          <span className="text-[9px] text-slate-400 font-mono">Live Logs</span>
        </div>

        <div className="space-y-3 max-h-[260px] overflow-y-auto terminal-scroll pr-1">
          {recentActivity.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-500 font-mono">NO RECENT ACTIVITY</div>
          ) : (
            recentActivity.map((act) => {
              const isFollow = act.side === 0;
              return (
                <div key={act.id} className="text-[11px] font-mono flex items-start gap-2 py-1 border-b border-white/5 last:border-0">
                  <span className="text-cyan-400 shrink-0">&gt;</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-slate-300 font-semibold truncate block">
                      {act.walletAddress.slice(0, 6)}...{act.walletAddress.slice(-4)}
                    </span>
                    <span className="text-slate-400">
                      staked <strong className={isFollow ? 'text-emerald-400' : 'text-rose-400'}>{act.amountUsdc} USDC</strong> on{' '}
                      <span className={isFollow ? 'text-emerald-400/80' : 'text-rose-400/80'}>
                        {isFollow ? 'FOLLOW' : 'FADE'}
                      </span>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
}
