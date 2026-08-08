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
type MarketView = 'live' | 'pending' | 'resolved' | 'all';
type MarketSort = 'closingSoon' | 'liquidity' | 'newest';

function getMarketView(market: SerializableMarket, nowUnix: number): Exclude<MarketView, 'all'> {
  if (market.resolved) return 'resolved';
  if (market.status === 'PENDING_RESOLUTION' || market.resolutionTime <= nowUnix) return 'pending';
  return 'live';
}

function getTotalLiquidity(market: SerializableMarket) {
  try {
    return BigInt(market.followPool) + BigInt(market.fadePool);
  } catch {
    return 0n;
  }
}

export default function MarketsClient({ markets }: MarketsClientProps) {
  const [selectedCategory, setSelectedCategory] = useState('All Markets');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<MarketView>('live');
  const [sortBy, setSortBy] = useState<MarketSort>('closingSoon');
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
    const statusFiltered = selectedView === 'all'
      ? markets
      : markets.filter((market) => getMarketView(market, nowUnix) === selectedView);

    const searched = !searchQuery.trim()
      ? statusFiltered
      : statusFiltered.filter(
        (m) => {
          const q = searchQuery.toLowerCase();
          return (
            (m.question?.toLowerCase() || '').includes(q) ||
            m.marketId.toLowerCase().includes(q) ||
            m.category.toLowerCase().includes(q)
          );
        }
      );

    return [...searched].sort((a, b) => {
      if (sortBy === 'liquidity') {
        const liquidityDifference = getTotalLiquidity(b) - getTotalLiquidity(a);
        return liquidityDifference > 0n ? 1 : liquidityDifference < 0n ? -1 : 0;
      }
      if (sortBy === 'newest') return b.resolutionTime - a.resolutionTime;
      return a.resolutionTime - b.resolutionTime;
    });
  }, [markets, searchQuery, selectedView, sortBy, nowUnix]);

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
  const viewCounts = useMemo(() => ({
    live: markets.filter((market) => getMarketView(market, nowUnix) === 'live').length,
    pending: markets.filter((market) => getMarketView(market, nowUnix) === 'pending').length,
    resolved: markets.filter((market) => getMarketView(market, nowUnix) === 'resolved').length,
    all: markets.length,
  }), [markets, nowUnix]);

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
          </header>

          {/* Filters + Sort + Search */}
          <div className="flex flex-col mb-8 gap-4">
            <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
              {/* Category tabs */}
              <div className="inline-flex items-center gap-1 bg-[#1c1b1b] rounded-full p-1 border border-white/5 shrink-0">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setSelectedTimeframe(null);
                    }}
                    className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-[family-name:var(--font-inter)] font-medium transition-all ${selectedCategory === cat
                        ? 'bg-[#353534] text-white shadow-sm'
                        : 'text-[#94a3b8] hover:text-white'
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Lifecycle tabs */}
              <div className="flex items-center gap-1 bg-[#1c1b1b] rounded-full p-1 border border-white/5 overflow-x-auto">
                {([
                  ['live', 'Live'],
                  ['pending', 'Pending'],
                  ['resolved', 'Resolved'],
                  ['all', 'All'],
                ] as const).map(([view, label]) => (
                  <button
                    key={view}
                    onClick={() => setSelectedView(view)}
                    className={`whitespace-nowrap px-3.5 py-2 rounded-full text-xs font-[family-name:var(--font-inter)] font-medium transition-all ${selectedView === view
                        ? 'bg-[#353534] text-white shadow-sm'
                        : 'text-[#94a3b8] hover:text-white'
                      }`}
                  >
                    {label} <span className="text-[#94a3b8]">{viewCounts[view]}</span>
                  </button>
                ))}
              </div>

              {/* Search + Timeframe selector + Refresh button */}
              <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto justify-between lg:justify-end">
                {/* Search bar */}
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                  <input
                    type="text"
                    placeholder="Search asset or question..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#1c1b1b] text-white text-xs px-4 py-2.5 rounded-full border border-white/5 focus:outline-none focus:border-[#ddb7ff]/50 transition-colors placeholder:text-[#94a3b8]/60 font-[family-name:var(--font-inter)]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#94a3b8] hover:text-white"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {showCrypto && (
                  <div className="flex items-center gap-2 w-full lg:w-auto">
                    <span className="hidden xl:inline text-[10px] font-[family-name:var(--font-jetbrains-mono)] uppercase tracking-widest text-[#64748b]">
                      Timeframe
                    </span>
                  <div className="inline-flex items-center gap-1 bg-[#1c1b1b] rounded-full p-1 border border-white/5 overflow-x-auto max-w-full">
                    <button
                      onClick={() => setSelectedTimeframe(null)}
                      aria-pressed={selectedTimeframe === null}
                      className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-[family-name:var(--font-inter)] font-medium transition-all ${selectedTimeframe === null
                          ? 'bg-[#353534] text-white shadow-sm'
                          : 'text-[#94a3b8] hover:text-white'
                        }`}
                    >
                      All
                    </button>
                    {TIMEFRAMES.map((tf) => {
                      const count = getTimeframeCount(tf);
                      return (
                        <button
                          key={tf}
                          onClick={() => setSelectedTimeframe(selectedTimeframe === tf ? null : tf)}
                          aria-pressed={selectedTimeframe === tf}
                          className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-[family-name:var(--font-inter)] font-medium transition-all flex items-center gap-1.5 ${selectedTimeframe === tf
                              ? 'bg-[#353534] text-white shadow-sm'
                              : 'text-[#94a3b8] hover:text-white'
                            }`}
                        >
                          {tf}
                          {count > 0 && (
                            <span className="bg-[#2a2a2a] text-[#4fdbc8] text-[9px] px-1.5 py-0.2 rounded-full font-[family-name:var(--font-jetbrains-mono)] font-bold">
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  </div>
                )}

                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  title="Refresh markets data"
                  className="bg-[#1c1b1b] p-2.5 rounded-full text-[#94a3b8] hover:text-white hover:bg-[#353534] transition-colors shrink-0 border border-white/5 flex items-center gap-2"
                >
                  <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#ddb7ff]' : ''}`} />
                </button>

                <label className="sr-only" htmlFor="market-sort">Sort markets</label>
                <select
                  id="market-sort"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as MarketSort)}
                  className="min-h-[42px] rounded-full border border-white/5 bg-[#1c1b1b] px-3 text-xs text-[#94a3b8] outline-none transition-colors focus:border-[#ddb7ff]/50 focus:text-white"
                >
                  <option value="closingSoon">Closing soon</option>
                  <option value="liquidity">Most liquidity</option>
                  <option value="newest">Newest</option>
                </select>
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
          {filteredMarkets.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-12 h-12 rounded-xl bg-[#0f172a] border border-[#1e293b] flex items-center justify-center mb-4">
                <div className="w-2 h-2 rounded-full bg-[#ddb7ff] animate-pulse" />
              </div>
              <p className="font-[family-name:var(--font-hanken)] text-lg font-semibold text-[#94a3b8]">
                {markets.length === 0 ? 'AI agents are generating markets...' : 'No markets match this view'}
              </p>
              <p className="text-sm text-[#94a3b8]/60 mt-2">
                {markets.length === 0 ? 'Check back shortly or trigger market generation.' : 'Try another status, category, or search term.'}
              </p>
              {markets.length > 0 && (
                <button
                  onClick={() => {
                    setSelectedView('all');
                    setSelectedCategory('All Markets');
                    setSelectedTimeframe(null);
                    setSearchQuery('');
                  }}
                  className="mt-3 min-h-[44px] rounded-full border border-[#ddb7ff]/30 px-4 text-xs font-semibold text-[#ddb7ff] transition-colors hover:bg-[#ddb7ff]/10"
                >
                  Clear market filters
                </button>
              )}
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
