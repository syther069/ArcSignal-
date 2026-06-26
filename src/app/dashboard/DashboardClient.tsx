'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import Sidebar from '@/components/layout/Sidebar';
import LiveActivityPanel from '@/components/layout/LiveActivityPanel';
import Footer from '@/components/layout/Footer';
import { MarketCard } from '@/components/markets/MarketCard';
import { StakeModal } from '@/components/markets/StakeModal';
import { StatCard } from '@/components/ui/StatCard';
import { Market, StakeSide } from '@/types';

type FilterCategory = 'all' | 'football' | 'crypto';

interface DashboardClientProps {
  initialMarkets: Market[];
  aiAccuracy: any[];
}

export default function DashboardClient({ initialMarkets, aiAccuracy }: DashboardClientProps) {
  const [filter, setFilter] = useState<FilterCategory>('all');
  const [stakeModal, setStakeModal] = useState<{
    market: Market;
    side: StakeSide;
  } | null>(null);

  const filteredMarkets =
    filter === 'all'
      ? initialMarkets
      : initialMarkets.filter((m) => m.category === filter);

  const totalVolume = initialMarkets.reduce(
    (sum, m) => sum + m.followPool + m.fadePool,
    0
  );

  const { isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const aiOverall = aiAccuracy?.find((a) => a.category === 'overall');
  const aiWinRate = aiOverall && aiOverall.totalMarkets > 0 
    ? Math.round((aiOverall.correctPredictions / aiOverall.totalMarkets) * 100) 
    : 0;

  const pnlDisplay = !mounted || !isConnected ? '-' : '$0.00';

  return (
    <div className="flex min-h-screen">
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="lg:ml-[264px] xl:mr-[380px] pt-28 px-8 pb-12 flex-1 min-w-0">
        {/* Page Header */}
        <header className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-[32px] font-black tracking-tight text-white italic mb-2">
              LIVE MARKETS
            </h1>
            <div className="flex gap-6 items-center">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-[#38bdf8] font-mono">
                  {initialMarkets.length}
                </span>
                <span className="text-[11px] uppercase text-slate-400 tracking-wider font-mono">
                  Active AI Agents
                </span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-[#38bdf8] font-mono">
                  ${(totalVolume / 1000).toFixed(1)}K
                </span>
                <span className="text-[11px] uppercase text-slate-400 tracking-wider font-mono">
                  Total Volume
                </span>
              </div>
            </div>
          </div>

          {/* Filter buttons */}
          <div className="flex gap-2">
            {(['all', 'football', 'crypto'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold font-mono border rounded transition-all ${
                  filter === cat
                    ? 'bg-[#38bdf8]/10 border-[#38bdf8]/60 text-[#38bdf8]'
                    : 'bg-[#0f1f38] border-white/10 text-slate-400 hover:border-[#38bdf8]/30'
                }`}
              >
                {cat === 'all' ? 'ALL' : cat === 'football' ? 'SPORTS' : 'CRYPTO'}
              </button>
            ))}
          </div>
        </header>

        {/* Stat Cards Row */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard
            label="TOTAL VOLUME"
            value={`$${(totalVolume / 1000).toFixed(1)}K`}
            change="+12.4%"
            changePositive={true}
          />
          <StatCard
            label="ACTIVE MARKETS"
            value={`${initialMarkets.length}`}
          />
          <StatCard
            label="AI WIN RATE"
            value={`${aiWinRate}%`}
            change="Overall"
            changePositive={true}
          />
          <StatCard
            label="YOUR PNL"
            value={pnlDisplay}
          />
        </div>

        {/* Market Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredMarkets.map((market) => (
            <MarketCard
              key={market.id}
              market={market}
              onFollow={() =>
                setStakeModal({ market, side: 0 })
              }
              onFade={() =>
                setStakeModal({ market, side: 1 })
              }
            />
          ))}
        </div>

        {/* Neural Network Decorative Panel */}
        <div className="mt-12 h-48 glass-card relative overflow-hidden group flex items-center justify-center">
          <div className="text-center pointer-events-none">
            <span className="text-[12px] text-[#38bdf8]/60 tracking-[0.4em] uppercase font-mono font-bold">
              NEURAL NETWORK CALIBRATING
            </span>
            <div className="flex gap-1 justify-center mt-4">
              <div className="w-1 h-4 bg-[#38bdf8]/40 animate-bounce" style={{ animationDelay: '0s' }} />
              <div className="w-1 h-8 bg-[#38bdf8]/40 animate-bounce" style={{ animationDelay: '0.15s' }} />
              <div className="w-1 h-6 bg-[#38bdf8]/40 animate-bounce" style={{ animationDelay: '0.3s' }} />
              <div className="w-1 h-5 bg-[#38bdf8]/40 animate-bounce" style={{ animationDelay: '0.45s' }} />
              <div className="w-1 h-7 bg-[#38bdf8]/40 animate-bounce" style={{ animationDelay: '0.6s' }} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12">
          <Footer />
        </div>
      </main>

      {/* Right Activity Panel */}
      <LiveActivityPanel />

      {/* Stake Modal */}
      {stakeModal && (
        <StakeModal
          market={stakeModal.market}
          side={stakeModal.side}
          isOpen={true}
          onClose={() => setStakeModal(null)}
        />
      )}
    </div>
  );
}
