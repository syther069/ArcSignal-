'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Footer from '@/components/layout/Footer';
import { MarketCard } from '@/components/markets/MarketCard';
import { StakeModal } from '@/components/markets/StakeModal';
import { Market, StakeSide } from '@/types';
import { Plus, Filter, ChevronDown, Calendar, Users, TrendingUp } from 'lucide-react';

interface MarketsClientProps {
  initialMarkets: Market[];
}

export default function MarketsClient({ initialMarkets }: MarketsClientProps) {
  const [filter, setFilter] = useState('all');
  const [stakeModal, setStakeModal] = useState<{
    market: Market;
    side: StakeSide;
  } | null>(null);

  const categories = [
    { id: 'all', label: 'All Markets' },
    { id: 'crypto', label: 'Crypto' },
    { id: 'tech', label: 'Tech' },
    { id: 'sports', label: 'Sports' },
    { id: 'macro', label: 'Macro' },
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

        {/* Markets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Featured Market (Spans 2 columns) */}
          <div className="md:col-span-2 bg-surface-container rounded-xl border border-white/5 p-1 top-lit-border shadow-lg flex flex-col md:flex-row">
            <div className="w-full md:w-2/5 h-48 md:h-auto rounded-lg bg-surface-container-highest relative overflow-hidden">
              <div className="absolute inset-0 network-mesh opacity-30"></div>
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent"></div>
            </div>
            
            <div className="p-6 w-full md:w-3/5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Crypto Infrastructure</span>
                    <span className="text-[10px] font-mono text-on-surface-variant">• ID: ARC-993</span>
                  </div>
                  <span className="text-[10px] bg-tertiary/20 text-tertiary px-2 py-0.5 rounded font-bold uppercase tracking-widest flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Trending
                  </span>
                </div>
                <h3 className="text-xl font-bold text-on-surface mb-6 leading-snug">
                  Will ETH transition to a fully stateless client architecture by Q3 2025?
                </h3>
              </div>

              <div>
                <div className="grid grid-cols-3 gap-4 mb-6 border-b border-white/10 pb-6">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Confidence Interval</p>
                    <p className="text-2xl font-mono text-tertiary font-bold">84.2%</p>
                    <p className="text-[10px] font-mono text-tertiary font-bold">± 1.2%</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Staking Volume</p>
                    <p className="text-2xl font-mono text-on-surface font-bold">$12.4M</p>
                    <p className="text-[10px] font-mono text-on-surface-variant font-bold">TVL</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Market Expiry</p>
                    <p className="text-sm font-mono text-on-surface font-bold">30 Sep 2025</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 border-2 border-surface-container flex items-center justify-center text-xs font-bold text-primary">A</div>
                    <div className="w-8 h-8 rounded-full bg-tertiary/20 border-2 border-surface-container flex items-center justify-center text-xs font-bold text-tertiary">B</div>
                    <div className="w-8 h-8 rounded-full bg-surface-container-highest border-2 border-surface-container flex items-center justify-center text-[10px] font-bold text-on-surface-variant">+1.2k</div>
                  </div>
                  <button className="bg-primary-fixed text-on-primary-fixed hover:bg-primary-fixed-dim px-6 py-2.5 rounded font-bold text-sm transition-colors shadow-[0_0_15px_rgba(225,224,255,0.2)]">
                    Analyze & Stake
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Standard Market Cards */}
          {[
            { cat: 'Macro Economics', title: 'FED interest rate adjustment exceeding 50bps in Q4?', prob: 24.5, liq: '450k', days: '14h 22m' },
            { cat: 'Consumer Tech', title: 'Autonomous Vehicle Level 4 certification for Tesla in EU?', prob: 12.1, liq: '2.1M', days: '82 Days' },
            { cat: 'Space Exploration', title: 'Success rate of Starship IFT-7 booster recovery on first attempt?', prob: 68.9, liq: '980k', days: '12 Days' },
            { cat: 'AI Safety', title: 'OpenAI next model parameters exceed 2T?', prob: null, liq: '3.4M', days: '5 Days', isAi: true }
          ].map((market, i) => (
            <div key={i} className={`bg-surface-container rounded-xl border border-white/5 p-6 top-lit-border shadow-lg flex flex-col justify-between ${market.isAi ? 'border-l-4 border-l-tertiary' : ''}`}>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{market.cat}</span>
                  {market.isAi && <span className="text-[10px] bg-tertiary/20 text-tertiary px-2 py-0.5 rounded font-bold uppercase tracking-widest flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></div> Live Feed</span>}
                  {!market.isAi && <span className="text-on-surface-variant font-bold text-lg leading-none pb-2">...</span>}
                </div>
                <h3 className="text-base font-bold text-on-surface mb-6 leading-snug h-12">
                  {market.title}
                </h3>
              </div>

              {market.isAi ? (
                <div>
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">
                    <span>Lower Bound</span>
                    <span>Upper Bound</span>
                  </div>
                  <div className="flex justify-between text-lg font-mono text-on-surface font-bold mb-4">
                    <span>1.85T</span>
                    <span>2.41T</span>
                  </div>
                  <div className="w-full h-8 bg-surface-container-highest rounded mb-2 relative overflow-hidden">
                    <div className="absolute left-1/4 right-1/4 top-0 bottom-0 bg-tertiary/20 border-l border-r border-tertiary/50"></div>
                    <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-tertiary shadow-[0_0_8px_rgba(78,222,163,1)]"></div>
                  </div>
                  <p className="text-[10px] text-tertiary font-mono text-center italic mb-6">Current Estimate: 2.12T</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button className="bg-surface-container-highest hover:bg-surface-bright text-on-surface py-2 rounded font-bold text-sm transition-colors border border-white/5">
                      YES
                    </button>
                    <button className="bg-surface-container-highest hover:bg-surface-bright text-on-surface py-2 rounded font-bold text-sm transition-colors border border-white/5">
                      NO
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Probability</span>
                    <span className="text-lg font-mono text-tertiary font-bold">{market.prob}%</span>
                  </div>
                  <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden mb-6">
                    <div className="h-full bg-primary" style={{ width: `${market.prob}%` }}></div>
                  </div>

                  <div className="flex justify-between items-center mb-6 text-sm">
                    <span className="text-on-surface-variant">Liquidity</span>
                    <span className="font-mono text-on-surface font-bold">${market.liq}</span>
                  </div>
                  
                  <div className="flex justify-between items-center mb-8 text-sm">
                    <span className="text-on-surface-variant">Ends In</span>
                    <span className="font-mono text-on-surface font-bold">{market.days}</span>
                  </div>

                  <button className="w-full bg-surface-container-highest hover:bg-surface-bright text-on-surface py-3 rounded font-bold text-sm transition-colors border border-white/5">
                    Place Bet
                  </button>
                </div>
              )}
            </div>
          ))}

        </div>

        <div className="mt-12 flex justify-center">
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 flex items-center justify-center rounded bg-surface-container border border-white/5 text-on-surface-variant hover:text-on-surface">&lt;</button>
            <button className="w-8 h-8 flex items-center justify-center rounded bg-primary-fixed text-on-primary-fixed font-bold">1</button>
            <button className="w-8 h-8 flex items-center justify-center rounded bg-surface-container border border-white/5 text-on-surface hover:bg-surface-container-highest">2</button>
            <button className="w-8 h-8 flex items-center justify-center rounded bg-surface-container border border-white/5 text-on-surface hover:bg-surface-container-highest">3</button>
            <span className="text-on-surface-variant">...</span>
            <button className="w-8 h-8 flex items-center justify-center rounded bg-surface-container border border-white/5 text-on-surface hover:bg-surface-container-highest">12</button>
            <button className="w-8 h-8 flex items-center justify-center rounded bg-surface-container border border-white/5 text-on-surface-variant hover:text-on-surface">&gt;</button>
          </div>
        </div>

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
