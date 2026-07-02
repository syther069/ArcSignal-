'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import Sidebar from '@/components/layout/Sidebar';
import RightSidebar from '@/components/layout/RightSidebar';
import Footer from '@/components/layout/Footer';
import { StakeModal } from '@/components/markets/StakeModal';
import { Market, StakeSide } from '@/types';
import type { SerializableMarket } from '@/lib/markets';
import { toUiMarket } from '@/lib/ui-market';
import { Bitcoin, Cpu, BarChart3, Shield } from 'lucide-react';

interface DashboardClientProps {
  markets: SerializableMarket[];
  aiAccuracy: any[];
}

export default function DashboardClient({ markets, aiAccuracy }: DashboardClientProps) {
  const [stakeModal, setStakeModal] = useState<{
    market: Market;
    side: StakeSide;
  } | null>(null);

  const { isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const uiMarkets = useMemo(() => markets.map(toUiMarket), [markets]);
  const visibleMarkets = uiMarkets.slice(0, 4);
  const icons = [Bitcoin, Cpu, BarChart3, Shield];

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="lg:ml-[264px] xl:mr-[320px] pt-24 p-8 flex-1 min-w-0 min-h-screen">
        <header className="mb-10 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold text-on-surface tracking-tight mb-2">Live Markets</h1>
            <p className="text-sm text-on-surface-variant">Aggregated signal processing from 12 independent neural nodes.</p>
          </div>
          <div className="flex gap-2">
            <button className="bg-surface-container border border-white/10 px-4 py-2 rounded text-sm font-medium text-on-surface hover:bg-surface-container-highest transition-colors">
              Trend
            </button>
            <button className="bg-surface-container-highest border border-white/5 px-4 py-2 rounded text-sm font-medium text-on-surface transition-colors">
              Volume
            </button>
          </div>
        </header>

        {visibleMarkets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <p className="text-zinc-400 text-lg">AI agents are generating markets...</p>
            <p className="text-zinc-600 text-sm mt-2">Check back shortly or trigger market generation.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {visibleMarkets.map((market, index) => {
              const Icon = icons[index] ?? Bitcoin;
              return (
                <div key={market.marketId} className="bg-surface-container rounded-xl border border-white/5 p-6 top-lit-border shadow-lg">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-surface-container-highest flex items-center justify-center text-on-surface-variant">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-on-surface">{market.title}</h3>
                          <span className="text-[10px] bg-tertiary/20 text-tertiary px-2 py-0.5 rounded font-bold uppercase tracking-widest">
                            {market.resolved ? 'Resolved' : 'Active'}
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-widest mt-1">
                          MKT-{market.marketId} / {market.category}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-3 mb-6">
                    <span className="text-4xl font-bold text-on-surface">{market.agentPick}</span>
                    <span className="text-sm font-mono text-tertiary">{market.probability ?? market.confidence}%</span>
                  </div>

                  <div className="mb-6">
                    <div className="flex justify-between text-xs text-on-surface-variant mb-2">
                      <span>AI Confidence</span>
                      <span className="font-mono">{market.confidence}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${market.confidence}%` }}></div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStakeModal({ market, side: 0 })}
                      disabled={market.resolved}
                      className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-sm py-2.5 rounded transition-colors disabled:opacity-50"
                    >
                      Follow
                    </button>
                    <button
                      onClick={() => setStakeModal({ market, side: 1 })}
                      disabled={market.resolved}
                      className="flex-1 bg-surface-container-highest hover:bg-surface-bright text-on-surface font-bold text-sm py-2.5 rounded transition-colors border border-white/5 disabled:opacity-50"
                    >
                      Fade
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-12">
          <Footer />
        </div>
      </main>

      {/* Right Sidebar */}
      <RightSidebar />

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
