'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import Sidebar from '@/components/layout/Sidebar';
import RightSidebar from '@/components/layout/RightSidebar';
import Footer from '@/components/layout/Footer';
import { StakeModal } from '@/components/markets/StakeModal';
import { Market, StakeSide } from '@/types';
import { Bitcoin, Cpu, BarChart3, Shield } from 'lucide-react';

interface DashboardClientProps {
  initialMarkets: Market[];
  aiAccuracy: any[];
}

export default function DashboardClient({ initialMarkets, aiAccuracy }: DashboardClientProps) {
  const [stakeModal, setStakeModal] = useState<{
    market: Market;
    side: StakeSide;
  } | null>(null);

  const { isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

        {/* Live Markets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1 */}
          <div className="bg-surface-container rounded-xl border border-white/5 p-6 top-lit-border shadow-lg">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-surface-container-highest flex items-center justify-center text-on-surface-variant">
                  <Bitcoin className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-on-surface">BTC Volatility Index</h3>
                    <span className="text-[10px] bg-tertiary/20 text-tertiary px-2 py-0.5 rounded font-bold uppercase tracking-widest">Active</span>
                  </div>
                  <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-widest mt-1">MKT-449-ALPHA</p>
                </div>
              </div>
            </div>

            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-4xl font-bold text-on-surface">Bullish</span>
              <span className="text-sm font-mono text-tertiary">~ +4.2%</span>
            </div>

            <div className="mb-6">
              <div className="flex justify-between text-xs text-on-surface-variant mb-2">
                <span>AI Confidence</span>
                <span className="font-mono">88.4%</span>
              </div>
              <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[88.4%]"></div>
              </div>
            </div>

            <div className="flex gap-3">
              <button className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-sm py-2.5 rounded transition-colors">
                Follow
              </button>
              <button className="flex-1 bg-surface-container-highest hover:bg-surface-bright text-on-surface font-bold text-sm py-2.5 rounded transition-colors border border-white/5">
                Fade
              </button>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-surface-container rounded-xl border border-white/5 p-6 top-lit-border shadow-lg">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-surface-container-highest flex items-center justify-center text-on-surface-variant">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-on-surface">Layer 2 TVL Pulse</h3>
                    <span className="text-[10px] bg-tertiary/20 text-tertiary px-2 py-0.5 rounded font-bold uppercase tracking-widest">Active</span>
                  </div>
                  <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-widest mt-1">MKT-112-OMEGA</p>
                </div>
              </div>
            </div>

            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-4xl font-bold text-on-surface">Neutral</span>
              <span className="text-sm font-mono text-on-surface-variant">– 0.0%</span>
            </div>

            <div className="mb-6">
              <div className="flex justify-between text-xs text-on-surface-variant mb-2">
                <span>AI Confidence</span>
                <span className="font-mono">62.1%</span>
              </div>
              <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[62.1%]"></div>
              </div>
            </div>

            <div className="flex gap-3">
              <button className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-sm py-2.5 rounded transition-colors">
                Follow
              </button>
              <button className="flex-1 bg-surface-container-highest hover:bg-surface-bright text-on-surface font-bold text-sm py-2.5 rounded transition-colors border border-white/5">
                Fade
              </button>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-surface-container rounded-xl border border-white/5 p-6 top-lit-border shadow-lg">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-surface-container-highest flex items-center justify-center text-on-surface-variant">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-on-surface">Global Compute Cost</h3>
                    <span className="text-[10px] bg-tertiary/20 text-tertiary px-2 py-0.5 rounded font-bold uppercase tracking-widest">Active</span>
                  </div>
                  <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-widest mt-1">MKT-880-SIGMA</p>
                </div>
              </div>
            </div>

            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-4xl font-bold text-error">Bearish</span>
              <span className="text-sm font-mono text-error">~ -12.4%</span>
            </div>

            <div className="mb-6">
              <div className="flex justify-between text-xs text-on-surface-variant mb-2">
                <span>AI Confidence</span>
                <span className="font-mono">94.8%</span>
              </div>
              <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full bg-on-surface w-[94.8%]"></div>
              </div>
            </div>

            <div className="flex gap-3">
              <button className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-sm py-2.5 rounded transition-colors">
                Follow
              </button>
              <button className="flex-1 bg-surface-container-highest hover:bg-surface-bright text-on-surface font-bold text-sm py-2.5 rounded transition-colors border border-white/5">
                Fade
              </button>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-surface-container rounded-xl border border-white/5 p-6 top-lit-border shadow-lg relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-surface-container-highest flex items-center justify-center text-on-surface-variant">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-on-surface">DAO Governance Alpha</h3>
                    <span className="text-[10px] bg-surface-container-highest text-on-surface-variant px-2 py-0.5 rounded font-bold uppercase tracking-widest">Closing Soon</span>
                  </div>
                  <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-widest mt-1">MKT-229-KAPPA</p>
                </div>
              </div>
            </div>

            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-4xl font-bold text-on-surface">Bullish</span>
              <span className="text-sm font-mono text-tertiary">~ +1.8%</span>
            </div>

            <div className="mb-6">
              <div className="flex justify-between text-xs text-on-surface-variant mb-2">
                <span>AI Confidence</span>
                <span className="font-mono">45.0%</span>
              </div>
              <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[45%]"></div>
              </div>
            </div>

            <div className="flex gap-3">
              <button className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-sm py-2.5 rounded transition-colors">
                Follow
              </button>
              <button className="flex-1 bg-surface-container-highest hover:bg-surface-bright text-on-surface font-bold text-sm py-2.5 rounded transition-colors border border-white/5">
                Fade
              </button>
            </div>
          </div>

        </div>

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
