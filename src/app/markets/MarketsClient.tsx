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

  const uiMarkets = useMemo(() => markets.map(toUiMarket), [markets]);
  const filteredMarkets = useMemo(() => {
    if (filter === 'all') return uiMarkets;
    return uiMarkets.filter((market) => market.category === filter);
  }, [filter, uiMarkets]);

  const categories = [
    { id: 'all', label: 'All Markets' },
    { id: 'crypto', label: 'Crypto' },
    { id: 'football', label: 'Football' },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="lg:ml-[264px] pt-24 p-8 flex-1 min-w-0 min-h-screen max-w-[1440px] mx-auto w-full">
        <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-on-surface tracking-tight mb-2">Markets Explorer</h1>
            <p className="text-sm text-on-surface-variant max-w-2xl">
              Deploying deep-learning analytics to forecast global events. Transparent staking, immutable outcomes.
            </p>
          </div>
          <button className="flex items-center gap-2 bg-surface-container-high hover:bg-surface-bright text-on-surface py-2.5 px-4 rounded font-medium text-sm transition-colors border border-white/10 shrink-0">
            <Plus className="w-4 h-4" />
            Create Market
          </button>
        </header>

        {/* Filters and Sorting */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilter(cat.id)}
                className={`whitespace-nowrap px-4 py-2 rounded text-sm font-medium transition-colors ${
                  filter === cat.id
                    ? 'bg-primary-fixed text-on-primary-fixed'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button className="flex items-center justify-between w-full md:w-48 bg-surface-container border border-white/5 px-4 py-2 rounded text-sm text-on-surface-variant">
              <span>Volume: Highest first</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            <button className="bg-surface-container border border-white/5 p-2 rounded text-on-surface-variant hover:text-on-surface transition-colors">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>

        {filteredMarkets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <p className="text-zinc-400 text-lg">AI agents are generating markets...</p>
            <p className="text-zinc-600 text-sm mt-2">Check back shortly or trigger market generation.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMarkets.map((market) => (
              <MarketCard
                key={market.id}
                market={market}
                onFollow={() => setStakeModal({ market, side: 0 })}
                onFade={() => setStakeModal({ market, side: 1 })}
              />
            ))}
          </div>
        )}

        <div className="mt-16">
          <Footer />
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
