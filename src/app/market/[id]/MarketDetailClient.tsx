'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import Footer from '@/components/layout/Footer';
import { PoolBar } from '@/components/markets/PoolBar';
import { StakeModal } from '@/components/markets/StakeModal';
import { Market, StakeSide } from '@/types';

interface MarketDetailClientProps {
  market: Market;
}

export default function MarketDetailClient({ market }: MarketDetailClientProps) {
  const [stakeModalSide, setStakeModalSide] = useState<StakeSide | null>(null);

  const totalPool = market.followPool + market.fadePool;
  const followPercent = totalPool > 0 ? (market.followPool / totalPool) * 100 : 50;
  const fadePercent = totalPool > 0 ? (market.fadePool / totalPool) * 100 : 50;
  
  // Estimate multi assuming 1 to 1 return from losing pool
  const rewardMulti = totalPool > 0 && market.followPool > 0 ? (totalPool / market.followPool).toFixed(2) : '2.00';

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="ml-[264px] pt-24 px-8 pb-16 flex-1 min-w-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-8 font-mono text-sm text-slate-500">
          <Link href="/markets" className="hover:text-[#38bdf8] transition-colors">
            Markets
          </Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="uppercase text-slate-400">{market.category}</span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          {market.league && (
            <>
              <span className="uppercase text-slate-400">{market.league}</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            </>
          )}
          <span className="text-[#38bdf8] font-bold truncate max-w-[400px]">
            {market.title}
          </span>
        </div>

        {/* Hero Section */}
        <section className="glass-card p-8 mb-8 relative overflow-hidden bg-[#101416]/60 border-[#00dbe9]/20 scanline">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
            {market.category === 'football' ? (
              <>
                <div className="flex flex-col items-center md:items-end flex-1">
                  <div className="w-24 h-24 mb-4 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                    <span className="material-symbols-outlined text-4xl text-[#38bdf8]">sports_soccer</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-1 text-center md:text-right">{market.homeTeam}</h2>
                  <span className="font-mono text-xs text-[#38bdf8] opacity-80 tracking-widest uppercase">HOME</span>
                </div>
                
                <div className="flex flex-col items-center gap-3 px-12 border-x border-white/10">
                  {!market.resolved && (
                    <span className="bg-[#38bdf8]/10 text-[#38bdf8] px-3 py-1 font-mono text-xs rounded tracking-widest border border-[#38bdf8]/20 animate-pulse">
                      LIVE
                    </span>
                  )}
                  <div className="flex items-center gap-6">
                    <span className="text-6xl font-black text-white">{market.homeScore ?? '-'}</span>
                    <span className="text-2xl text-slate-500 font-bold">:</span>
                    <span className="text-6xl font-black text-white">{market.awayScore ?? '-'}</span>
                  </div>
                  <span className="font-mono text-xs text-slate-400 tracking-wider">
                    {market.league || 'FOOTBALL MATCH'}
                  </span>
                </div>

                <div className="flex flex-col items-center md:items-start flex-1">
                  <div className="w-24 h-24 mb-4 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                    <span className="material-symbols-outlined text-4xl text-slate-400">sports_soccer</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-1 text-center md:text-left">{market.awayTeam}</h2>
                  <span className="font-mono text-xs text-slate-400 tracking-widest uppercase">AWAY</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col flex-1">
                 <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-[#818cf8]/10 rounded-full flex items-center justify-center border border-[#818cf8]/20">
                    <span className="material-symbols-outlined text-3xl text-[#818cf8]">currency_bitcoin</span>
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-white">{market.title}</h2>
                    <span className="font-mono text-sm text-[#818cf8] tracking-widest uppercase mt-1 block">CRYPTO MARKET</span>
                  </div>
                 </div>
              </div>
            )}
          </div>
        </section>

        {/* Two Column Layout */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Panel: AI Reasoning */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            <div className="glass-card p-6 bg-[#101416]/80 border-white/5">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-mono text-lg font-bold flex items-center gap-2 text-white">
                  <span className="material-symbols-outlined text-[#38bdf8]">psychology</span>
                  AI REASONING BREAKDOWN
                </h3>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-slate-400 tracking-widest">SIGNAL CONFIDENCE:</span>
                  <span className="font-mono text-xl text-[#34d399] font-bold">{market.confidence}%</span>
                </div>
              </div>

              <div className="space-y-4">
                {market.keyFactors && market.keyFactors.length > 0 ? (
                  market.keyFactors.map((factor, index) => {
                    const conf = Math.max(50, Math.round(market.confidence + (Math.random() * 10 - 5)));
                    const label = market.category === 'football' 
                      ? (index === 0 ? 'TACTICAL ANALYSIS' : index === 1 ? 'INJURY IMPACT' : 'HISTORICAL DATA')
                      : (index === 0 ? 'ON-CHAIN METRICS' : index === 1 ? 'ORDER BOOK FLOW' : 'SENTIMENT ANALYSIS');
                      
                    return (
                      <div key={index} className="p-4 bg-white/[0.02] border border-white/5 hover:border-[#38bdf8]/30 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <span className="font-mono text-[11px] font-bold tracking-widest text-[#38bdf8]">
                            [ {label} ]
                          </span>
                          <span className="font-mono text-[11px] font-bold text-[#38bdf8]">
                            {conf}% CONF
                          </span>
                        </div>
                        <p className="text-slate-300 leading-relaxed text-sm">
                          {factor}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 text-center border border-white/5 bg-white/[0.02]">
                    <p className="font-mono text-sm text-slate-500">No reasoning details provided by the agent.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Resolution History Table */}
            <div className="glass-card p-6 bg-[#101416]/80 border-white/5">
              <h3 className="font-mono text-lg font-bold mb-6 flex items-center gap-2 text-white">
                <span className="material-symbols-outlined text-[#38bdf8]">history</span>
                RESOLUTION HISTORY
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="pb-4 font-mono text-[10px] tracking-widest text-slate-500 uppercase">Date</th>
                      <th className="pb-4 font-mono text-[10px] tracking-widest text-slate-500 uppercase">Market Type</th>
                      <th className="pb-4 font-mono text-[10px] tracking-widest text-slate-500 uppercase text-center">Outcome</th>
                      <th className="pb-4 font-mono text-[10px] tracking-widest text-slate-500 uppercase text-right">Total Pool</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-xs">
                    <tr className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="py-4 text-slate-400">OCT 22, 24</td>
                      <td className="py-4 text-white">Previous Match Analysis</td>
                      <td className="py-4 text-center"><span className="text-[#34d399] font-bold tracking-wider">[ CALL ]</span></td>
                      <td className="py-4 text-right text-white">$1.2M USDC</td>
                    </tr>
                    <tr className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="py-4 text-slate-400">SEP 15, 24</td>
                      <td className="py-4 text-white">Historical Data Series</td>
                      <td className="py-4 text-center"><span className="text-[#34d399] font-bold tracking-wider">[ CALL ]</span></td>
                      <td className="py-4 text-right text-white">$840k USDC</td>
                    </tr>
                    <tr className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="py-4 text-slate-400">AUG 12, 24</td>
                      <td className="py-4 text-white">Seasonal Trend Verification</td>
                      <td className="py-4 text-center"><span className="text-[#f87171] font-bold tracking-wider">[ FADE ]</span></td>
                      <td className="py-4 text-right text-white">$2.1M USDC</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Panel: Live Pool & CTA */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="glass-card p-6 bg-[#101416]/80 border-white/5">
              <h3 className="font-mono text-lg font-bold mb-6 text-white">LIVE POOL DATA</h3>
              
              <div className="flex justify-between mb-3">
                <span className="font-mono text-[10px] tracking-widest font-bold text-[#34d399]">FOLLOW</span>
                <span className="font-mono text-[10px] tracking-widest font-bold text-[#f87171]">FADE</span>
              </div>
              
              <div className="h-12 w-full bg-[#0a1628] rounded overflow-hidden flex mb-4 relative">
                <div 
                  className="h-full bg-[#34d399] flex items-center px-4 z-10 transition-all duration-1000"
                  style={{ width: `${followPercent}%` }}
                >
                  <span className="font-mono text-lg text-[#020817] font-black">{followPercent.toFixed(1)}%</span>
                </div>
                <div 
                  className="h-full bg-[#f87171] flex items-center justify-end px-4 z-10 transition-all duration-1000"
                  style={{ width: `${fadePercent}%` }}
                >
                  <span className="font-mono text-lg text-[#020817] font-black">{fadePercent.toFixed(1)}%</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center font-mono text-xs">
                <span className="text-[#34d399]">${market.followPool.toLocaleString()} USDC</span>
                <span className="text-slate-500 font-bold">TOTAL: ${(totalPool).toLocaleString()}</span>
                <span className="text-[#f87171]">${market.fadePool.toLocaleString()} USDC</span>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="text-center p-4 border border-white/10 bg-white/[0.02]">
                  <p className="font-mono text-[10px] tracking-widest text-slate-500 mb-2">STAKERS</p>
                  <p className="font-mono text-2xl font-bold text-white">1,204</p>
                </div>
                <div className="text-center p-4 border border-[#38bdf8]/30 bg-[#38bdf8]/5">
                  <p className="font-mono text-[10px] tracking-widest text-[#38bdf8] mb-2">REWARD MULTI</p>
                  <p className="font-mono text-2xl font-bold text-[#38bdf8]">{rewardMulti}x</p>
                </div>
              </div>
            </div>

            {/* Stake CTA Panel */}
            <div className="glass-card p-6 bg-[#38bdf8]/5 border-[#38bdf8]/40 shadow-[0_0_20px_rgba(56,189,248,0.1)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#38bdf8] opacity-10 blur-2xl"></div>
              
              <h3 className="font-bold text-xl text-[#38bdf8] mb-2">EXECUTE TRADE</h3>
              <p className="font-mono text-xs text-slate-400 mb-6 leading-relaxed">
                Agent {market.agentId} predicts <strong>{market.agentPick}</strong>. Enter the pool to back or oppose this signal.
              </p>
              
              <div className="space-y-4">
                <button 
                  onClick={() => setStakeModalSide(0)}
                  className="w-full py-4 border-2 border-[#34d399] bg-[#34d399]/10 font-mono text-sm tracking-widest font-bold text-[#34d399] hover:bg-[#34d399]/20 transition-all hover:shadow-[0_0_15px_rgba(52,211,153,0.3)]"
                >
                  FOLLOW AI
                </button>
                <button 
                  onClick={() => setStakeModalSide(1)}
                  className="w-full py-4 border border-[#f87171] bg-transparent font-mono text-sm tracking-widest font-bold text-[#f87171] hover:bg-[#f87171]/10 transition-all hover:shadow-[0_0_15px_rgba(248,113,113,0.2)]"
                >
                  FADE AI
                </button>
              </div>
            </div>
            
            {/* System Status Decorative Component */}
            <div className="glass-card p-4 border-white/5 bg-[#101416]/80 flex items-center gap-4">
               <div className="w-10 h-10 rounded-full border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center">
                 <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
                  </span>
               </div>
               <div>
                 <div className="font-mono text-[10px] text-emerald-400 tracking-widest mb-1">LIVE NETWORK TELEMETRY</div>
                 <div className="font-mono text-xs text-slate-500">ARC-W1 Node Status: OPTIMAL</div>
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
