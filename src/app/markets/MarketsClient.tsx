'use client';

import React, { useState, useMemo } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Footer from '@/components/layout/Footer';
import { MarketCard } from '@/components/markets/MarketCard';
import { StakeModal } from '@/components/markets/StakeModal';
import { Market, StakeSide, CryptoSubType } from '@/types';

type MainTab = 'ALL' | 'FOOTBALL' | 'CRYPTO';
type SortOption = 'NEWEST' | 'CLOSING SOON' | 'MOST STAKED';

interface MarketsClientProps {
  initialMarkets: Market[];
}

export default function MarketsClient({ initialMarkets }: MarketsClientProps) {
  const [mainTab, setMainTab] = useState<MainTab>('ALL');
  const [cryptoFilter, setCryptoFilter] = useState<CryptoSubType | 'ALL'>('ALL');
  const [sortOption, setSortOption] = useState<SortOption>('MOST STAKED');
  
  const [stakeModal, setStakeModal] = useState<{
    market: Market;
    side: StakeSide;
  } | null>(null);

  const filteredAndSortedMarkets = useMemo(() => {
    // 1. Filter by Main Tab
    let result = initialMarkets;
    if (mainTab === 'FOOTBALL') {
      result = result.filter(m => m.category === 'football');
    } else if (mainTab === 'CRYPTO') {
      result = result.filter(m => m.category === 'crypto');
      // 2. Apply Crypto Sub-filter if applicable
      if (cryptoFilter !== 'ALL') {
        result = result.filter(m => m.subType === cryptoFilter);
      }
    }

    // 3. Sort
    result = [...result].sort((a, b) => {
      switch (sortOption) {
        case 'NEWEST':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'CLOSING SOON':
          return a.resolutionTime - b.resolutionTime;
        case 'MOST STAKED':
        default: {
          const aTotal = a.followPool + a.fadePool;
          const bTotal = b.followPool + b.fadePool;
          return bTotal - aTotal;
        }
      }
    });

    return result;
  }, [initialMarkets, mainTab, cryptoFilter, sortOption]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="lg:ml-[264px] pt-28 px-8 pb-12 flex-1 min-w-0 flex flex-col">
        {/* Header Section */}
        <header className="mb-8 flex flex-col gap-6">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-[32px] font-black tracking-tight text-white italic mb-2">
                MARKETS
              </h1>
              <p className="text-slate-400 font-mono text-sm">
                Explore active prediction markets and back AI agents.
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            {/* Main Tabs */}
            <div className="flex bg-[#0f1f38] p-1 rounded-md border border-white/10">
              {(['ALL', 'FOOTBALL', 'CRYPTO'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => {
                    setMainTab(tab);
                    if (tab !== 'CRYPTO') setCryptoFilter('ALL');
                  }}
                  className={`px-6 py-2 text-xs font-bold font-mono tracking-widest rounded transition-all ${
                    mainTab === tab
                      ? 'bg-[#38bdf8] text-[#020817] shadow-[0_0_10px_rgba(56,189,248,0.3)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Sort Dropdown / Options */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase text-slate-500 font-mono tracking-wider">
                SORT BY:
              </span>
              <div className="flex bg-[#0f1f38] p-1 rounded-md border border-white/10">
                {(['NEWEST', 'CLOSING SOON', 'MOST STAKED'] as const).map(sort => (
                  <button
                    key={sort}
                    onClick={() => setSortOption(sort)}
                    className={`px-3 py-1.5 text-[10px] font-bold font-mono tracking-widest rounded transition-all ${
                      sortOption === sort
                        ? 'bg-white/10 text-white'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {sort}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Crypto Sub-filters */}
          {mainTab === 'CRYPTO' && (
            <div className="flex items-center gap-2 pt-2 border-t border-white/5">
              <span className="text-[10px] uppercase text-slate-500 font-mono tracking-wider">
                SUB-CATEGORY:
              </span>
              <div className="flex gap-2">
                {(['ALL', 'price', 'listing', 'onchain'] as const).map(sub => (
                  <button
                    key={sub}
                    onClick={() => setCryptoFilter(sub as CryptoSubType | 'ALL')}
                    className={`px-3 py-1 text-[10px] uppercase tracking-widest font-bold font-mono border rounded transition-all ${
                      cryptoFilter === sub
                        ? 'bg-[#818cf8]/10 border-[#818cf8]/60 text-[#818cf8]'
                        : 'bg-transparent border-white/10 text-slate-500 hover:border-[#818cf8]/30'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          )}
        </header>

        {/* Markets Grid */}
        <div className="flex-1">
          {filteredAndSortedMarkets.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
              {filteredAndSortedMarkets.map((market) => (
                <MarketCard
                  key={market.id}
                  market={market}
                  onFollow={() => setStakeModal({ market, side: 0 })}
                  onFade={() => setStakeModal({ market, side: 1 })}
                />
              ))}
            </div>
          ) : (
            <div className="w-full h-64 border border-white/5 bg-white/[0.02] rounded-lg flex flex-col items-center justify-center gap-4">
              <span className="material-symbols-outlined text-4xl text-slate-600">
                search_off
              </span>
              <p className="text-slate-400 font-mono text-sm">
                No active markets found for these filters.
              </p>
              <button
                onClick={() => {
                  setMainTab('ALL');
                  setCryptoFilter('ALL');
                }}
                className="mt-2 text-[#38bdf8] text-xs font-mono font-bold hover:underline"
              >
                CLEAR FILTERS
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12">
          <Footer />
        </div>
      </main>

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
