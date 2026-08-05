'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { ARCSIGNAL_ADDRESS, ARCSIGNAL_ABI } from '@/lib/contracts';
import type { Market } from '@/lib/types';
import { formatUnits, parseAbiItem } from 'viem';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { TrendingUp, TrendingDown, Clock, Trophy, Coins, BarChart3, AlertCircle } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Position {
  market: Market;
  side: 0 | 1;           // 0 = FOLLOW, 1 = FADE
  stakeRaw: bigint;       // raw USDC units (6 decimals)
  stakeUsdc: number;      // human-readable
  claimed: boolean;
  // derived
  isResolved: boolean;
  outcome: number;        // 0=unresolved, 1=follow wins, 2=fade wins
  userWon: boolean | null;
  payout: number;         // what they get back if they won (stake + profit)
  netPnl: number;         // +profit or -stake
}

type Tab = 'open' | 'resolved' | 'all';

// ─── Component ────────────────────────────────────────────────────────────────
export default function PortfolioClient() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('open');
  const [claiming, setClaiming] = useState<Record<string, boolean>>({});

  // ─── Fetch only this wallet's positions from Staked events ─────────────────
  const fetchPortfolio = useCallback(async () => {
    if (!address || !publicClient) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const stakedEvent = parseAbiItem('event Staked(string marketId, address user, uint8 side, uint256 amount)');
      const logs = await publicClient.getLogs({
        address: ARCSIGNAL_ADDRESS,
        event: stakedEvent,
        fromBlock: 0n,
        toBlock: 'latest',
      });

      const userStakes = new Map<string, { follow: bigint; fade: bigint }>();
      for (const log of logs) {
        const args = log.args as { marketId?: string; user?: string; side?: number; amount?: bigint };
        if (!args.user || args.user.toLowerCase() !== address.toLowerCase() || !args.marketId || args.amount === undefined) continue;
        const current = userStakes.get(args.marketId) ?? { follow: 0n, fade: 0n };
        if (Number(args.side) === 0) current.follow += args.amount;
        else current.fade += args.amount;
        userStakes.set(args.marketId, current);
      }

      if (userStakes.size === 0) {
        setPositions([]);
        setLoading(false);
        return;
      }

      const marketEntries = await Promise.all(Array.from(userStakes.entries()).map(async ([marketId, stake]) => {
        const raw = await publicClient.readContract({
          address: ARCSIGNAL_ADDRESS,
          abi: ARCSIGNAL_ABI,
          functionName: 'getMarket',
          args: [marketId],
        }) as {
          marketId: string; category: string; question: string; resolutionTime: bigint;
          followPool: bigint; fadePool: bigint; resolved: boolean; outcome: number;
        };
        return { raw, stake };
      }));

      const newPositions: Position[] = [];
      for (const { raw: data, stake } of marketEntries) {
        const market = {
          marketId: data.marketId,
          category: data.category === 'FOOTBALL' ? 'FOOTBALL' : 'CRYPTO',
          question: data.question,
          resolutionTime: Number(data.resolutionTime),
          followPool: data.followPool,
          fadePool: data.fadePool,
          resolved: data.resolved,
          outcome: data.outcome === 1 ? 'FOLLOW' : data.outcome === 2 ? 'FADE' : 'PENDING',
          status: data.resolved ? 'RESOLVED' : 'ACTIVE',
        } as Market;

        const winningSide = data.outcome === 1 ? 0 : data.outcome === 2 ? 1 : -1;
        const sides: Array<[0 | 1, bigint]> = [[0, stake.follow], [1, stake.fade]];
        for (const [side, stakeRaw] of sides) {
          if (stakeRaw === 0n) continue;
          const stakeUsdc = Number(formatUnits(stakeRaw, 6));
          const isResolved = data.resolved;
          const userWon = isResolved && winningSide >= 0 ? side === winningSide : null;
          let payout = 0;
          let netPnl = 0;

          if (isResolved && userWon) {
            const winPool = winningSide === 0 ? data.followPool : data.fadePool;
            const losePool = winningSide === 0 ? data.fadePool : data.followPool;
            payout = stakeUsdc + (stakeUsdc * Number(losePool)) / Number(winPool || 1n);
            netPnl = payout - stakeUsdc;
          } else if (isResolved && userWon === false) {
            netPnl = -stakeUsdc;
          }

          let claimed = false;
          if (isResolved && userWon) {
            claimed = await publicClient.readContract({
              address: ARCSIGNAL_ADDRESS,
              abi: ARCSIGNAL_ABI,
              functionName: 'claimed',
              args: [data.marketId, address],
            }) as boolean;
          }

          newPositions.push({
            market, side, stakeRaw, stakeUsdc, claimed,
            isResolved, outcome: data.outcome, userWon, payout, netPnl,
          });
        }
      }

      setPositions(newPositions);
    } catch (err) {
      console.error('Portfolio fetch failed:', err);
      toast.error('Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  }, [address, publicClient]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  // ─── Claim Handler ──────────────────────────────────────────────────────────
  const handleClaim = useCallback(async (marketId: string) => {
    if (!walletClient || !publicClient || !address) return;
    const toastId = toast.loading('Waiting for wallet confirmation…');
    try {
      setClaiming(p => ({ ...p, [marketId]: true }));
      const { request } = await publicClient.simulateContract({
        account: address,
        address: ARCSIGNAL_ADDRESS,
        abi: ARCSIGNAL_ABI,
        functionName: 'claimWinnings',
        args: [marketId],
      });
      const hash = await walletClient.writeContract(request);
      toast.loading('Transaction submitted, confirming…', { id: toastId });
      await publicClient.waitForTransactionReceipt({ hash });
      toast.success('Winnings claimed!', { id: toastId });
      await fetchPortfolio();
    } catch (err: any) {
      console.error('Claim failed:', err);
      toast.error('Claim failed: ' + (err?.shortMessage || err?.message || 'Unknown error'), { id: toastId });
    } finally {
      setClaiming(p => ({ ...p, [marketId]: false }));
    }
  }, [walletClient, publicClient, address, fetchPortfolio]);

  // ─── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let totalStaked = 0;
    let totalPnl = 0;
    let wins = 0;
    let resolved = 0;
    let unclaimed = 0;

    positions.forEach(p => {
      totalStaked += p.stakeUsdc;
      if (p.isResolved && p.userWon !== null) {
        resolved++;
        totalPnl += p.netPnl;
        if (p.userWon) {
          wins++;
          if (!p.claimed) unclaimed += p.payout;
        }
      }
    });

    const winRate = resolved > 0 ? (wins / resolved) * 100 : 0;
    return { totalStaked, totalPnl, winRate, unclaimed, wins, resolved, openCount: positions.filter(p => !p.isResolved || (p.isResolved && p.userWon && !p.claimed)).length };
  }, [positions]);

  // ─── Filtered Positions ─────────────────────────────────────────────────────
  const displayed = useMemo(() => {
    if (activeTab === 'open')     return positions.filter(p => !p.isResolved || (p.isResolved && p.userWon && !p.claimed));
    if (activeTab === 'resolved') return positions.filter(p => p.isResolved);
    return positions;
  }, [positions, activeTab]);

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-[#090b11] text-slate-100">
      <Sidebar />
      <main className="lg:ml-[240px] pt-20 pb-20 flex-1 min-w-0">
        <div className="max-w-[1440px] mx-auto w-full px-4 md:px-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">Portfolio</h1>
          <p className="font-mono text-xs text-slate-400 uppercase tracking-wider">
            On-Chain Positions · {address ? `${address.slice(0,6)}…${address.slice(-4)}` : 'Not connected'}
          </p>
        </div>

        {!address ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center border border-slate-800 rounded-xl bg-[#121622]">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
              <AlertCircle size={24} className="text-slate-400" />
            </div>
            <p className="text-base font-semibold text-white">Connect your wallet</p>
            <p className="text-xs text-slate-400 font-mono">Connect your Web3 wallet to view on-chain positions</p>
          </div>
        ) : loading ? (
          <>
            {/* ── Stats Bar Skeleton ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
               {Array.from({length: 4}).map((_, i) => (
                 <div key={i} className="rounded-xl border border-slate-800 bg-[#121622] p-4 h-[84px] animate-pulse" />
               ))}
            </div>

            {/* ── Positions List Skeleton ── */}
            <div className="flex flex-col gap-3">
               {Array.from({length: 3}).map((_, i) => (
                 <div key={i} className="rounded-xl border border-slate-800 bg-[#121622] p-5 h-[146px] animate-pulse" />
               ))}
            </div>
          </>
        ) : (
          <>
            {/* ── Stats Bar ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard icon={<Coins size={16} />} label="Total Staked" value={`${stats.totalStaked.toFixed(2)} USDC`} />
              <StatCard
                icon={stats.totalPnl >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                label="Net P&L"
                value={`${stats.totalPnl >= 0 ? '+' : ''}${stats.totalPnl.toFixed(2)} USDC`}
                positive={stats.totalPnl >= 0}
                negative={stats.totalPnl < 0}
              />
              <StatCard icon={<Trophy size={16} />} label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} />
              <StatCard
                icon={<BarChart3 size={16} />}
                label="Unclaimed"
                value={`${stats.unclaimed.toFixed(2)} USDC`}
                highlight={stats.unclaimed > 0}
              />
            </div>

            {/* ── Tabs ── */}
            <div className="flex items-center gap-1 bg-[#121622] border border-slate-800 rounded-lg p-1 w-fit">
              {(['open', 'resolved', 'all'] as Tab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 font-mono text-xs uppercase tracking-wider rounded transition-colors ${
                    activeTab === tab
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab === 'open' ? `Open (${stats.openCount})` : tab === 'resolved' ? `Resolved (${stats.resolved})` : `All (${positions.length})`}
                </button>
              ))}
            </div>

            {/* ── Positions List ── */}
            {displayed.length === 0 ? (
              <EmptyState tab={activeTab} />
            ) : (
              <div className="flex flex-col gap-3">
                {displayed.map(pos => (
                  <PositionCard
                    key={`${pos.market.marketId}-${pos.side}`}
                    pos={pos}
                    onClaim={handleClaim}
                    claiming={!!claiming[pos.market.marketId]}
                  />
                ))}
              </div>
            )}
          </>
        )}
        </div>
      </main>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatCard = React.memo(function StatCard({ icon, label, value, positive, negative, highlight }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${
      highlight ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-800 bg-[#121622]'
    }`}>
      <div className={`flex items-center gap-2 mb-1.5 text-xs font-mono uppercase tracking-wider ${
        highlight ? 'text-emerald-400' : 'text-slate-400'
      }`}>
        {icon}
        {label}
      </div>
      <p className={`font-mono font-bold text-lg ${
        positive ? 'text-emerald-400' : negative ? 'text-rose-400' : highlight ? 'text-emerald-400' : 'text-white'
      }`}>
        {value}
      </p>
    </div>
  );
});

const PositionCard = React.memo(function PositionCard({ pos, onClaim, claiming }: { pos: Position; onClaim: (id: string) => void; claiming: boolean }) {
  const isFollow = pos.side === 0;
  const marketTitle = pos.market.question || pos.market.marketId;
  const shortTitle = marketTitle.length > 70 ? marketTitle.slice(0, 70) + '…' : marketTitle;

  const followPoolUsdc = Number(formatUnits(pos.market.followPool as bigint, 6));
  const fadePoolUsdc   = Number(formatUnits(pos.market.fadePool   as bigint, 6));
  const totalPool = followPoolUsdc + fadePoolUsdc;
  const sidePool  = isFollow ? followPoolUsdc : fadePoolUsdc;
  const odds      = sidePool > 0 && totalPool > 0 ? (totalPool / sidePool).toFixed(2) : '—';

  const canClaim = pos.isResolved && pos.userWon === true && !pos.claimed;

  return (
    <div className={`rounded-xl border p-5 transition-all ${
      canClaim
        ? 'border-emerald-500/40 bg-emerald-500/5'
        : 'border-slate-800 bg-[#121622]'
    }`}>
      <div className="flex flex-col gap-4">

        {/* Top row: badges + title */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-slate-800 text-slate-300">
              {pos.market.category}
            </span>

            {!pos.isResolved && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border border-slate-700 text-slate-400">
                PENDING
              </span>
            )}
            {pos.isResolved && pos.userWon === true && !pos.claimed && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                WON
              </span>
            )}
            {pos.isResolved && pos.userWon === true && pos.claimed && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border border-slate-700 text-slate-400">
                CLAIMED
              </span>
            )}
            {pos.isResolved && pos.userWon === false && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border border-rose-500/30 text-rose-400 bg-rose-500/10">
                LOST
              </span>
            )}
          </div>

          <div className="flex items-start justify-between gap-4">
            <Link href={`/market/${pos.market.marketId}`} className="hover:text-indigo-400 transition-colors flex-1">
              <p className="font-semibold text-white text-sm leading-snug">{shortTitle}</p>
            </Link>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <MiniStat label="Position" value={isFollow ? 'FOLLOW AI (YES)' : 'FADE AI (NO)'} color={isFollow ? '#10b981' : '#f43f5e'} />
          <MiniStat label="Staked" value={`${pos.stakeUsdc.toFixed(2)} USDC`} />
          <MiniStat label="Pool Odds" value={`${odds}×`} />
          {pos.isResolved ? (
            pos.userWon === true ? (
              <MiniStat label="Payout" value={`+${pos.payout.toFixed(2)} USDC`} color="#10b981" />
            ) : (
              <MiniStat label="P&L" value={`-${pos.stakeUsdc.toFixed(2)} USDC`} color="#f43f5e" />
            )
          ) : (
            <MiniStat label="Est. Payout" value={sidePool > 0 ? `${(pos.stakeUsdc * (totalPool / sidePool)).toFixed(2)} USDC` : '—'} color="#94a3b8" />
          )}
        </div>

        {/* Claim button */}
        {canClaim && (
          <button
            onClick={() => onClaim(pos.market.marketId)}
            disabled={claiming}
            className="w-full py-2.5 rounded-lg font-mono text-xs font-bold tracking-wider uppercase transition-all bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {claiming ? 'Claiming…' : `Claim Winnings (${pos.payout.toFixed(2)} USDC)`}
          </button>
        )}
      </div>
    </div>
  );
});

const MiniStat = React.memo(function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-[#0b0e17] border border-slate-800 rounded-lg p-2.5">
      <p className="font-mono text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="font-mono font-bold text-xs" style={{ color: color || '#f1f5f9' }}>{value}</p>
    </div>
  );
});

const EmptyState = React.memo(function EmptyState({ tab }: { tab: Tab }) {
  const msgs: Record<Tab, { title: string; sub: string }> = {
    open:     { title: 'No open positions', sub: 'Browse live markets and stake on an AI prediction to get started.' },
    resolved: { title: 'No resolved positions', sub: 'Your past positions will appear here once markets close.' },
    all:      { title: 'No positions yet', sub: 'You have not staked on any markets with this wallet.' },
  };
  const { title, sub } = msgs[tab];
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center border border-slate-800 rounded-xl bg-[#121622]">
      <Clock size={32} className="text-slate-500" />
      <p className="text-base font-semibold text-white">{title}</p>
      <p className="font-mono text-xs text-slate-400 max-w-xs">{sub}</p>
      <Link href="/markets" className="mt-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-semibold tracking-wider uppercase transition-colors">
        Browse Markets
      </Link>
    </div>
  );
});

