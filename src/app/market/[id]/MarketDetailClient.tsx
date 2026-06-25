'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import { StakeModal } from '@/components/markets/StakeModal';
import { Market, StakeSide } from '@/types';
import { useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { ArcSignal_ADDRESS } from '@/lib/usdc';

const ArcSignal_ABI = [
  {
    type: 'function',
    name: 'markets',
    stateMutability: 'view',
    inputs: [{ name: 'marketId', type: 'string' }],
    outputs: [
      { name: 'marketId', type: 'string' },
      { name: 'category', type: 'string' },
      { name: 'resolutionTime', type: 'uint256' },
      { name: 'followPool', type: 'uint256' },
      { name: 'fadePool', type: 'uint256' },
      { name: 'resolved', type: 'bool' },
      { name: 'outcome', type: 'uint8' },
    ],
  },
] as const;

interface MarketDetailClientProps {
  market: Market;
}

export default function MarketDetailClient({ market }: MarketDetailClientProps) {
  const [stakeModalSide, setStakeModalSide] = useState<StakeSide | null>(null);

  // Read live on-chain pool data
  const { data: chainMarket } = useReadContract({
    address: ArcSignal_ADDRESS,
    abi: ArcSignal_ABI,
    functionName: 'markets',
    args: [market.id.toString()],
  });

  const followPool = chainMarket ? parseFloat(formatUnits(chainMarket[3] as bigint, 6)) : market.followPool;
  const fadePool = chainMarket ? parseFloat(formatUnits(chainMarket[4] as bigint, 6)) : market.fadePool;
  const resolved = chainMarket ? (chainMarket[5] as boolean) : market.resolved;

  const totalPool = followPool + fadePool;
  const followPercent = totalPool > 0 ? (followPool / totalPool) * 100 : 0;
  const fadePercent = totalPool > 0 ? (fadePool / totalPool) * 100 : 0;
  const rewardMulti = totalPool > 0 && followPool > 0 ? (totalPool / followPool).toFixed(2) : '—';

  const categoryLabels: string[] = market.category === 'football'
    ? ['TACTICAL ANALYSIS', 'FORM & FITNESS', 'HISTORICAL DATA', 'ODDS MOVEMENT']
    : ['ON-CHAIN METRICS', 'ORDER BOOK FLOW', 'SENTIMENT ANALYSIS', 'MACRO FACTORS'];

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="lg:ml-[264px] pt-24 px-6 md:px-8 pb-16 flex-1 min-w-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-8 font-mono text-sm text-slate-500 flex-wrap">
          <Link href="/markets" className="hover:text-[#38bdf8] transition-colors">Markets</Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="uppercase text-slate-400">{market.category}</span>
          {market.league && (
            <>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="uppercase text-slate-400">{market.league}</span>
            </>
          )}
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-[#38bdf8] font-bold truncate max-w-[300px] md:max-w-[500px]">{market.title}</span>
        </div>

        {/* Hero */}
        <section className="glass-card p-6 md:p-8 mb-8 relative overflow-hidden bg-[#101416]/60 border-[#00dbe9]/20">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
            {market.category === 'football' ? (
              <>
                <div className="flex flex-col items-center md:items-end flex-1">
                  <div className="w-20 h-20 mb-4 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                    <span className="material-symbols-outlined text-4xl text-[#38bdf8]">sports_soccer</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-1 text-center md:text-right">{market.homeTeam}</h2>
                  <span className="font-mono text-xs text-[#38bdf8] tracking-widest uppercase">HOME</span>
                </div>
                <div className="flex flex-col items-center gap-3 px-6 md:px-12 border-x border-white/10">
                  {!market.resolved && (
                    <span className="bg-[#38bdf8]/10 text-[#38bdf8] px-3 py-1 font-mono text-xs rounded tracking-widest border border-[#38bdf8]/20 animate-pulse">LIVE</span>
                  )}
                  <div className="flex items-center gap-6">
                    <span className="text-5xl md:text-6xl font-black text-white">{market.homeScore ?? '—'}</span>
                    <span className="text-2xl text-slate-500 font-bold">:</span>
                    <span className="text-5xl md:text-6xl font-black text-white">{market.awayScore ?? '—'}</span>
                  </div>
                  <span className="font-mono text-xs text-slate-400 tracking-wider">{market.league || 'WORLD CUP 2026'}</span>
                </div>
                <div className="flex flex-col items-center md:items-start flex-1">
                  <div className="w-20 h-20 mb-4 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                    <span className="material-symbols-outlined text-4xl text-slate-400">sports_soccer</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-1 text-center md:text-left">{market.awayTeam}</h2>
                  <span className="font-mono text-xs text-slate-400 tracking-widest uppercase">AWAY</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col flex-1 w-full">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-[#818cf8]/10 rounded-full flex items-center justify-center border border-[#818cf8]/20 shrink-0">
                    <span className="material-symbols-outlined text-3xl text-[#818cf8]">currency_bitcoin</span>
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white">{market.title}</h2>
                    <span className="font-mono text-sm text-[#818cf8] tracking-widest uppercase mt-1 block">CRYPTO MARKET</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* AI Prediction Summary Bar */}
        <div className="glass-card p-4 md:p-5 mb-6 border-[#38bdf8]/20 bg-[#38bdf8]/5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <span className="material-symbols-outlined text-[#38bdf8]">psychology</span>
            <div>
              <p className="font-mono text-[10px] text-slate-400 tracking-widest mb-0.5">AI PREDICTION</p>
              <p className="font-bold text-white text-sm">{market.agentPick}</p>
            </div>
          </div>
          <div className="flex gap-6 flex-wrap">
            <div className="text-center">
              <p className="font-mono text-[10px] text-slate-400 tracking-widest mb-0.5">PROBABILITY</p>
              <p className="font-mono text-xl font-bold text-[#38bdf8]">{market.probability ?? '—'}%</p>
            </div>
            <div className="text-center">
              <p className="font-mono text-[10px] text-slate-400 tracking-widest mb-0.5">AI CONFIDENCE</p>
              <p className="font-mono text-xl font-bold text-[#34d399]">{market.confidence}%</p>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: AI Reasoning */}
          <div className="lg:col-span-8 space-y-6">

            {/* Summary */}
            {market.summary && (
              <div className="glass-card p-6 bg-[#101416]/80 border-white/5">
                <h3 className="font-mono text-sm font-bold flex items-center gap-2 text-slate-400 tracking-widest uppercase mb-3">
                  <span className="material-symbols-outlined text-[#38bdf8] text-[18px]">summarize</span>
                  AI SUMMARY
                </h3>
                <p className="text-slate-200 leading-relaxed">{market.summary}</p>
              </div>
            )}

            {/* Bull / Bear Case */}
            {(market.bull_case || market.bear_case) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {market.bull_case && (
                  <div className="glass-card p-5 bg-[#34d399]/5 border-[#34d399]/20">
                    <h3 className="font-mono text-xs font-bold text-[#34d399] tracking-widest uppercase mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">trending_up</span>
                      BULL CASE
                    </h3>
                    <p className="text-slate-300 text-sm leading-relaxed">{market.bull_case}</p>
                  </div>
                )}
                {market.bear_case && (
                  <div className="glass-card p-5 bg-[#f87171]/5 border-[#f87171]/20">
                    <h3 className="font-mono text-xs font-bold text-[#f87171] tracking-widest uppercase mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">trending_down</span>
                      BEAR CASE
                    </h3>
                    <p className="text-slate-300 text-sm leading-relaxed">{market.bear_case}</p>
                  </div>
                )}
              </div>
            )}

            {/* Key Factors */}
            <div className="glass-card p-6 bg-[#101416]/80 border-white/5">
              <h3 className="font-mono text-sm font-bold flex items-center gap-2 text-slate-400 tracking-widest uppercase mb-4">
                <span className="material-symbols-outlined text-[#38bdf8] text-[18px]">psychology</span>
                KEY FACTORS
              </h3>
              <div className="space-y-3">
                {market.keyFactors && market.keyFactors.length > 0 ? (
                  market.keyFactors.map((factor, index) => (
                    <div key={index} className="p-4 bg-white/[0.02] border border-white/5 hover:border-[#38bdf8]/30 transition-colors rounded">
                      <div className="flex items-start gap-3">
                        <span className="font-mono text-[10px] font-bold text-[#38bdf8] shrink-0 mt-0.5">
                          [{categoryLabels[index] ?? `FACTOR ${index + 1}`}]
                        </span>
                        <p className="text-slate-300 text-sm leading-relaxed">{factor}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="font-mono text-sm text-slate-500 text-center py-4">No key factors provided.</p>
                )}
              </div>
            </div>

            {/* Data Sources */}
            {market.data_sources && market.data_sources.length > 0 && (
              <div className="glass-card p-4 bg-[#101416]/80 border-white/5">
                <h3 className="font-mono text-xs font-bold text-slate-500 tracking-widest uppercase mb-3">DATA SOURCES</h3>
                <div className="flex flex-wrap gap-2">
                  {market.data_sources.map((src, i) => (
                    <span key={i} className="font-mono text-[10px] bg-white/5 border border-white/10 px-2 py-1 rounded text-slate-400">{src}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Resolution Rules */}
            <div className="glass-card p-5 bg-[#101416]/80 border-white/5">
              <h3 className="font-mono text-xs font-bold text-slate-500 tracking-widest uppercase mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">gavel</span>
                RESOLUTION RULES
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                {market.category === 'crypto'
                  ? `This market resolves based on the verified price from CoinGecko at the resolution timestamp. If the AI prediction is correct, FOLLOW wins. If incorrect, FADE wins.`
                  : `This market resolves based on the official match result. If the AI prediction (${market.agentPick}) is correct, FOLLOW wins. If incorrect, FADE wins.`}
              </p>
              {market.resolution_source && (
                <p className="font-mono text-[10px] text-slate-500 mt-2">Source: {market.resolution_source}</p>
              )}
            </div>
          </div>

          {/* Right: Pool & CTA */}
          <div className="lg:col-span-4 space-y-6">
            {/* AI Confidence (separate from pool) */}
            <div className="glass-card p-5 bg-[#101416]/80 border-white/5">
              <h3 className="font-mono text-xs font-bold text-slate-400 tracking-widest uppercase mb-4">AI CONFIDENCE</h3>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs text-slate-500">SIGNAL STRENGTH</span>
                <span className="font-mono text-2xl font-black text-[#34d399]">{market.confidence}%</span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#34d399] to-[#38bdf8] transition-all duration-700 rounded-full"
                  style={{ width: `${market.confidence}%` }}
                />
              </div>
              <p className="font-mono text-[10px] text-slate-600 mt-2">Independent of pool liquidity</p>
            </div>

            {/* Live Pool */}
            <div className="glass-card p-5 bg-[#101416]/80 border-white/5">
              <h3 className="font-mono text-sm font-bold mb-4 text-white">LIVE POOL</h3>
              <div className="flex justify-between mb-2">
                <span className="font-mono text-[10px] tracking-widest font-bold text-[#34d399]">FOLLOW</span>
                <span className="font-mono text-[10px] tracking-widest font-bold text-[#f87171]">FADE</span>
              </div>
              {totalPool === 0 ? (
                <div className="h-10 w-full bg-[#0a1628] rounded flex items-center justify-center border border-white/5 mb-3">
                  <span className="font-mono text-[10px] text-slate-500 tracking-widest">NO LIQUIDITY YET — BE THE FIRST TO STAKE</span>
                </div>
              ) : (
                <div className="h-10 w-full bg-[#0a1628] rounded overflow-hidden flex mb-3">
                  <div className="h-full bg-[#34d399] flex items-center px-3 transition-all duration-1000" style={{ width: `${followPercent}%` }}>
                    {followPercent > 15 && <span className="font-mono text-sm text-[#020817] font-black">{followPercent.toFixed(0)}%</span>}
                  </div>
                  <div className="h-full bg-[#f87171] flex items-center justify-end px-3 transition-all duration-1000" style={{ width: `${fadePercent}%` }}>
                    {fadePercent > 15 && <span className="font-mono text-sm text-[#020817] font-black">{fadePercent.toFixed(0)}%</span>}
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center font-mono text-xs">
                <span className="text-[#34d399]">${followPool.toLocaleString()}</span>
                <span className="text-slate-500 font-bold">TOTAL: ${totalPool.toLocaleString()}</span>
                <span className="text-[#f87171]">${fadePool.toLocaleString()}</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="text-center p-3 border border-white/10 bg-white/[0.02] rounded">
                  <p className="font-mono text-[9px] tracking-widest text-slate-500 mb-1">PARTICIPANTS</p>
                  <p className="font-mono text-xl font-bold text-white">{market.participants ?? '—'}</p>
                </div>
                <div className="text-center p-3 border border-[#38bdf8]/30 bg-[#38bdf8]/5 rounded">
                  <p className="font-mono text-[9px] tracking-widest text-[#38bdf8] mb-1">REWARD MULTI</p>
                  <p className="font-mono text-xl font-bold text-[#38bdf8]">{rewardMulti}x</p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="glass-card p-6 bg-[#38bdf8]/5 border-[#38bdf8]/40 shadow-[0_0_20px_rgba(56,189,248,0.1)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-[#38bdf8] opacity-10 blur-2xl" />
              <h3 className="font-bold text-xl text-[#38bdf8] mb-1">EXECUTE TRADE</h3>
              <p className="font-mono text-xs text-slate-400 mb-5 leading-relaxed">
                AI predicts <strong className="text-white">{market.agentPick}</strong>. Agree? FOLLOW. Disagree? FADE.
              </p>
              <div className="space-y-3">
                <button
                  id="follow-ai-btn"
                  onClick={() => setStakeModalSide(0)}
                  className="w-full py-4 border-2 border-[#34d399] bg-[#34d399]/10 font-mono text-sm tracking-widest font-bold text-[#34d399] hover:bg-[#34d399]/20 transition-all hover:shadow-[0_0_15px_rgba(52,211,153,0.3)] rounded"
                >
                  ✓ FOLLOW AI
                </button>
                <button
                  id="fade-ai-btn"
                  onClick={() => setStakeModalSide(1)}
                  className="w-full py-4 border border-[#f87171] bg-transparent font-mono text-sm tracking-widest font-bold text-[#f87171] hover:bg-[#f87171]/10 transition-all hover:shadow-[0_0_15px_rgba(248,113,113,0.2)] rounded"
                >
                  ✗ FADE AI
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {stakeModalSide !== null && (
        <StakeModal
          market={market}
          side={stakeModalSide}
          isOpen={true}
          onClose={() => setStakeModalSide(null)}
        />
      )}
    </div>
  );
}
