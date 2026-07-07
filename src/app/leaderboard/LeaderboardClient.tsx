'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWatchContractEvent } from 'wagmi';
import { ARCSIGNAL_ABI, ARCSIGNAL_ADDRESS } from '@/lib/contracts';
import Sidebar from '@/components/layout/Sidebar';
import { Trophy } from 'lucide-react';

interface LeaderboardEntry {
  address: string;
  totalStaked: bigint;
  correctPredictions: number;
  totalPredictions: number;
  winRate: number;
}

interface LeaderboardClientProps {
  leaderboard: LeaderboardEntry[];
  markets: any[];
}

export default function LeaderboardClient({ leaderboard, markets }: LeaderboardClientProps) {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 60000);
    return () => clearInterval(interval);
  }, [router]);

  useWatchContractEvent({
    address: ARCSIGNAL_ADDRESS,
    abi: ARCSIGNAL_ABI,
    eventName: 'Staked',
    onLogs() {
      router.refresh();
    },
  });

  // Stat Card 1: Network Volume
  const totalVolume = markets.reduce((acc, m) => acc + (Number(m.followPool) + Number(m.fadePool)) / 1e6, 0);
  
  // Stat Card 2: Active Traders
  const activeTradersCount = leaderboard.length;

  // Stat Card 3: Top Performer
  const topPerformer = leaderboard.length > 0 ? leaderboard[0] : null;
  const formatAddress = (addr: string) => `${addr.substring(0, 6)}...${addr.slice(-4)}`;

  // Sidebar stats
  const totalMarkets = markets.length;
  const resolvedMarkets = markets.filter(m => m.outcome !== 'PENDING').length;
  const activeMarkets = markets.filter(m => m.outcome === 'PENDING').length;

  return (
    <div className="flex min-h-screen bg-[#131313] text-[#e5e2e1]">
      <Sidebar />

      <main className="flex-1 lg:ml-[264px] pt-16 flex overflow-hidden">
        <div className="w-full flex">
        {/* Central Content Area */}
        <section className="flex-1 overflow-y-auto px-4 md:px-8 py-10 scrollbar-hide h-[calc(100vh-64px)]">
          {/* Header */}
          <div className="mb-10">
            <h1 className="font-headline-xl text-3xl font-bold text-on-surface mb-2 tracking-tight">Elite Users</h1>
            <p className="text-text-muted font-sans text-base">Real-time performance ranking of the most accurate prediction traders on ARC Testnet.</p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {/* Card 1 */}
            <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl flex flex-col justify-between">
              <p className="text-text-muted font-sans text-sm font-medium mb-2">Network Volume</p>
              <div className="flex items-end gap-2">
                {totalVolume === 0 ? (
                  <span className="font-code-sm text-text-muted">No stakes yet</span>
                ) : (
                  <span className="font-code-sm text-2xl font-bold">{totalVolume.toLocaleString()} USDC</span>
                )}
              </div>
            </div>
            
            {/* Card 2 */}
            <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl relative overflow-hidden flex flex-col justify-between">
              <p className="text-text-muted font-sans text-sm font-medium mb-2">Active Traders</p>
              <div className="flex items-center gap-3">
                <span className="font-code-sm text-2xl font-bold">{activeTradersCount}</span>
                <span className="flex h-2 w-2 rounded-full bg-tertiary animate-pulse"></span>
                <span className="text-text-muted text-sm font-medium">Live</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl flex flex-col justify-between">
              <p className="text-text-muted font-sans text-sm font-medium mb-2">Top Performer</p>
              <div className="flex flex-col gap-1">
                {topPerformer ? (
                  <>
                    <span className="font-code-sm text-xl font-bold text-primary">{formatAddress(topPerformer.address)}</span>
                    <span className="text-tertiary text-sm font-medium">{topPerformer.winRate}% Win Rate</span>
                  </>
                ) : (
                  <span className="font-code-sm text-text-muted">None</span>
                )}
              </div>
            </div>
          </div>

          {/* Rankings Table */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden mb-10">
            {leaderboard.length === 0 ? (
              <div className="w-full py-16 flex items-center justify-center text-text-muted font-code-sm text-center">
                No traders have placed positions yet. Be the first to stake on a market.
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-hide">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-[#1e293b]/30">
                      <th className="px-6 py-4 font-label-caps text-xs text-text-muted whitespace-nowrap">Rank</th>
                      <th className="px-6 py-4 font-label-caps text-xs text-text-muted whitespace-nowrap">User</th>
                      <th className="px-6 py-4 font-label-caps text-xs text-text-muted whitespace-nowrap">Win Rate</th>
                      <th className="px-6 py-4 font-label-caps text-xs text-text-muted whitespace-nowrap">Total Staked</th>
                      <th className="px-6 py-4 font-label-caps text-xs text-text-muted whitespace-nowrap">Predictions</th>
                      <th className="px-6 py-4 font-label-caps text-xs text-text-muted text-right whitespace-nowrap">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/50">
                    {leaderboard.map((entry, index) => {
                      const rank = index + 1;
                      const isRank1 = rank === 1;
                      const isRank2 = rank === 2;
                      const isRank3 = rank === 3;
                      const isTop3 = isRank1 || isRank2 || isRank3;

                      let trophyColor = "text-text-muted";
                      if (isRank1) trophyColor = "text-yellow-400";
                      else if (isRank2) trophyColor = "text-gray-300";
                      else if (isRank3) trophyColor = "text-amber-600";

                      const stakedUsdc = Number(entry.totalStaked) / 1e6;

                      return (
                        <tr key={entry.address} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-5">
                            {isTop3 ? (
                              <div className="flex items-center gap-2">
                                <Trophy className={`${trophyColor} w-5 h-5`} />
                                <span className="font-code-sm font-bold">
                                  #{rank}
                                </span>
                              </div>
                            ) : (
                              <span className="font-code-sm text-text-muted font-bold ml-7">
                                #{rank}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-5">
                            <span className="font-code-sm text-primary">
                              {formatAddress(entry.address)}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <div className="w-32">
                              <div className="flex justify-between mb-1">
                                <span className="font-code-sm text-[10px] text-primary">{entry.winRate}%</span>
                              </div>
                              <div className="h-1 w-full bg-[#1e293b] rounded-full overflow-hidden">
                                <div className="h-full bg-[#ddb7ff]" style={{ width: `${Math.min(entry.winRate, 100)}%` }}></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 font-code-sm">
                            {stakedUsdc.toLocaleString()} USDC
                          </td>
                          <td className="px-6 py-5 font-code-sm">
                            {entry.correctPredictions} / {entry.totalPredictions}
                          </td>
                          <td className="px-6 py-5 text-right font-label-caps">
                            {entry.totalPredictions > 0 ? (
                              <span className="bg-[#4fdbc8]/10 text-tertiary px-2 py-1 rounded text-[10px]">ACTIVE</span>
                            ) : (
                              <span className="bg-[#1e293b] text-text-muted px-2 py-1 rounded text-[10px]">OBSERVER</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Right Sidebar */}
        <aside className="w-80 border-l border-outline-variant p-6 space-y-6 overflow-y-auto scrollbar-hide hidden xl:block flex-shrink-0 bg-surface-container-lowest/30 h-[calc(100vh-64px)]">
          {/* Platform Stats */}
          <div className="bg-surface-container-lowest border border-outline-variant p-5 rounded-xl">
            <h3 className="font-headline-md text-sm text-primary mb-4">Platform Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-sans text-xs text-text-muted">Total Markets</span>
                <span className="font-code-sm">{totalMarkets}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-sans text-xs text-text-muted">Resolved Markets</span>
                <span className="font-code-sm">{resolvedMarkets}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-sans text-xs text-text-muted">Active Markets</span>
                <span className="font-code-sm text-tertiary">{activeMarkets}</span>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-surface-container-lowest border border-outline-variant p-5 rounded-xl">
            <h3 className="font-headline-md text-sm text-primary mb-4">Recent Activity</h3>
            <div className="flex-1 flex items-center justify-center text-text-muted font-code-sm py-8">
              No activity yet
            </div>
          </div>

          {/* ARC Testnet Info */}
          <div className="bg-surface-container-lowest border border-outline-variant p-5 rounded-xl relative overflow-hidden group border-[#4fdbc8]/30">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></div>
                <h3 className="font-headline-md text-sm text-tertiary">ARC Testnet</h3>
              </div>
              <p className="text-text-muted font-code-sm text-xs mb-4">Chain ID: 5042002</p>
              <a href="https://testnet.arcscan.app" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-[#1e293b] px-3 py-1.5 rounded font-label-caps text-[10px] hover:bg-[#1e293b]/80 transition-all text-text-muted hover:text-white">
                VIEW EXPLORER
              </a>
            </div>
          </div>
        </aside>
      </div>
      </main>
    </div>
  );
}
