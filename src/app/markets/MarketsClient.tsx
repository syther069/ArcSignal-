'use client';

import React, { useMemo, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Footer from '@/components/layout/Footer';
import { MarketCard } from '@/components/markets/MarketCard';
import { StakeModal } from '@/components/markets/StakeModal';
import { Market, StakeSide } from '@/types';
import type { SerializableMarket } from '@/lib/markets';
import { toUiMarket } from '@/lib/ui-market';
import { Plus, Filter, Clock } from 'lucide-react';

interface MarketsClientProps {
  markets: SerializableMarket[];
}

const TIMEFRAME_META: Record<string, { label: string; description: string; color: string; border: string; bg: string }> = {
  '5m':  { label: '5 Minutes', description: 'Ultra-short price momentum', color: 'text-[#4fdbc8]', border: 'border-[#4fdbc8]/40', bg: 'bg-[#4fdbc8]/10' },
  '15m': { label: '15 Minutes', description: 'Short-term price action',    color: 'text-[#7dd3fc]', border: 'border-[#7dd3fc]/40', bg: 'bg-[#7dd3fc]/10' },
  '1h':  { label: '1 Hour',     description: 'Hourly trend prediction',    color: 'text-[#ddb7ff]', border: 'border-[#ddb7ff]/40', bg: 'bg-[#ddb7ff]/10' },
  '4h':  { label: '4 Hours',    description: 'Mid-session momentum',       color: 'text-[#fbbf24]', border: 'border-[#fbbf24]/40', bg: 'bg-[#fbbf24]/10' },
  '24h': { label: '24 Hours',   description: 'Daily close prediction',     color: 'text-[#fb923c]', border: 'border-[#fb923c]/40', bg: 'bg-[#fb923c]/10' },
};

const TIMEFRAMES = ['5m', '15m', '1h', '4h', '24h'];

export default function MarketsClient({ markets }: MarketsClientProps) {
  const [selectedCategory, setSelectedCategory] = useState('All Markets');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string | null>(null);
  const [stakeModal, setStakeModal] = useState<{
    market: Market;
    side: StakeSide;
  } | null>(null);

  const nowUnix = Math.floor(Date.now() / 1000);

  const cryptoMarkets = useMemo(
    () => markets.filter((m) => m.category === 'CRYPTO'),
    [markets]
  );
  const footballMarkets = useMemo(
    () => markets.filter((m) => m.category === 'FOOTBALL'),
    [markets]
  );

  // Group crypto markets by timeframe
  const marketsByTimeframe = useMemo(() => {
    const map: Record<string, SerializableMarket[]> = {};
    for (const tf of TIMEFRAMES) {
      map[tf] = cryptoMarkets.filter((m) =>
        m.marketId.includes(`-PRICE-${tf}-`)
      );
    }
    return map;
  }, [cryptoMarkets]);

  const getTimeframeCount = (tf: string) =>
    marketsByTimeframe[tf]?.filter((m) => !m.resolved && m.resolutionTime > nowUnix).length ?? 0;

  const categories = ['All Markets', 'Crypto', 'Football'];

  // What sections to render
  const showCrypto = selectedCategory === 'All Markets' || selectedCategory === 'Crypto';
  const showFootball = selectedCategory === 'All Markets' || selectedCategory === 'Football';

  // Timeframes to render: if a specific timeframe is selected, only that one
  const activeTimeframes = selectedTimeframe ? [selectedTimeframe] : TIMEFRAMES;

  return (
    <div className="flex min-h-screen bg-[#131313]">
      <Sidebar />

      <main className="lg:ml-[264px] pt-24 pb-24 md:pb-8 flex-1 min-w-0 min-h-screen">
        <div className="max-w-[1440px] mx-auto w-full p-6 lg:p-8">

          {/* Page header */}
          <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="font-[family-name:var(--font-hanken)] text-4xl font-bold text-white tracking-tight mb-2">
                Markets Explorer
              </h1>
              <p className="text-sm text-[#94a3b8] max-w-2xl">
                AI-generated prediction markets across multiple timeframes.{' '}
                Stake your conviction, earn from accuracy.
              </p>
            </div>
            <button className="flex items-center gap-2 bg-[#ddb7ff]/10 hover:bg-[#ddb7ff]/20 text-[#ddb7ff] py-2.5 px-4 rounded-lg font-[family-name:var(--font-jetbrains-mono)] text-xs font-semibold uppercase tracking-wider transition-colors border border-[#ddb7ff]/25 shrink-0">
              <Plus className="w-4 h-4" />
              Create Market
            </button>
          </header>

          {/* ── Top filter bar ── */}
          <div className="flex flex-col gap-4 mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              {/* Category tabs */}
              <div className="inline-flex items-center gap-1 bg-[#0f172a] border border-[#1e293b] rounded-xl p-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setSelectedTimeframe(null);
                    }}
                    className={`whitespace-nowrap px-4 py-1.5 rounded-lg text-xs font-[family-name:var(--font-jetbrains-mono)] font-semibold uppercase tracking-wider transition-all ${
                      selectedCategory === cat
                        ? 'bg-[#ddb7ff]/10 text-[#ddb7ff] border border-[#ddb7ff]/25'
                        : 'text-[#94a3b8] hover:text-[#e5e2e1] border border-transparent'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <button className="flex items-center gap-2 bg-[#0f172a] border border-[#1e293b] p-2 rounded-lg text-[#94a3b8] hover:text-[#ddb7ff] hover:border-[#ddb7ff]/30 transition-colors">
                <Filter className="w-4 h-4" />
              </button>
            </div>

            {/* Timeframe pills — shown when crypto is relevant */}
            {showCrypto && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-[#94a3b8] font-[family-name:var(--font-jetbrains-mono)] uppercase tracking-widest flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Timeframe:
                </span>
                <button
                  onClick={() => setSelectedTimeframe(null)}
                  className={`px-3 py-1 rounded-full text-xs font-[family-name:var(--font-jetbrains-mono)] font-semibold uppercase tracking-wider transition-all ${
                    selectedTimeframe === null
                      ? 'bg-[#ddb7ff]/15 text-[#ddb7ff] border border-[#ddb7ff]/30'
                      : 'bg-[#0f172a] text-[#94a3b8] border border-[#1e293b] hover:border-[#ddb7ff]/30 hover:text-[#ddb7ff]'
                  }`}
                >
                  All
                </button>
                {TIMEFRAMES.map((tf) => {
                  const meta = TIMEFRAME_META[tf];
                  const count = getTimeframeCount(tf);
                  return (
                    <button
                      key={tf}
                      onClick={() => setSelectedTimeframe(selectedTimeframe === tf ? null : tf)}
                      className={`px-3 py-1 rounded-full text-xs font-[family-name:var(--font-jetbrains-mono)] font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                        selectedTimeframe === tf
                          ? `${meta.bg} ${meta.color} ${meta.border} border`
                          : 'bg-[#0f172a] text-[#94a3b8] border border-[#1e293b] hover:border-[#ddb7ff]/30 hover:text-[#ddb7ff]'
                      }`}
                    >
                      {tf}
                      <span className="bg-[#1e293b] text-[#94a3b8] text-[10px] px-1.5 py-0.5 rounded-full">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── CRYPTO SECTIONS (grouped by timeframe) ── */}
          {showCrypto && (
            <div className="space-y-12 mb-12">
              {activeTimeframes.map((tf) => {
                const meta = TIMEFRAME_META[tf];
                const tfMarkets = marketsByTimeframe[tf] ?? [];
                if (tfMarkets.length === 0) return null;

                return (
                  <section key={tf}>
                    {/* Section header */}
                    <div className={`flex items-center gap-3 mb-5 pb-3 border-b border-[#1e293b]`}>
                      <div className={`flex items-center gap-2 ${meta.bg} ${meta.border} border rounded-lg px-3 py-1.5`}>
                        <Clock className={`w-3.5 h-3.5 ${meta.color}`} />
                        <span className={`text-xs font-[family-name:var(--font-jetbrains-mono)] font-bold uppercase tracking-wider ${meta.color}`}>
                          {tf}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-[family-name:var(--font-hanken)] font-semibold text-white">
                          {meta.label} Markets
                        </span>
                        <span className="ml-2 text-[11px] text-[#94a3b8] font-[family-name:var(--font-jetbrains-mono)]">
                          {meta.description} · {tfMarkets.length} market{tfMarkets.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    {/* Market grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {tfMarkets.map((market) => (
                        <MarketCard
                          key={market.marketId}
                          market={market}
                          onFollow={() => setStakeModal({ market: toUiMarket(market), side: 0 })}
                          onFade={() => setStakeModal({ market: toUiMarket(market), side: 1 })}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}

              {/* Empty state for crypto */}
              {activeTimeframes.every((tf) => (marketsByTimeframe[tf]?.length ?? 0) === 0) && (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-12 h-12 rounded-xl bg-[#0f172a] border border-[#1e293b] flex items-center justify-center mb-4">
                    <div className="w-2 h-2 rounded-full bg-[#ddb7ff] animate-pulse" />
                  </div>
                  <p className="font-[family-name:var(--font-hanken)] text-lg font-semibold text-[#94a3b8]">
                    No crypto markets found
                  </p>
                  <p className="text-sm text-[#94a3b8]/60 mt-2">
                    Trigger market generation to create fresh markets.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── FOOTBALL SECTION ── */}
          {showFootball && footballMarkets.length > 0 && (
            <section className="mb-12">
              <div className="flex items-center gap-3 mb-5 pb-3 border-b border-[#1e293b]">
                <div className="flex items-center gap-2 bg-[#4ade80]/10 border border-[#4ade80]/40 rounded-lg px-3 py-1.5">
                  <span className="text-xs font-[family-name:var(--font-jetbrains-mono)] font-bold uppercase tracking-wider text-[#4ade80]">
                    ⚽ Football
                  </span>
                </div>
                <div>
                  <span className="text-sm font-[family-name:var(--font-hanken)] font-semibold text-white">
                    Football Markets
                  </span>
                  <span className="ml-2 text-[11px] text-[#94a3b8] font-[family-name:var(--font-jetbrains-mono)]">
                    Match outcome predictions · {footballMarkets.length} market{footballMarkets.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {footballMarkets.map((market) => (
                  <MarketCard
                    key={market.marketId}
                    market={market}
                    onFollow={() => setStakeModal({ market: toUiMarket(market), side: 0 })}
                    onFade={() => setStakeModal({ market: toUiMarket(market), side: 1 })}
                  />
                ))}
              </div>
            </section>
          )}

          {/* All empty */}
          {markets.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-12 h-12 rounded-xl bg-[#0f172a] border border-[#1e293b] flex items-center justify-center mb-4">
                <div className="w-2 h-2 rounded-full bg-[#ddb7ff] animate-pulse" />
              </div>
              <p className="font-[family-name:var(--font-hanken)] text-lg font-semibold text-[#94a3b8]">
                AI agents are generating markets...
              </p>
              <p className="text-sm text-[#94a3b8]/60 mt-2">
                Check back shortly or trigger market generation.
              </p>
            </div>
          )}

          <div className="mt-16">
            <Footer />
          </div>
        </div>
      </main>

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
