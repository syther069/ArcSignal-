'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { useAccount } from 'wagmi';
import { LeaderboardEntry } from '@/types';

type TimeFilter = 'ALL TIME' | 'THIS WEEK';
type CategoryFilter = 'ALL' | 'FOOTBALL' | 'CRYPTO';

interface LeaderboardClientProps {
  initialLeaderboard: LeaderboardEntry[];
}

export default function LeaderboardClient({ initialLeaderboard }: LeaderboardClientProps) {
  const { address, isConnected } = useAccount();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('ALL TIME');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');

  // Top 3 Podium
  const podium = initialLeaderboard.slice(0, 3);
  // The rest
  const remaining = initialLeaderboard.slice(3);
  
  // Find connected user rank
  const userRankEntry = isConnected && address
    ? initialLeaderboard.find(entry => entry.walletAddress.toLowerCase() === address.toLowerCase())
    : null;

  return (
    <div className="flex min-h-screen bg-[#101416]">
      <Sidebar />

      <main className="flex-1 lg:ml-[264px] pt-24 px-8 pb-32 overflow-y-auto min-h-screen relative">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div>
            <h1 className="text-[32px] font-black tracking-tight text-[#38bdf8] mb-1 italic">
              GLOBAL LEADERBOARD
            </h1>
            <p className="font-mono text-sm text-slate-400">
              Top performing agents and stakers on ARC Network.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {/* Time Filter */}
            <div className="flex bg-[#0f1f38] p-1 rounded-md border border-white/10 self-end">
              {(['ALL TIME', 'THIS WEEK'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setTimeFilter(tab)}
                  className={`px-4 py-1.5 text-[10px] font-bold font-mono tracking-widest rounded transition-all whitespace-nowrap ${
                    timeFilter === tab
                      ? 'bg-white/10 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            {/* Category Filter */}
            <div className="flex bg-[#0f1f38] p-1 rounded-md border border-white/10 self-end">
              {(['ALL', 'FOOTBALL', 'CRYPTO'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setCategoryFilter(tab)}
                  className={`px-4 py-1.5 text-[10px] font-bold font-mono tracking-widest rounded transition-all whitespace-nowrap ${
                    categoryFilter === tab
                      ? 'bg-[#38bdf8]/20 border border-[#38bdf8]/40 text-[#38bdf8]'
                      : 'bg-transparent border border-transparent text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Podium Section (Top 3) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Rank 2 - Silver */}
          {podium[1] && (
            <div className="md:mt-8 relative group">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-400/20 to-transparent rounded-lg opacity-50"></div>
              <div className="glass-card p-6 border-slate-400/30 text-center relative z-10 hover:-translate-y-2 transition-transform duration-300">
                <div className="w-16 h-16 rounded-full bg-slate-300/10 mx-auto mb-4 border-2 border-slate-300 flex items-center justify-center">
                   <span className="font-black text-2xl text-slate-300">2</span>
                </div>
                <h3 className="font-bold text-white text-lg mb-1 truncate">
                  {podium[1].username || `${podium[1].walletAddress.substring(0, 6)}...${podium[1].walletAddress.slice(-4)}`}
                </h3>
                <div className="font-mono text-[#34d399] font-bold mb-4">+${podium[1].netProfit.toLocaleString()}</div>
                <div className="grid grid-cols-2 gap-2 text-left font-mono text-[10px] border-t border-white/10 pt-4">
                  <div className="text-slate-400">WIN RATE</div>
                  <div className="text-right text-white font-bold">{podium[1].winRate.toFixed(1)}%</div>
                  <div className="text-slate-400">VOLUME</div>
                  <div className="text-right text-white">${(podium[1].totalStaked / 1000).toFixed(1)}k</div>
                </div>
              </div>
            </div>
          )}

          {/* Rank 1 - Gold */}
          {podium[0] && (
            <div className="relative group z-10">
              <div className="absolute inset-0 bg-gradient-to-t from-[#fbbf24]/20 to-transparent rounded-lg opacity-50 blur-sm"></div>
              <div className="glass-card p-6 border-[#fbbf24]/40 shadow-[0_0_30px_rgba(251,191,36,0.15)] text-center relative z-10 hover:-translate-y-2 transition-transform duration-300 scale-105">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#fbbf24] text-[#020817] px-3 py-0.5 font-mono text-[10px] font-bold rounded-sm tracking-widest">
                  CHAMPION
                </div>
                <div className="w-20 h-20 rounded-full bg-[#fbbf24]/10 mx-auto mb-4 border-2 border-[#fbbf24] flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,0.4)]">
                   <span className="font-black text-3xl text-[#fbbf24]">1</span>
                </div>
                <h3 className="font-black text-[#fbbf24] text-xl mb-1 truncate">
                  {podium[0].username || `${podium[0].walletAddress.substring(0, 6)}...${podium[0].walletAddress.slice(-4)}`}
                </h3>
                <div className="font-mono text-[#34d399] text-xl font-bold mb-4">+${podium[0].netProfit.toLocaleString()}</div>
                <div className="grid grid-cols-2 gap-2 text-left font-mono text-xs border-t border-[#fbbf24]/20 pt-4">
                  <div className="text-[#fbbf24]/70">WIN RATE</div>
                  <div className="text-right text-white font-bold">{podium[0].winRate.toFixed(1)}%</div>
                  <div className="text-[#fbbf24]/70">VOLUME</div>
                  <div className="text-right text-white">${(podium[0].totalStaked / 1000).toFixed(1)}k</div>
                </div>
              </div>
            </div>
          )}

          {/* Rank 3 - Bronze */}
          {podium[2] && (
            <div className="md:mt-12 relative group">
              <div className="absolute inset-0 bg-gradient-to-t from-[#b45309]/20 to-transparent rounded-lg opacity-50"></div>
              <div className="glass-card p-6 border-[#b45309]/40 text-center relative z-10 hover:-translate-y-2 transition-transform duration-300">
                <div className="w-16 h-16 rounded-full bg-[#b45309]/10 mx-auto mb-4 border-2 border-[#b45309] flex items-center justify-center">
                   <span className="font-black text-2xl text-[#b45309]">3</span>
                </div>
                <h3 className="font-bold text-white text-lg mb-1 truncate">
                  {podium[2].username || `${podium[2].walletAddress.substring(0, 6)}...${podium[2].walletAddress.slice(-4)}`}
                </h3>
                <div className="font-mono text-[#34d399] font-bold mb-4">+${podium[2].netProfit.toLocaleString()}</div>
                <div className="grid grid-cols-2 gap-2 text-left font-mono text-[10px] border-t border-white/10 pt-4">
                  <div className="text-slate-400">WIN RATE</div>
                  <div className="text-right text-white font-bold">{podium[2].winRate.toFixed(1)}%</div>
                  <div className="text-slate-400">VOLUME</div>
                  <div className="text-right text-white">${(podium[2].totalStaked / 1000).toFixed(1)}k</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Full Ranking Table */}
        <div className="glass-card border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 bg-[#0a1628]/80">
                  <th className="p-4 font-mono text-[10px] tracking-widest text-slate-500 uppercase w-16 text-center">Rank</th>
                  <th className="p-4 font-mono text-[10px] tracking-widest text-slate-500 uppercase">Trader</th>
                  <th className="p-4 font-mono text-[10px] tracking-widest text-slate-500 uppercase text-right">Net Profit</th>
                  <th className="p-4 font-mono text-[10px] tracking-widest text-slate-500 uppercase text-right">Win Rate</th>
                  <th className="p-4 font-mono text-[10px] tracking-widest text-slate-500 uppercase text-right">Volume</th>
                  <th className="p-4 font-mono text-[10px] tracking-widest text-slate-500 uppercase text-right">Markets</th>
                </tr>
              </thead>
              <tbody className="font-mono text-sm">
                {remaining.map((entry) => (
                  <tr key={entry.walletAddress} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                    <td className="p-4 text-center text-slate-500 font-bold group-hover:text-white transition-colors">
                      {entry.rank}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 opacity-80 border border-white/20"></div>
                        <div>
                          <div className="text-white font-bold">
                            {entry.username || `${entry.walletAddress.substring(0, 6)}...${entry.walletAddress.slice(-4)}`}
                          </div>
                          <div className="text-[10px] text-slate-500">{entry.walletAddress.substring(0, 12)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right text-[#34d399] font-bold">
                      +${entry.netProfit.toLocaleString()}
                    </td>
                    <td className="p-4 text-right text-white">
                      {entry.winRate.toFixed(1)}%
                    </td>
                    <td className="p-4 text-right text-slate-300">
                      ${entry.totalStaked.toLocaleString()}
                    </td>
                    <td className="p-4 text-right text-slate-500">
                      {entry.marketsEntered}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Sticky Your Rank Bar */}
        {isConnected && (
          <div className="fixed bottom-0 left-0 lg:left-[264px] right-0 bg-[#020817]/95 backdrop-blur-xl border-t border-[#38bdf8]/40 shadow-[0_-5px_30px_rgba(56,189,248,0.1)] p-4 z-40">
            <div className="flex items-center justify-between max-w-[1440px] mx-auto px-4">
              <div className="flex items-center gap-4">
                <div className="bg-[#38bdf8]/20 text-[#38bdf8] font-black font-mono text-xl w-12 h-12 flex items-center justify-center rounded-full border border-[#38bdf8]/50">
                  {userRankEntry ? userRankEntry.rank : '-'}
                </div>
                <div>
                  <div className="font-mono text-[10px] text-[#38bdf8] tracking-widest font-bold">YOUR POSITION</div>
                  <div className="text-white font-bold">{userRankEntry?.username || 'Connected Wallet'}</div>
                </div>
              </div>
              
              <div className="hidden md:flex items-center gap-8">
                 <div className="text-right">
                   <div className="font-mono text-[10px] text-slate-500 tracking-widest">NET PROFIT</div>
                   <div className="font-mono text-[#34d399] font-bold text-lg">${userRankEntry?.netProfit.toLocaleString() || '0'}</div>
                 </div>
                 <div className="text-right">
                   <div className="font-mono text-[10px] text-slate-500 tracking-widest">WIN RATE</div>
                   <div className="font-mono text-white font-bold text-lg">{userRankEntry?.winRate.toFixed(1) || '0.0'}%</div>
                 </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
