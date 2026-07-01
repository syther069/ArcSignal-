'use client';

import React from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { useAccount } from 'wagmi';
import { LeaderboardEntry } from '@/types';
import { TrendingUp, Trophy, User, Flame, LineChart, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface LeaderboardClientProps {
  initialLeaderboard: LeaderboardEntry[];
}

export default function LeaderboardClient({ initialLeaderboard }: LeaderboardClientProps) {
  const { address, isConnected } = useAccount();

  return (
    <div className="flex min-h-screen bg-background text-on-surface">
      <Sidebar />

      <main className="flex-1 lg:ml-[264px] pt-16 h-[calc(100vh-64px)] flex overflow-hidden">
        {/* Central Content Area */}
        <section className="flex-1 overflow-y-auto px-4 md:px-8 py-10 scrollbar-hide">
          {/* Header */}
          <div className="mb-10">
            <h1 className="font-sans font-black text-3xl text-on-surface mb-2 tracking-tight">Elite Operators</h1>
            <p className="text-on-surface-variant font-sans text-base">Real-time ranking of top-performing prediction models and human traders.</p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="glass-panel p-6 rounded-xl">
              <p className="text-on-surface-variant font-sans text-sm font-medium mb-2">Network Volume</p>
              <div className="flex items-end gap-2">
                <span className="font-mono text-xl lg:text-2xl font-bold text-on-surface">$1.2B</span>
                <span className="text-tertiary text-sm font-medium mb-1.5">+14.2%</span>
              </div>
            </div>
            <div className="glass-panel p-6 rounded-xl relative overflow-hidden">
              <p className="text-on-surface-variant font-sans text-sm font-medium mb-2">Active Traders</p>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xl lg:text-2xl font-bold text-on-surface">12,842</span>
                <span className="flex h-2 w-2 rounded-full bg-tertiary animate-pulse"></span>
                <span className="text-on-surface-variant text-sm font-medium">Live</span>
              </div>
            </div>
            <div className="glass-panel p-6 rounded-xl">
              <p className="text-on-surface-variant font-sans text-sm font-medium mb-2">Top 24h P&L</p>
              <div className="flex items-end gap-2">
                <span className="font-mono text-xl lg:text-2xl font-bold text-on-primary-container">+$421,902</span>
                <TrendingUp className="text-on-primary-container w-5 h-5 mb-1" />
              </div>
            </div>
          </div>

          {/* Rankings Table */}
          <div className="glass-panel rounded-xl overflow-hidden mb-10">
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-surface-container-low/50">
                    <th className="px-6 py-4 font-sans text-sm font-medium text-on-surface-variant whitespace-nowrap">Rank</th>
                    <th className="px-6 py-4 font-sans text-sm font-medium text-on-surface-variant whitespace-nowrap">Operator</th>
                    <th className="px-6 py-4 font-sans text-sm font-medium text-on-surface-variant whitespace-nowrap">Win Rate</th>
                    <th className="px-6 py-4 font-sans text-sm font-medium text-on-surface-variant whitespace-nowrap">Total Staked</th>
                    <th className="px-6 py-4 font-sans text-sm font-medium text-on-surface-variant whitespace-nowrap">Net P&L</th>
                    <th className="px-6 py-4 font-sans text-sm font-medium text-on-surface-variant text-right whitespace-nowrap">Streak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {initialLeaderboard.map((entry, index) => {
                    const isRank1 = entry.rank === 1;
                    const isRank2 = entry.rank === 2;
                    const isRank3 = entry.rank === 3;
                    const isTop3 = isRank1 || isRank2 || isRank3;

                    let trophyColor = "text-on-surface-variant";
                    if (isRank1) trophyColor = "text-primary";
                    else if (isRank2) trophyColor = "text-secondary";
                    else if (isRank3) trophyColor = "text-tertiary-fixed-dim";

                    const streak = entry.rank <= 3 ? 15 - entry.rank * 3 : (entry.rank <= 10 ? 3 : 0);
                    const formattedAddress = `${entry.walletAddress.substring(0, 6)}...${entry.walletAddress.slice(-4)}`;

                    return (
                      <tr key={entry.walletAddress} className="hover:bg-primary/5 transition-colors group hover:shadow-[inset_2px_0_0_0_#c0c1ff]">
                        <td className="px-6 py-5">
                          {isTop3 ? (
                            <div className="flex items-center gap-2">
                              <Trophy className={`${trophyColor} w-5 h-5`} />
                              <span className="font-mono text-sm text-on-surface font-bold">
                                {entry.rank.toString().padStart(2, '0')}
                              </span>
                            </div>
                          ) : (
                            <span className="font-mono text-sm text-on-surface-variant font-bold ml-7">
                              {entry.rank.toString().padStart(2, '0')}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            {entry.avatarUrl || isTop3 ? (
                              <img 
                                className={`w-8 h-8 rounded-full border object-cover ${isRank1 ? 'border-primary/30' : (isTop3 ? 'border-outline-variant/30' : 'border-outline-variant/10')}`}
                                src={entry.avatarUrl || (isRank1 ? "https://lh3.googleusercontent.com/aida-public/AB6AXuBSnpEUuNOcVfWyfhygAD5rQpnAy4zxhvIRPycrHnDuij06Xoks4gMlXoTqS4WOKqNyq7jFsJn0_DHWu8rVtPndKQJRc95CyEHnXMp9FoQ8-ncMrstH-RRCiKefTqUEyFGtkklDPPuIwIj0de_wmoTlXc2QL0Xm5vJKV32EP5stC2tgNABQisIqWg07Jb59Isfe8E0-N-aB37rWtwEd8QOVVgzd76kdvvqv6eSquLgY3gAhBwTe509JmDfRTVhtlCSLGh-4H0fqLr9h" : (isRank2 ? "https://lh3.googleusercontent.com/aida-public/AB6AXuBVXSsMs0_PgQ68UkfQO7e6mbo8PQxKfScWpFRM_PhbUEmkWETENRec8mfZofyxCES5siGuFyZUAYDat2anGF5VTpILD3xObok8Qs-zPHzE88oh6Zv_s3YgiCOgulMvySDKTz45ine_CVJrdK6EhOZrdXU401ZxzVExNSwapUvGto2DEyUpFdRUQTS1DAbi6yj6hAAJj1_xGe4ac1tXOPSLWvcz7qa6D19hO0Wtl6wwJHPHfybrU-RAvu8CSHkwx2aRXLv-9d6m3_zb" : "https://lh3.googleusercontent.com/aida-public/AB6AXuCaNSKAJxNYgiHhmpNItK_J1R6XZ-Rx0m__AJlapFROMjsyvNAlKhbmKGfw_4y1-KKPAcGGzYRpl47NDpxIDZoUMhq6B7IEz5Y9a_P8ICATy_DaIEJmsyuV_-cGm2a2h85Hqt49pbc8jywzy08m65LunXB6cqgrt88NdKKhH2H85K2fyxQrWuBvT98qCvUCm9x_vGYGHiam9GJJl7mEpo2pBiB2aq0c5onVDoHwy-GCt1Ox04ZtoU9Pc5G9OSVBQUrfYtpiafmkOpCH"))} 
                                alt={entry.username || formattedAddress} 
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center">
                                <User className="text-on-surface-variant w-4 h-4" />
                              </div>
                            )}
                            <span className="font-mono text-sm text-on-surface">
                              {entry.username || formattedAddress}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="w-32">
                            <div className="flex justify-between mb-1">
                              <span className="text-[10px] font-bold text-on-surface">{entry.winRate.toFixed(1)}%</span>
                            </div>
                            <div className="h-1 w-full bg-surface-container-highest rounded-full overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: `${Math.min(entry.winRate, 100)}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 font-mono text-sm text-on-surface">
                          {entry.totalStaked.toLocaleString()} ARC
                        </td>
                        <td className={`px-6 py-5 font-mono text-sm ${entry.netProfit >= 0 ? (isTop3 ? 'text-primary' : 'text-on-surface-variant') : 'text-on-surface-variant'}`}>
                          {entry.netProfit >= 0 ? '+' : ''}${entry.netProfit.toLocaleString()}
                        </td>
                        <td className={`px-6 py-5 text-right font-mono text-sm ${streak > 0 ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                          {streak > 0 ? (
                            <div className="flex items-center justify-end gap-1">
                              <span>{streak}</span>
                              <Flame className={`w-4 h-4 ${streak > 10 ? 'text-orange-500 animate-pulse' : (streak > 5 ? 'text-orange-400' : 'text-orange-300')}`} />
                            </div>
                          ) : (
                            "--"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Right Sidebar */}
        <aside className="w-80 border-l border-outline-variant/10 p-6 space-y-6 overflow-y-auto scrollbar-hide hidden xl:block flex-shrink-0 bg-surface-container-lowest/30">
          {/* Performance Matrix */}
          <div className="glass-panel p-5 rounded-xl">
            <h3 className="font-sans text-sm font-medium text-on-surface mb-6 flex justify-between items-center">
              Performance Matrix
              <LineChart className="text-primary w-4 h-4" />
            </h3>
            <div className="h-40 flex items-end justify-between gap-1">
              {[40, 60, 45, 80, 70, 90, 65, 55, 85, 100].map((h, i) => (
                <div key={i} className="bg-primary/20 w-3 rounded-t-sm transition-all hover:bg-primary hover:shadow-[0_0_15px_rgba(99,102,241,0.15)]" style={{ height: `${h}%` }}></div>
              ))}
            </div>
            <div className="mt-4 flex justify-between text-[10px] text-on-surface-variant font-mono">
              <span>00:00</span>
              <span>PLATFORM VOL (24H)</span>
              <span>23:59</span>
            </div>
          </div>

          {/* Institutional Access */}
          <div className="relative rounded-xl overflow-hidden group">
            <div className="absolute inset-0 z-0">
              <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBGke9XKbzmcdyVriF0napSrVl4-62ls9vTMlzqeOL7nMLi_C6VHlbwdMnVBHnLtT1Ew6B6OoutDmUF9hF9JQeg5gRZ90a3HJw3u5327d2rWqmFcp0zOsZ0hr6J-P6qnjqUS7RmVxICHwqhTBi37fzcvb7Fob5Xn2kAlvFPBfhUMR-sl7acI4DfUCR-trv9O8aEMsZ1UR2_5paNMWVl6IlS3TcvzWJsMfitEFN-AbhDZ9SAZ4mFAmb30hPEuWdK4IQchN-br7A8DUw2')" }}></div>
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-transparent"></div>
            </div>
            <div className="relative z-10 p-6">
              <h3 className="font-sans font-bold text-xl text-on-surface mb-3">Institutional Access</h3>
              <p className="text-on-surface-variant text-sm font-sans mb-6">Connect your algorithmic models directly to our liquidity layer via the ARC SDK.</p>
              <Link href="#" className="inline-flex items-center gap-2 bg-surface border border-outline-variant/30 px-4 py-2 rounded-lg font-sans text-sm font-medium hover:bg-surface-variant/20 transition-all text-on-surface">
                View Documentation
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Operator Pulse */}
          <div className="glass-panel p-5 rounded-xl">
            <h3 className="font-sans text-sm font-medium text-on-surface mb-4">Operator Pulse</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-tertiary flex-shrink-0"></div>
                <div>
                  <p className="text-[12px] text-on-surface font-medium leading-tight">0x21...88c1 staked 50k ARC</p>
                  <p className="text-[10px] text-on-surface-variant font-mono mt-1">2 minutes ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-primary flex-shrink-0"></div>
                <div>
                  <p className="text-[12px] text-on-surface font-medium leading-tight">AI Model "Nova" predicted BTC/USD</p>
                  <p className="text-[10px] text-on-surface-variant font-mono mt-1">12 minutes ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-tertiary flex-shrink-0"></div>
                <div>
                  <p className="text-[12px] text-on-surface font-medium leading-tight">Payout triggered: $12,400 to 0x7a...E42d</p>
                  <p className="text-[10px] text-on-surface-variant font-mono mt-1">24 minutes ago</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
