'use client';

import React from 'react';
import { X, SlidersHorizontal, Check, RefreshCw } from 'lucide-react';

export type MarketView = 'live' | 'closingSoon' | 'resolved' | 'all';
export type MarketSort =
  | 'closingSoon'
  | 'liquidity'
  | 'active'
  | 'newest'
  | 'confidence'
  | 'disagreement'
  | 'imbalance';

interface MarketFiltersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  selectedView: MarketView;
  onSelectView: (view: MarketView) => void;
  selectedTimeframe: string | null;
  onSelectTimeframe: (tf: string | null) => void;
  sortBy: MarketSort;
  onSelectSort: (sort: MarketSort) => void;
  onReset: () => void;
  counts: {
    live: number;
    closingSoon: number;
    resolved: number;
    all: number;
  };
}

const CATEGORIES = ['All Markets', 'Crypto', 'Football'];
const TIMEFRAMES = ['5m', '15m', '1h', '4h', '24h'];

const SORT_OPTIONS: { value: MarketSort; label: string; desc: string }[] = [
  { value: 'closingSoon', label: 'Closing soon', desc: 'Sort by nearest resolution time' },
  { value: 'liquidity', label: 'Most liquidity', desc: 'Highest pool volume (USDC)' },
  { value: 'active', label: 'Most active', desc: 'Markets with dynamic pool shifts' },
  { value: 'newest', label: 'Newest', desc: 'Recently deployed prediction markets' },
  { value: 'confidence', label: 'Highest AI confidence', desc: 'Strongest predictive signal' },
  { value: 'disagreement', label: 'Largest AI disagreement', desc: 'High difference between AI & crowd odds' },
  { value: 'imbalance', label: 'Largest Follow/Fade imbalance', desc: 'Most skewed betting pools' },
];

export function MarketFiltersDrawer({
  isOpen,
  onClose,
  selectedCategory,
  onSelectCategory,
  selectedView,
  onSelectView,
  selectedTimeframe,
  onSelectTimeframe,
  sortBy,
  onSelectSort,
  onReset,
  counts,
}: MarketFiltersDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm lg:hidden animate-in fade-in duration-200">
      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer content */}
      <div className="relative w-full max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-white/[0.12] bg-[#141414] p-6 shadow-2xl flex flex-col gap-6 animate-in slide-in-from-bottom duration-300">
        
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-[#ddb7ff]" />
            <h3 className="font-[family-name:var(--font-hanken)] text-lg font-bold text-white">
              Market Filters & Sorting
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-[#94a3b8] hover:bg-white/[0.06] hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Category section */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">
            Category
          </label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => onSelectCategory(cat)}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#ddb7ff] text-[#131313] shadow-md'
                    : 'bg-[#1c1b1b] border border-white/[0.06] text-[#94a3b8] hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Lifecycle status section */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">
            Market Status
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['live', 'Active Markets', counts.live],
                ['closingSoon', 'Closing Soon', counts.closingSoon],
                ['resolved', 'Resolved', counts.resolved],
                ['all', 'All Markets', counts.all],
              ] as const
            ).map(([view, label, count]) => (
              <button
                key={view}
                onClick={() => onSelectView(view)}
                className={`flex items-center justify-between py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                  selectedView === view
                    ? 'bg-[#353534] text-white border border-[#ddb7ff]/40 shadow-sm'
                    : 'bg-[#1c1b1b] border border-white/[0.06] text-[#94a3b8] hover:text-white'
                }`}
              >
                <span>{label}</span>
                <span className="text-[11px] opacity-70">({count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Timeframe section */}
        {selectedCategory !== 'Football' && (
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">
              Crypto Timeframe
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onSelectTimeframe(null)}
                className={`py-2 px-4 rounded-xl text-xs font-semibold transition-all ${
                  selectedTimeframe === null
                    ? 'bg-[#353534] text-white border border-[#ddb7ff]/40'
                    : 'bg-[#1c1b1b] border border-white/[0.06] text-[#94a3b8]'
                }`}
              >
                All Timeframes
              </button>
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  onClick={() => onSelectTimeframe(selectedTimeframe === tf ? null : tf)}
                  className={`py-2 px-3.5 rounded-xl text-xs font-semibold transition-all ${
                    selectedTimeframe === tf
                      ? 'bg-[#ddb7ff]/20 text-[#ddb7ff] border border-[#ddb7ff]/60'
                      : 'bg-[#1c1b1b] border border-white/[0.06] text-[#94a3b8]'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sort by section */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">
            Sort By
          </label>
          <div className="space-y-1.5">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onSelectSort(opt.value)}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-left text-xs transition-all ${
                  sortBy === opt.value
                    ? 'bg-[#ddb7ff]/10 border border-[#ddb7ff]/40 text-white'
                    : 'bg-[#1c1b1b] border border-white/[0.05] text-[#94a3b8] hover:text-white'
                }`}
              >
                <div>
                  <p className="font-semibold text-white">{opt.label}</p>
                  <p className="text-[10px] text-[#94a3b8]">{opt.desc}</p>
                </div>
                {sortBy === opt.value && (
                  <Check size={16} className="text-[#ddb7ff] shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Drawer footer action buttons */}
        <div className="flex items-center gap-3 pt-2 border-t border-white/[0.08]">
          <button
            onClick={() => {
              onReset();
              onClose();
            }}
            className="flex-1 py-3 px-4 rounded-xl border border-white/[0.1] bg-white/[0.05] text-xs font-semibold text-[#cbd5e1] hover:bg-white/[0.1] flex items-center justify-center gap-2"
          >
            <RefreshCw size={14} />
            <span>Reset All</span>
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl bg-[#ddb7ff] text-[#131313] text-xs font-bold hover:bg-[#ead7ff] shadow-lg flex items-center justify-center"
          >
            Apply Filters
          </button>
        </div>

      </div>
    </div>
  );
}
