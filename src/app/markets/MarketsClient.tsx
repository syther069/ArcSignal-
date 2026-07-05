'use client';

import React, { useMemo, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Footer from '@/components/layout/Footer';
import { MarketCard } from '@/components/markets/MarketCard';
import { StakeModal } from '@/components/markets/StakeModal';
import { Market, StakeSide } from '@/types';
import type { SerializableMarket } from '@/lib/markets';
import { toUiMarket } from '@/lib/ui-market';
import { Plus, Filter, ChevronDown } from 'lucide-react';

interface MarketsClientProps {
  markets: SerializableMarket[];
}

export default function MarketsClient({ markets }: MarketsClientProps) {
  const [filter, setFilter] = useState('all');
  const [stakeModal, setStakeModal] = useState<{
    market: Market;
    side: StakeSide;
  } | null>(null);

  const filteredMarkets = useMemo(() => {
    if (filter === 'all') return markets;
    return markets.filter((market) => market.category.toLowerCase() === filter);
  }, [filter, markets]);

  const categories = [
    { id: 'all',      label: 'All Markets' },
    { id: 'crypto',   label: 'Crypto' },
    { id: 'football', label: 'Football' },
  ];

  return (
    <div className="flex min-h-screen bg-[#131313]">
      <Sidebar />

      <main className="lg:ml-[264px] pt-24 pb-24 md:pb-8 flex-1 min-w-0 min-h-screen">\n        <div className="max-w-[1440px] mx-auto w-full p-6 lg:p-8">
        {/* Page header */}
        <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-hanken)] text-4xl font-bold text-white tracking-tight mb-2">
              Markets Explorer
            </h1>
            <p className="text-sm text-[#94a3b8] max-w-2xl">
              Deploying deep-learning analytics to forecast global events.{' '}
              Transparent staking, immutable outcomes.
            </p>
          </div>
          <button className="flex items-center gap-2 bg-[#ddb7ff]/10 hover:bg-[#ddb7ff]/20 text-[#ddb7ff] py-2.5 px-4 rounded-lg font-[family-name:var(--font-jetbrains-mono)] text-xs font-semibold uppercase tracking-wider transition-colors border border-[#ddb7ff]/25 shrink-0">
            <Plus className="w-4 h-4" />
            Create Market
          </button>
        </header>

        {/* Filters + Sort */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          {/* Category tabs */}
          <div className="inline-flex items-center gap-1 bg-[#0f172a] border border-[#1e293b] rounded-xl p-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilter(cat.id)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-lg text-xs font-[family-name:var(--font-jetbrains-mono)] font-semibold uppercase tracking-wider transition-all ${
                  filter === cat.id
                    ? 'bg-[#ddb7ff]/10 text-[#ddb7ff] border border-[#ddb7ff]/25'
                    : 'text-[#94a3b8] hover:text-[#e5e2e1] border border-transparent'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button className="flex items-center justify-between w-48 bg-[#0f172a] border border-[#1e293b] px-4 py-2 rounded-lg text-xs font-[family-name:var(--font-jetbrains-mono)] text-[#94a3b8] hover:border-[#ddb7ff]/30 transition-colors">
              <span>Volume: Highest first</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            <button className="bg-[#0f172a] border border-[#1e293b] p-2 rounded-lg text-[#94a3b8] hover:text-[#ddb7ff] hover:border-[#ddb7ff]/30 transition-colors">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Market grid */}
        {markets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#0f172a] border border-[#1e293b] flex items-center justify-center mb-4">
              <div className="w-2 h-2 rounded-full bg-[#ddb7ff] animate-pulse-dot" />
            </div>
            <p className="font-[family-name:var(--font-hanken)] text-lg font-semibold text-[#94a3b8]">
              AI agents are generating markets...
            </p>
            <p className="text-sm text-[#94a3b8]/60 mt-2">
              Check back shortly or trigger market generation.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMarkets.map((market) => (
              <MarketCard
                key={market.marketId}
                market={market}
                onFollow={() => setStakeModal({ market: toUiMarket(market), side: 0 })}
                onFade={() => setStakeModal({ market: toUiMarket(market), side: 1 })}
              />
            ))}
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
