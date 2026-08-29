'use client';

import React, { useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import Sidebar from '@/components/layout/Sidebar';
import { Trophy } from 'lucide-react';
import Link from 'next/link';

interface LeaderboardEntry {
  address: string;
  totalStaked: string;
  correctPredictions: number;
  totalPredictions: number;
  winRate: number;
  totalPayout: string;
  resolvedStaked: string;
  netPnl: number;
  roi: number;
}

interface LeaderboardClientProps {
  leaderboard: LeaderboardEntry[];
  markets: any[];
  dataUnavailable?: boolean;
}

const formatAddress = (addr: string) => `${addr.substring(0, 6)}...${addr.slice(-4)}`;

export default function LeaderboardClient({
  leaderboard,
  markets,
  dataUnavailable = false,
}: LeaderboardClientProps) {
  const { address } = useAccount();
  const [metric, setMetric] = useState<'accuracy' | 'profit' | 'roi' | 'volume'>('accuracy');
  const [minPredictions, setMinPredictions] = useState(0);

  const {
    totalVolume,
    activeTradersCount,
    topPerformer,
    totalMarkets,
    resolvedMarkets,
    activeMarkets,
  } = useMemo(() => {
    const vol = markets.reduce((acc, m) => acc + (Number(m.followPool) + Number(m.fadePool)) / 1e6, 0);
    const tradersCount = leaderboard.length;
    const topPerf = leaderboard.length > 0 ? leaderboard[0] : null;
    const totMarkets = markets.length;
    const resMarkets = markets.filter(m => m.outcome !== 'PENDING').length;
    const actMarkets = markets.filter(m => m.outcome === 'PENDING').length;

    return {
      totalVolume: vol,
      activeTradersCount: tradersCount,
      topPerformer: topPerf,
      totalMarkets: totMarkets,
      resolvedMarkets: resMarkets,
      activeMarkets: actMarkets,
    };
  }, [leaderboard, markets]);

  const filteredLeaderboard = useMemo(() => {
    const filtered = leaderboard.filter((entry) => entry.totalPredictions >= minPredictions);
    return [...filtered].sort((a, b) => {
      if (metric === 'profit') return b.netPnl - a.netPnl;
      if (metric === 'roi') return b.roi - a.roi;
      if (metric === 'volume') return Number(b.totalStaked) - Number(a.totalStaked);
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return b.totalPredictions - a.totalPredictions;
    });
  }, [leaderboard, metric, minPredictions]);

  const connectedRank = address ? leaderboard.findIndex((entry) => entry.address.toLowerCase() === address.toLowerCase()) + 1 : 0;
  const connectedEntry = address ? leaderboard.find((entry) => entry.address.toLowerCase() === address.toLowerCase()) : undefined;

  return (
    <div className="flex min-h-screen bg-[#131313] text-[#e5e2e1]">
      <Sidebar />

      <main className="flex-1 lg:ml-[264px] pt-16 flex overflow-hidden">
        <div className="w-full flex">
        {/* Central Content Area */}
        <section className="flex-1 overflow-y-auto px-4 md:px-8 py-10 scrollbar-hide h-[calc(100vh-64px)]">
          {/* Header */}
          <div className="mb-10">
            <h1 className="font-headline-xl text-3xl font-bold text-on-surface mb-2 tracking-tight">Prediction Rankings</h1>
            <p className="text-text-muted font-sans text-base">Transparent performance rankings for ArcSignal prediction traders.</p>
          </div>

          {dataUnavailable && (
            <div className="mb-6 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-200" role="status">
              Trader rankings are temporarily unavailable while the index recovers. Live market volume remains available from ARC.
            </div>
          )}

          {connectedEntry && (
            <div className="mb-6 rounded-xl border border-[#ddb7ff]/30 bg-[#ddb7ff]/5 p-4 flex flex-wrap items-center justify-between gap-4">
              <div><p className="font-label-caps text-xs text-text-muted">Your leaderboard position</p><p className="font-code-sm text-xl text-primary">#{connectedRank}</p></div>
              <div className="text-sm"><span className="text-text-muted">Win rate </span><span className="font-code-sm text-tertiary">{connectedEntry.winRate}%</span></div>
              <div className="text-sm"><span className="text-text-muted">Net P&amp;L </span><span className={`font-code-sm ${connectedEntry.netPnl >= 0 ? 'text-tertiary' : 'text-error'}`}>{connectedEntry.netPnl >= 0 ? '+' : ''}{connectedEntry.netPnl.toFixed(2)} USDC</span></div>
            </div>
          )}

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
                <span className="font-code-sm text-2xl font-bold">{dataUnavailable ? '—' : activeTradersCount}</span>
                {!dataUnavailable && <span className="flex h-2 w-2 rounded-full bg-tertiary animate-pulse"></span>}
                <span className="text-text-muted text-sm font-medium">{dataUnavailable ? 'Index recovering' : 'Live'}</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl flex flex-col justify-between">
              <p className="text-text-muted font-sans text-sm font-medium mb-2">Top Performer</p>
              <div className="flex flex-col gap-1">
                {dataUnavailable ? (
                  <span className="font-code-sm text-text-muted">Unavailable</span>
                ) : topPerformer ? (
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
            <div className="flex flex-col gap-3 border-b border-outline-variant p-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                {([['accuracy', 'Accuracy'], ['profit', 'Net P&L'], ['roi', 'ROI'], ['volume', 'Volume']] as const).map(([value, label]) => <button key={value} onClick={() => setMetric(value)} aria-pressed={metric === value} className={`min-h-[40px] rounded-full px-3 text-xs transition-colors ${metric === value ? 'bg-[#ddb7ff] text-[#131313]' : 'text-text-muted hover:text-white'}`}>{label}</button>)}
              </div>
              <label className="flex items-center gap-2 text-xs text-text-muted">Minimum resolved <select value={minPredictions} onChange={(event) => setMinPredictions(Number(event.target.value))} className="min-h-[40px] rounded-lg border border-outline-variant bg-[#131313] px-2 text-white"><option value={0}>Any</option><option value={5}>5+</option><option value={10}>10+</option><option value={25}>25+</option></select></label>
            </div>
            {filteredLeaderboard.length === 0 ? (
              <div className="w-full py-16 flex items-center justify-center text-text-muted font-code-sm text-center">
                {dataUnavailable
                  ? 'Rankings will return when the indexed position history is available.'
                  : 'No traders have placed positions yet. Be the first to stake on a market.'}
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-hide">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-[#1e293b]/30">
                      <th className="px-6 py-4 font-label-caps text-xs text-text-muted whitespace-nowrap">Rank</th>
                      <th className="px-6 py-4 font-label-caps text-xs text-text-muted whitespace-nowrap">User</th>
                      <th className="px-6 py-4 font-label-caps text-xs text-text-muted whitespace-nowrap">Win Rate</th>
                      <th className="px-6 py-4 font-label-caps text-xs text-text-muted whitespace-nowrap">Net P&amp;L</th>
                      <th className="px-6 py-4 font-label-caps text-xs text-text-muted whitespace-nowrap">ROI</th>
                      <th className="px-6 py-4 font-label-caps text-xs text-text-muted whitespace-nowrap">Total Staked</th>
                      <th className="px-6 py-4 font-label-caps text-xs text-text-muted whitespace-nowrap">Predictions</th>
                      <th className="px-6 py-4 font-label-caps text-xs text-text-muted text-right whitespace-nowrap">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/50">
                    {filteredLeaderboard.map((entry, index) => {
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
                            <Link href={`/profile/${entry.address}`} className="font-code-sm text-primary hover:text-white transition-colors">
                              {formatAddress(entry.address)}
                            </Link>
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
                          <td className={`px-6 py-5 font-code-sm ${entry.netPnl >= 0 ? 'text-tertiary' : 'text-error'}`}>{entry.netPnl >= 0 ? '+' : ''}{entry.netPnl.toFixed(2)} USDC</td>
                          <td className={`px-6 py-5 font-code-sm ${entry.roi >= 0 ? 'text-tertiary' : 'text-error'}`}>{entry.roi >= 0 ? '+' : ''}{entry.roi.toFixed(1)}%</td>
                          <td className="px-6 py-5 font-code-sm">
                            {stakedUsdc.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC
                          </td>
                          <td className="px-6 py-5 font-code-sm">
                            {entry.correctPredictions} / {entry.totalPredictions}
                          </td>
                          <td className="px-6 py-5 text-right font-label-caps">
                            {entry.totalPredictions >= 5 ? (
                              <span className="bg-[#4fdbc8]/10 text-tertiary px-2 py-1 rounded text-[10px]">ACTIVE</span>
                            ) : entry.totalPredictions > 0 ? (
                              <span className="bg-[#fbbf24]/10 text-[#fbbf24] px-2 py-1 rounded text-[10px]">PROVISIONAL</span>
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
              Indexed activity unavailable
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
              <span className="inline-flex items-center gap-2 bg-[#1e293b] px-3 py-1.5 rounded font-label-caps text-[10px] text-text-muted">
                RPC VERIFIED
              </span>
            </div>
          </div>
        </aside>
      </div>
      </main>
    </div>
  );
}
