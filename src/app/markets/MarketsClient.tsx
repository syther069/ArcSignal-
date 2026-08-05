'use client';

import React, { useMemo, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';

import { MarketCard } from '@/components/markets/MarketCard';
import { MarketCardSkeleton } from '@/components/markets/MarketCardSkeleton';
import { StakeModal } from '@/components/markets/StakeModal';
import { Market, StakeSide } from '@/types';
import type { SerializableMarket } from '@/lib/markets';
import { toUiMarket } from '@/lib/ui-market';
import { Plus, Filter, Clock, RotateCw, Search } from 'lucide-react';

interface MarketsClientProps {
  markets: SerializableMarket[];
}

const TIMEFRAME_META: Record<string, { label: string; description: string; color: string; border: string; bg: string }> = {
  '5m': { label: '5 Minutes', description: 'Ultra-short price momentum', color: 'text-[#4fdbc8]', border: 'border-[#4fdbc8]/40', bg: 'bg-[#4fdbc8]/10' },
  '15m': { label: '15 Minutes', description: 'Short-term price action', color: 'text-[#7dd3fc]', border: 'border-[#7dd3fc]/40', bg: 'bg-[#7dd3fc]/10' },
  '1h': { label: '1 Hour', description: 'Hourly trend prediction', color: 'text-[#ddb7ff]', border: 'border-[#ddb7ff]/40', bg: 'bg-[#ddb7ff]/10' },
  '4h': { label: '4 Hours', description: 'Mid-session momentum', color: 'text-[#fbbf24]', border: 'border-[#fbbf24]/40', bg: 'bg-[#fbbf24]/10' },
  '24h': { label: '24 Hours', description: 'Daily close prediction', color: 'text-[#fb923c]', border: 'border-[#fb923c]/40', bg: 'bg-[#fb923c]/10' },
};

const TIMEFRAMES = ['5m', '15m', '1h', '4h', '24h'];

export default function MarketsClient({ markets }: MarketsClientProps) {
  const [selectedCategory, setSelectedCategory] = useState('All Markets');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stakeModal, setStakeModal] = useState<{
    market: Market;
    side: StakeSide;
  } | null>(null);

  const nowUnix = Math.floor(Date.now() / 1000);

  const handleRefresh = () => {
    setIsRefreshing(true);
    window.location.reload();
  };

  const filteredMarkets = useMemo(() => {
    if (!searchQuery.trim()) return markets;
    const q = searchQuery.toLowerCase();
    return markets.filter(
      (m) =>
        (m.question?.toLowerCase() || '').includes(q) ||
        m.marketId.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
    );

  }, [markets, searchQuery]);

  const cryptoMarkets = useMemo(
    () => filteredMarkets.filter((m) => m.category === 'CRYPTO'),
    [filteredMarkets]
  );
  const footballMarkets = useMemo(
    () => filteredMarkets.filter((m) => m.category === 'FOOTBALL'),
    [filteredMarkets]
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
    <div className="flex min-h-screen bg-[#090b11] text-slate-100">
      <Sidebar />

      <main className="lg:ml-[240px] pt-20 pb-24 md:pb-8 flex-1 min-w-0 min-h-screen">
        <div className="max-w-[1440px] mx-auto w-full p-6 lg:p-8 space-y-6">

          {/* Page header */}
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight mb-1">
                Markets Explorer
              </h1>
              <p className="text-sm text-slate-400 max-w-2xl">
                AI-generated prediction markets across multiple timeframes. Stake your conviction, earn from accuracy.
              </p>
            </div>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#141722] border border-slate-800 text-xs font-mono text-slate-300 hover:text-white hover:border-slate-700 transition-colors shrink-0"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
              Refresh Data
            </button>
          </header>

          {/* ── TOP PLATFORM STATS STRIP ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 bg-[#121622] border border-slate-800 rounded-xl overflow-hidden divide-x divide-slate-800/80">
            <div className="p-4">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">LIVE MARKETS</span>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-lg font-bold font-mono text-white">
                  {markets.filter(m => !m.resolved && m.resolutionTime > nowUnix).length} Active
                </span>
              </div>
            </div>
            <div className="p-4">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">TOTAL LIQUIDITY</span>
              <span className="text-lg font-bold font-mono text-white">$45,210 USDC</span>
            </div>
            <div className="p-4">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">24H AI ACCURACY</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold font-mono text-emerald-400">78.5%</span>
                <span className="text-[10px] font-mono text-emerald-400/80 bg-emerald-500/10 px-1.5 py-0.5 rounded">+3.2%</span>
              </div>
            </div>
            <div className="p-4">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">NEXT RESOLUTION</span>
              <span className="text-lg font-bold font-mono text-indigo-400">04m 12s</span>
            </div>
          </div>

          {/* Filters + Sort + Search Strip */}
          <div className="bg-[#121622] border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Category tabs */}
              <div className="inline-flex items-center gap-1 bg-[#0b0e17] rounded-lg p-1 border border-slate-800 overflow-x-auto scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setSelectedTimeframe(null);
                    }}
                    className={`whitespace-nowrap px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                      selectedCategory === cat
                        ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Timeframe selector */}
              {showCrypto && (
                <div className="inline-flex items-center gap-1 bg-[#0b0e17] rounded-lg p-1 border border-slate-800 overflow-x-auto scrollbar-none">
                  <button
                    onClick={() => setSelectedTimeframe(null)}
                    className={`whitespace-nowrap px-3 py-1 rounded text-xs font-mono transition-all ${
                      selectedTimeframe === null
                        ? 'bg-slate-700 text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All TF
                  </button>
                  {TIMEFRAMES.map((tf) => {
                    const count = getTimeframeCount(tf);
                    return (
                      <button
                        key={tf}
                        onClick={() => setSelectedTimeframe(selectedTimeframe === tf ? null : tf)}
                        className={`whitespace-nowrap px-2.5 py-1 rounded text-xs font-mono transition-all flex items-center gap-1 ${
                          selectedTimeframe === tf
                            ? 'bg-slate-700 text-white font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {tf}
                        {count > 0 && (
                          <span className="text-[10px] text-indigo-400 font-bold">({count})</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Search bar */}
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search asset or question..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0b0e17] text-white text-xs pl-9 pr-7 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-500 font-sans"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
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
                    <div className="flex items-center gap-3 mb-6">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${meta.bg}`}>
                        <Clock className={`w-4 h-4 ${meta.color}`} />
                      </div>
                      <div>
                        <h2 className="text-xl font-[family-name:var(--font-hanken)] font-semibold text-white tracking-tight leading-none">
                          {meta.label}
                        </h2>
                        <span className="text-xs text-[#94a3b8] font-[family-name:var(--font-inter)] mt-1 block">
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
          {showFootball && (
            <section className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#4ade80]/10">
                  <span className="text-sm">⚽</span>
                </div>
                <div>
                  <h2 className="text-xl font-[family-name:var(--font-hanken)] font-semibold text-white tracking-tight leading-none">
                    Football
                  </h2>
                  <span className="text-xs text-[#94a3b8] font-[family-name:var(--font-inter)] mt-1 block">
                    Match outcome predictions · {footballMarkets.length} market{footballMarkets.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {footballMarkets.length > 0 ? (
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
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl bg-[#1e293b]/10 border border-[#1e293b]/50">
                  <div className="w-12 h-12 rounded-xl bg-[#0f172a] border border-[#1e293b] flex items-center justify-center mb-4">
                    <span className="text-xl">⚽</span>
                  </div>
                  <p className="font-[family-name:var(--font-hanken)] text-lg font-semibold text-[#94a3b8]">
                    The football markets are currently building
                  </p>
                  <p className="text-sm text-[#94a3b8]/60 mt-2 max-w-sm">
                    Our AI agents are analyzing upcoming fixtures and generating new prediction markets. Check back shortly.
                  </p>
                </div>
              )}
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
