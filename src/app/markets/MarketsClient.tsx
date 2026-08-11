'use client';

import React, { useMemo, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { MarketRow } from '@/components/markets/MarketRow';
import { MarketFiltersDrawer, type MarketView, type MarketSort } from '@/components/markets/MarketFiltersDrawer';
import { StakeModal } from '@/components/markets/StakeModal';
import { Market, StakeSide } from '@/types';
import type { SerializableMarket } from '@/lib/markets';
import { toUiMarket } from '@/lib/ui-market';
import {
  RotateCw,
  Search,
  SlidersHorizontal,
  Flame,
  Clock,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

interface MarketsClientProps {
  markets: SerializableMarket[];
}

const TIMEFRAMES = ['5m', '15m', '1h', '4h', '24h'];

function getTotalLiquidity(market: SerializableMarket): bigint {
  try {
    return BigInt(market.followPool) + BigInt(market.fadePool);
  } catch {
    return 0n;
  }
}

function getFollowShare(market: SerializableMarket): number {
  const follow = BigInt(market.followPool || '0');
  const fade = BigInt(market.fadePool || '0');
  const total = follow + fade;
  if (total === 0n) return 50;
  return Number((follow * 1000n) / total) / 10;
}

export default function MarketsClient({ markets }: MarketsClientProps) {
  const [selectedCategory, setSelectedCategory] = useState('All Markets');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<MarketView>('live');
  const [sortBy, setSortBy] = useState<MarketSort>('closingSoon');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [stakeModal, setStakeModal] = useState<{
    market: Market;
    side: StakeSide;
  } | null>(null);

  const nowUnix = Math.floor(Date.now() / 1000);

  const handleRefresh = () => {
    setIsRefreshing(true);
    window.location.reload();
  };

  const handleResetFilters = () => {
    setSelectedCategory('All Markets');
    setSelectedTimeframe(null);
    setSelectedView('live');
    setSortBy('closingSoon');
    setSearchQuery('');
  };

  // Counts for tabs & drawers
  const counts = useMemo(() => {
    const live = markets.filter(
      (m) => !m.resolved && m.status !== 'RESOLVED' && m.status !== 'CLOSED' && m.resolutionTime > nowUnix
    ).length;
    const closingSoon = markets.filter(
      (m) => !m.resolved && m.resolutionTime > nowUnix && m.resolutionTime - nowUnix <= 3600
    ).length;
    const resolved = markets.filter((m) => m.resolved || m.status === 'RESOLVED').length;
    return {
      live,
      closingSoon,
      resolved,
      all: markets.length,
    };
  }, [markets, nowUnix]);

  // Primary filtering logic
  const filteredMarkets = useMemo(() => {
    return markets.filter((m) => {
      const isResolved = m.resolved || m.status === 'RESOLVED';
      const isPending = !isResolved && (m.status === 'PENDING_RESOLUTION' || m.resolutionTime <= nowUnix);
      const isOpen = !isResolved && !isPending && m.status !== 'CLOSED';
      const isClosingSoon = isOpen && m.resolutionTime - nowUnix <= 3600;

      // 1. View / Status Filter
      if (selectedView === 'live' && !isOpen) return false;
      if (selectedView === 'closingSoon' && !isClosingSoon) return false;
      if (selectedView === 'resolved' && !isResolved) return false;

      // 2. Category Filter
      if (selectedCategory === 'Crypto' && m.category !== 'CRYPTO') return false;
      if (selectedCategory === 'Football' && m.category !== 'FOOTBALL') return false;

      // 3. Timeframe Filter
      if (selectedTimeframe && !m.marketId.includes(`-PRICE-${selectedTimeframe}-`)) return false;

      // 4. Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesQuestion = (m.question || '').toLowerCase().includes(q);
        const matchesId = m.marketId.toLowerCase().includes(q);
        const matchesCat = m.category.toLowerCase().includes(q);
        if (!matchesQuestion && !matchesId && !matchesCat) return false;
      }

      return true;
    });
  }, [markets, selectedView, selectedCategory, selectedTimeframe, searchQuery, nowUnix]);

  // Sorting logic implementing all 7 financial sort modes
  const sortedMarkets = useMemo(() => {
    return [...filteredMarkets].sort((a, b) => {
      if (sortBy === 'liquidity') {
        const diff = getTotalLiquidity(b) - getTotalLiquidity(a);
        return diff > 0n ? 1 : diff < 0n ? -1 : 0;
      }

      if (sortBy === 'active') {
        const diff = getTotalLiquidity(b) - getTotalLiquidity(a);
        if (diff !== 0n) return diff > 0n ? 1 : -1;
        return (b.analysis?.confidence ?? 0) - (a.analysis?.confidence ?? 0);
      }

      if (sortBy === 'newest') {
        return (b.openedAt || b.resolutionTime) - (a.openedAt || a.resolutionTime);
      }

      if (sortBy === 'confidence') {
        return (b.analysis?.confidence ?? 0) - (a.analysis?.confidence ?? 0);
      }

      if (sortBy === 'disagreement') {
        const followA = getFollowShare(a);
        const followB = getFollowShare(b);
        const aiConfA = a.analysis?.confidence ?? 50;
        const aiConfB = b.analysis?.confidence ?? 50;
        const disA = Math.abs(aiConfA - followA);
        const disB = Math.abs(aiConfB - followB);
        return disB - disA;
      }

      if (sortBy === 'imbalance') {
        const followA = getFollowShare(a);
        const followB = getFollowShare(b);
        const imbA = Math.abs(followA - (100 - followA));
        const imbB = Math.abs(followB - (100 - followB));
        return imbB - imbA;
      }

      // Default: 'closingSoon'
      return a.resolutionTime - b.resolutionTime;
    });
  }, [filteredMarkets, sortBy]);

  // Featured / Trending markets (Top 2 high conviction or active markets)
  const trendingMarkets = useMemo(() => {
    return markets
      .filter((m) => !m.resolved && m.resolutionTime > nowUnix)
      .sort((a, b) => {
        const diff = getTotalLiquidity(b) - getTotalLiquidity(a);
        if (diff !== 0n) return diff > 0n ? 1 : -1;
        return (b.analysis?.confidence ?? 0) - (a.analysis?.confidence ?? 0);
      })
      .slice(0, 2);
  }, [markets, nowUnix]);

  // Contextual empty state message
  const emptyStateContent = useMemo(() => {
    if (searchQuery.trim() || selectedTimeframe || selectedCategory !== 'All Markets') {
      return {
        title: 'No markets found',
        message: 'No markets match your active filters or search query — try changing your filters.',
      };
    }
    if (selectedView === 'closingSoon') {
      return {
        title: 'No markets closing soon',
        message: 'No prediction markets are expiring in the next hour — check all active markets.',
      };
    }
    if (selectedView === 'live') {
      return {
        title: 'No active markets',
        message: 'No open prediction markets right now — new markets will appear here soon.',
      };
    }
    if (selectedView === 'resolved') {
      return {
        title: 'No resolved markets yet',
        message: 'Settled prediction markets and outcome claims will be archived here.',
      };
    }
    return {
      title: 'No markets available',
      message: 'AI agents are generating markets. Check back shortly.',
    };
  }, [searchQuery, selectedTimeframe, selectedCategory, selectedView]);

  return (
    <div className="flex min-h-screen bg-[#121212] text-[#e5e2e1]">
      <Sidebar />

      <main className="lg:ml-[264px] pt-20 pb-20 md:pb-12 flex-1 min-w-0 min-h-screen">
        <div className="max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-6">

          {/* ── 1. PAGE HEADER & BENCHMARK TAGLINE ── */}
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-4 border-b border-white/[0.06] pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1.5 font-mono text-[10px] tracking-[0.08em]">
                <span className="inline-flex items-center gap-1 rounded-md bg-[#ddb7ff]/10 px-2 py-0.5 font-bold text-[#ddb7ff] border border-[#ddb7ff]/20">
                  <ShieldCheck size={12} /> ON-CHAIN VERIFIED
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-[#c0c1ff]/10 px-2 py-0.5 font-bold text-[#c0c1ff] border border-[#c0c1ff]/20">
                  <Zap size={12} /> LIVE ODDS
                </span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-[-0.025em] leading-tight">
                Markets
              </h1>
              <p className="font-sans text-sm sm:text-base text-[#94a3b8] mt-1 max-w-2xl leading-relaxed">
                Discover live AI prediction markets, compare market-implied conviction, and make your call.
              </p>
            </div>

            {/* Live Stats Pill Group */}
            <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-[#94a3b8]">
              <span className="rounded-lg border border-white/[0.08] bg-[#1a1a1a] px-3 py-1.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#ddb7ff] animate-pulse" />
                <strong className="text-white tabular-nums">{counts.live}</strong> Open
              </span>
              <span className="rounded-lg border border-white/[0.08] bg-[#1a1a1a] px-3 py-1.5 flex items-center gap-1.5">
                <Clock size={12} className="text-[#fbbf24]" />
                <strong className="text-[#fbbf24] tabular-nums">{counts.closingSoon}</strong> Closing Soon
              </span>
              <span className="rounded-lg border border-white/[0.08] bg-[#1a1a1a] px-3 py-1.5">
                <strong className="text-[#ddb7ff] tabular-nums">{counts.resolved}</strong> Settled
              </span>
            </div>
          </header>

          {/* ── 2. TRENDING / SPOTLIGHT STRIP (Compact 2-card ticker) ── */}
          {trendingMarkets.length > 0 && selectedView !== 'resolved' && !searchQuery && (
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-[0.08em] text-[#ddb7ff]">
                  <Flame size={14} className="text-[#fb7185]" />
                  <span>Trending & High Conviction</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {trendingMarkets.map((m) => {
                  const follow = getFollowShare(m);
                  const total = getTotalLiquidity(m);
                  const totalFormatted = (Number(total) / 1_000_000).toFixed(2);
                  return (
                    <Link
                      key={m.marketId}
                      href={`/market/${m.marketId}`}
                      className="group flex items-center justify-between p-3.5 rounded-xl border border-[#ddb7ff]/[0.12] bg-gradient-to-br from-[#ddb7ff]/[0.06] to-[#171717] hover:border-[#ddb7ff]/40 hover:bg-[#1c1b1c] transition-all duration-150 gap-3 shadow-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 font-mono text-[9px] tracking-wide">
                          <span className="rounded px-1.5 py-0.5 font-bold text-[#ddb7ff] bg-[#ddb7ff]/10">
                            {m.category}
                          </span>
                          <span className="text-[#94a3b8] tabular-nums">
                            {totalFormatted} USDC Pool
                          </span>
                        </div>
                        <h3 className="font-display text-[13px] sm:text-sm font-semibold text-white tracking-[-0.015em] truncate group-hover:text-[#ead7ff] transition-colors leading-snug">
                          {m.question || m.marketId}
                        </h3>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right font-mono">
                          <div className="text-[12px] font-bold text-[#ddb7ff] tabular-nums tracking-tight">
                            {follow.toFixed(0)}% Follow
                          </div>
                          <div className="text-[10px] text-[#94a3b8] tracking-tight">
                            AI {m.analysis?.prediction || 'YES'} · <span className="tabular-nums">{m.analysis?.confidence ?? 0}%</span>
                          </div>
                        </div>
                        <ArrowRight size={14} className="text-[#94a3b8] group-hover:text-[#ddb7ff] group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── 3. UNIFIED TOP NAVIGATION & CONTROLS ROW ── */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#161616] p-3 sm:p-4 space-y-3 shadow-md sticky top-20 z-20 backdrop-blur-md">
            
            {/* Top Control Bar: Views + Search + Sort + Refresh */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              
              {/* Primary View / Lifecycle Tabs */}
              <div className="flex items-center gap-1 bg-[#101010] rounded-xl p-1 border border-white/[0.06] overflow-x-auto shrink-0 scrollbar-none">
                {(
                  [
                    ['live', 'Active Markets'],
                    ['closingSoon', 'Closing Soon'],
                    ['resolved', 'Resolved'],
                    ['all', 'All'],
                  ] as const
                ).map(([view, label]) => (
                  <button
                    key={view}
                    onClick={() => setSelectedView(view)}
                    aria-pressed={selectedView === view}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-lg font-sans text-xs font-semibold tracking-[-0.01em] transition-all ${
                      selectedView === view
                        ? 'bg-[#2f2f2f] text-white shadow-sm border border-white/[0.08]'
                        : 'text-[#94a3b8] hover:text-white'
                    }`}
                  >
                    {label}{' '}
                    <span className="font-mono text-[10px] opacity-70 tabular-nums">
                      ({counts[view]})
                    </span>
                  </button>
                ))}
              </div>

              {/* Search Bar + Controls */}
              <div className="flex items-center gap-2 flex-1 lg:max-w-md justify-end">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
                  <input
                    type="text"
                    placeholder="Search markets, assets, questions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#101010] text-white font-sans text-xs pl-8 pr-7 py-2 rounded-xl border border-white/[0.08] focus:outline-none focus:border-[#ddb7ff]/60 transition-colors placeholder:text-[#64748b]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#94a3b8] hover:text-white font-mono"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Sort Dropdown (Desktop) */}
                <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                  <label htmlFor="market-sort-select" className="sr-only">
                    Sort markets
                  </label>
                  <select
                    id="market-sort-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as MarketSort)}
                    className="bg-[#101010] font-sans text-xs text-[#cbd5e1] font-medium py-2 px-3 rounded-xl border border-white/[0.08] outline-none focus:border-[#ddb7ff]/60 transition-colors cursor-pointer"
                  >
                    <option value="closingSoon">Sort: Closing soon</option>
                    <option value="liquidity">Sort: Most liquidity</option>
                    <option value="active">Sort: Most active</option>
                    <option value="newest">Sort: Newest</option>
                    <option value="confidence">Sort: Highest AI confidence</option>
                    <option value="disagreement">Sort: Largest AI disagreement</option>
                    <option value="imbalance">Sort: Largest Follow/Fade imbalance</option>
                  </select>
                </div>

                {/* Refresh Button */}
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  title="Refresh live on-chain market data"
                  className="bg-[#101010] p-2 rounded-xl text-[#94a3b8] hover:text-white hover:bg-[#202020] transition-colors border border-white/[0.08] shrink-0"
                >
                  <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#ddb7ff]' : ''}`} />
                </button>

                {/* Mobile Filter Drawer Button */}
                <button
                  onClick={() => setIsDrawerOpen(true)}
                  className="sm:hidden bg-[#101010] p-2 rounded-xl text-[#94a3b8] hover:text-white border border-white/[0.08] flex items-center gap-1 font-sans text-xs"
                >
                  <SlidersHorizontal size={14} className="text-[#ddb7ff]" />
                </button>
              </div>

            </div>

            {/* Secondary Bar: Category Pills + Timeframe Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/[0.04]">
              
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 font-sans">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#64748b] mr-1">
                  Category:
                </span>
                {['All Markets', 'Crypto', 'Football'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      if (cat === 'Football') setSelectedTimeframe(null);
                    }}
                    aria-pressed={selectedCategory === cat}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      selectedCategory === cat
                        ? 'bg-[#ddb7ff] text-[#131313] shadow-sm'
                        : 'bg-[#101010] border border-white/[0.06] text-[#94a3b8] hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Crypto Timeframe Filter Pills */}
              {selectedCategory !== 'Football' && (
                <div className="flex items-center gap-1.5 font-mono text-xs">
                  <span className="text-[10px] uppercase tracking-wider text-[#64748b] mr-1 font-mono">
                    Timeframe:
                  </span>
                  <button
                    onClick={() => setSelectedTimeframe(null)}
                    aria-pressed={selectedTimeframe === null}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      selectedTimeframe === null
                        ? 'bg-[#2f2f2f] text-white border border-white/[0.1]'
                        : 'bg-[#101010] border border-white/[0.06] text-[#94a3b8] hover:text-white'
                    }`}
                  >
                    All
                  </button>
                  {TIMEFRAMES.map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setSelectedTimeframe(selectedTimeframe === tf ? null : tf)}
                      aria-pressed={selectedTimeframe === tf}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                        selectedTimeframe === tf
                          ? 'bg-[#ddb7ff]/20 text-[#ddb7ff] border border-[#ddb7ff]/50'
                          : 'bg-[#101010] border border-white/[0.06] text-[#94a3b8] hover:text-white'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              )}

            </div>
          </div>

          {/* ── 4. DENSE MARKET ROWS LIST (6–10 per screen density) ── */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between px-1 font-sans">
              <span className="text-xs text-[#94a3b8]">
                Showing <strong className="text-white font-mono tabular-nums">{sortedMarkets.length}</strong> market{sortedMarkets.length !== 1 ? 's' : ''}
              </span>
              <span className="text-[11px] text-[#64748b]">
                Click any row for deep research & settlement rules
              </span>
            </div>

            {sortedMarkets.length > 0 ? (
              <div className="space-y-2">
                {sortedMarkets.map((market) => (
                  <MarketRow
                    key={market.marketId}
                    market={market}
                    onFollow={() => setStakeModal({ market: toUiMarket(market), side: 0 })}
                    onFade={() => setStakeModal({ market: toUiMarket(market), side: 1 })}
                  />
                ))}
              </div>
            ) : (
              /* Differentiated Contextual Empty States */
              <div className="rounded-2xl border border-white/[0.08] bg-[#161616] p-12 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#202020] border border-white/[0.08] flex items-center justify-center text-[#ddb7ff]">
                  <Search size={20} />
                </div>
                <h3 className="font-display text-lg font-bold text-white tracking-tight">
                  {emptyStateContent.title}
                </h3>
                <p className="font-sans text-xs text-[#94a3b8] max-w-md leading-relaxed">
                  {emptyStateContent.message}
                </p>
                <div className="pt-2">
                  <button
                    onClick={handleResetFilters}
                    className="px-4 py-2 rounded-xl bg-[#ddb7ff] text-[#131313] font-sans text-xs font-bold hover:bg-[#ead7ff] transition-all shadow-md"
                  >
                    Clear All Filters
                  </button>
                </div>
                <p className="font-sans text-[10px] text-[#64748b] pt-2">
                  Prediction markets are deployed continuously by autonomous AI analyst agents.
                </p>
              </div>
            )}
          </section>

        </div>
      </main>

      {/* Responsive Mobile Filters Drawer */}
      <MarketFiltersDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        selectedView={selectedView}
        onSelectView={setSelectedView}
        selectedTimeframe={selectedTimeframe}
        onSelectTimeframe={setSelectedTimeframe}
        sortBy={sortBy}
        onSelectSort={setSortBy}
        onReset={handleResetFilters}
        counts={counts}
      />

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
