'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { ARCSIGNAL_ADDRESS, ARCSIGNAL_ABI } from '@/lib/contracts';
import type { Market } from '@/lib/types';
import { formatUnits, parseAbiItem } from 'viem';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { TrendingUp, TrendingDown, Clock, Trophy, Coins, BarChart3, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';

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
  isCancelled: boolean;
}

type Tab = 'open' | 'resolved' | 'all';

type ChainMarket = {
  marketId: string;
  category: string;
  question: string;
  resolutionTime: bigint;
  followPool: bigint;
  fadePool: bigint;
  resolved: boolean;
  outcome: number;
};

const STAKED_EVENT = parseAbiItem('event Staked(string marketId, address user, uint8 side, uint256 amount)');
const POSITION_CACHE_PREFIX = 'arcsignal:portfolio:market-ids:';
const BLOCK_CACHE_PREFIX = 'arcsignal:portfolio:last-block:';
const CONTRACT_DEPLOY_BLOCK = 50_012_000n;
const LOG_CHUNK_SIZE = 2_000n;
const MAX_FALLBACK_BLOCKS = 100_000n;
const PENDING_STAKES_KEY = 'arcsignal:portfolio:pending-stakes';
type PendingStake = { address: string; marketId: string; txHash: string; createdAt: string };

function cachedMarketIds(address: string): string[] {
  try {
    const value = window.localStorage.getItem(`${POSITION_CACHE_PREFIX}${address.toLowerCase()}`);
    return value ? JSON.parse(value) as string[] : [];
  } catch {
    return [];
  }
}

function saveMarketIds(address: string, ids: string[]) {
  try {
    window.localStorage.setItem(`${POSITION_CACHE_PREFIX}${address.toLowerCase()}`, JSON.stringify(ids));
  } catch {
    // Storage is an optimization; portfolio reads remain authoritative.
  }
}

function cachedLastBlock(address: string): bigint | null {
  try {
    const value = window.localStorage.getItem(`${BLOCK_CACHE_PREFIX}${address.toLowerCase()}`);
    return value ? BigInt(value) : null;
  } catch {
    return null;
  }
}

function saveLastBlock(address: string, block: bigint) {
  try {
    window.localStorage.setItem(`${BLOCK_CACHE_PREFIX}${address.toLowerCase()}`, block.toString());
  } catch {
    // Storage is an optimization; portfolio reads remain authoritative.
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PortfolioClient() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('open');
  const [claiming, setClaiming] = useState<Record<string, boolean>>({});
  const [claimTxHashes, setClaimTxHashes] = useState<Record<string, string>>({});
  const hasLoadedRef = useRef(false);

  // ─── Fetch this wallet's positions with a cache and authoritative reads ────
  const fetchPortfolio = useCallback(async () => {
    if (!address || !publicClient) {
      setLoading(false);
      return;
    }

    let pendingStake: PendingStake | null = null;
    try {
      const pending = JSON.parse(localStorage.getItem(PENDING_STAKES_KEY) ?? '[]') as Array<Partial<PendingStake>>;
      const candidate = pending.find((item): item is PendingStake =>
        typeof item.address === 'string'
        && item.address.toLowerCase() === address.toLowerCase()
        && typeof item.marketId === 'string'
        && typeof item.txHash === 'string'
        && typeof item.createdAt === 'string'
        && Date.now() - Number(item.createdAt) < 30 * 60 * 1000
      );
      pendingStake = candidate ?? null;
    } catch {
      pendingStake = null;
    }

    // Neon is the fast read model. A pending transaction uses the confirmed
    // receipt directly so the UI does not wait for the background indexer.
    try {
      const query = new URLSearchParams({ address });
      if (pendingStake?.txHash) query.set('txHash', pendingStake.txHash);
      const indexedResponse = await fetch(`/api/portfolio?${query.toString()}`, { cache: 'no-store' });
      if (indexedResponse.ok) {
        const indexed = (await indexedResponse.json()) as {
          source?: string;
          complete?: boolean;
          positions?: Array<{
            marketId: string;
            side: 0 | 1;
            stakeRaw: string;
            stakeUsdc: number;
            claimed: boolean;
            isResolved: boolean;
            outcome: number;
            userWon: boolean | null;
            payout: number;
            netPnl: number;
            market: {
              marketId: string;
              category: string;
              question: string;
              resolutionTime: number;
              followPool: string;
              fadePool: string;
              resolved: boolean;
              outcome: number;
              status?: string;
            };
          }>;
        };

        if (Array.isArray(indexed.positions)) {
          const mappedPositions = indexed.positions.map((position) => ({
              ...position,
              stakeRaw: BigInt(position.stakeRaw),
              market: {
                ...position.market,
                category: position.market.category === 'FOOTBALL' ? 'FOOTBALL' : 'CRYPTO',
                followPool: BigInt(position.market.followPool),
                fadePool: BigInt(position.market.fadePool),
                outcome: position.market.outcome === 1 ? 'FOLLOW' : position.market.outcome === 2 ? 'FADE' : 'PENDING',
                status: position.market.resolved ? (position.market.outcome === 0 ? 'CANCELLED' : 'RESOLVED') : 'OPEN',
              },
              isCancelled: position.isResolved && position.outcome === 0,
            } as Position));

          if (pendingStake && mappedPositions.some((position) => position.market.marketId === pendingStake?.marketId)) {
            try {
              const pending = JSON.parse(localStorage.getItem(PENDING_STAKES_KEY) ?? '[]') as Array<{ txHash?: string }>;
              localStorage.setItem(PENDING_STAKES_KEY, JSON.stringify(pending.filter((item) => item.txHash !== pendingStake?.txHash)));
            } catch {
              // Ignore storage cleanup failures.
            }
          }

          // An explicitly complete empty response is authoritative. If the
          // server reports an incomplete chain scan, preserve the current view
          // and let the polling effect retry instead of displaying false zeroes.
          if (mappedPositions.length > 0 || indexed.complete !== false || indexed.source === 'neon') {
            setPositions(mappedPositions);
            hasLoadedRef.current = true;
            setLoading(false);
            return;
          }

          // Keep the current view while the server retries an incomplete read.
          // The polling effect below will retry without launching a large
          // client-side scan across every market.
          setLoading(false);
          return;
        }

        if (pendingStake) {
          // The transaction may still be propagating to the server RPC.
          // Retry with the same receipt on the next polling cycle.
          setLoading(false);
          return;
        }
      }
    } catch (error) {
      console.warn('Indexed portfolio API unavailable; using client fallback.', error);
    }

    // Client-side fallback: check active markets directly
    const readPositions = async (marketIds: string[]) => {
      const uniqueIds = [...new Set(marketIds)];
      const readOne = async (marketId: string) => {
        const [data, followRaw, fadeRaw] = await Promise.all([
          publicClient.readContract({ address: ARCSIGNAL_ADDRESS, abi: ARCSIGNAL_ABI, functionName: 'getMarket', args: [marketId] }) as Promise<ChainMarket>,
          publicClient.readContract({ address: ARCSIGNAL_ADDRESS, abi: ARCSIGNAL_ABI, functionName: 'followStakes', args: [marketId, address] }) as Promise<bigint>,
          publicClient.readContract({ address: ARCSIGNAL_ADDRESS, abi: ARCSIGNAL_ABI, functionName: 'fadeStakes', args: [marketId, address] }) as Promise<bigint>,
        ]);
        const claimed = data.resolved && (data.outcome === 1 ? followRaw : fadeRaw) > 0n
          ? await publicClient.readContract({ address: ARCSIGNAL_ADDRESS, abi: ARCSIGNAL_ABI, functionName: 'claimed', args: [marketId, address] }) as boolean
          : false;
        return { data, followRaw, fadeRaw, claimed };
      };

      const results: PromiseSettledResult<Awaited<ReturnType<typeof readOne>>>[] = [];
      for (let i = 0; i < uniqueIds.length; i += 4) {
        results.push(...await Promise.allSettled(uniqueIds.slice(i, i + 4).map(readOne)));
      }

      const newPositions: Position[] = [];
      for (const result of results) {
        if (result.status !== 'fulfilled') continue;
        const { data, followRaw, fadeRaw, claimed } = result.value;
        const market = {
          marketId: data.marketId,
          category: data.category === 'FOOTBALL' ? 'FOOTBALL' : 'CRYPTO',
          question: data.question,
          resolutionTime: Number(data.resolutionTime),
          followPool: data.followPool,
          fadePool: data.fadePool,
          resolved: data.resolved,
          outcome: data.outcome === 1 ? 'FOLLOW' : data.outcome === 2 ? 'FADE' : 'PENDING',
          status: data.resolved ? (data.outcome === 0 ? 'CANCELLED' : 'RESOLVED') : 'OPEN',
        } as Market;

        const winningSide = data.outcome === 1 ? 0 : data.outcome === 2 ? 1 : -1;
        for (const [side, stakeRaw] of [[0, followRaw], [1, fadeRaw]] as Array<[0 | 1, bigint]>) {
          if (stakeRaw === 0n) continue;
          const stakeUsdc = Number(formatUnits(stakeRaw, 6));
          const userWon = data.resolved && winningSide >= 0 ? side === winningSide : null;
          let payout = 0;
          let netPnl = 0;

          if (data.resolved && userWon) {
            const winPool = winningSide === 0 ? data.followPool : data.fadePool;
            const losePool = winningSide === 0 ? data.fadePool : data.followPool;
            payout = stakeUsdc + (stakeUsdc * Number(losePool)) / Number(winPool || 1n);
            netPnl = payout - stakeUsdc;
          } else if (data.resolved && userWon === false) {
            netPnl = -stakeUsdc;
          }

          newPositions.push({ market, side, stakeRaw, stakeUsdc, claimed, isResolved: data.resolved, outcome: data.outcome, userWon, payout, netPnl, isCancelled: data.resolved && data.outcome === 0 });
        }
      }
      return newPositions;
    };

    try {
      const cachedIds = cachedMarketIds(address);
      if (cachedIds.length > 0) {
        const cachedPositions = await readPositions(cachedIds);
        setPositions(cachedPositions);
        hasLoadedRef.current = true;
        setLoading(false);
      }

      const marketsRes = await fetch('/api/markets');
      if (marketsRes.ok) {
        const payload = await marketsRes.json();
        const marketIds = (payload.markets ?? []).map((m: any) => m.marketId);
        if (marketIds.length > 0) {
          saveMarketIds(address, marketIds);
          const freshPositions = await readPositions(marketIds);
          setPositions(freshPositions);
          hasLoadedRef.current = true;
        }
      }
    } catch (err) {
      console.error('Portfolio client fallback failed:', err);
    } finally {
      hasLoadedRef.current = true;
      setLoading(false);
    }
  }, [address, publicClient]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void fetchPortfolio();
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [fetchPortfolio]);

  useEffect(() => {
    const refreshOnFocus = () => {
      if (document.visibilityState === 'visible') void fetchPortfolio();
    };
    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshOnFocus);
    return () => {
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshOnFocus);
    };
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
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status === 'reverted') throw new Error('The transaction reverted on-chain. No funds were claimed.');
      setClaimTxHashes(prev => ({ ...prev, [marketId]: hash }));

      // Optimistically mark position as claimed so UI updates instantly
      setPositions(prev => prev.map(p =>
        p.market.marketId === marketId && p.userWon === true
          ? { ...p, claimed: true }
          : p
      ));

      toast.success('Winnings claimed!', { id: toastId });
      // Background refresh for full data sync
      fetchPortfolio();
    } catch (err: any) {
      console.error('Claim failed:', err);
      const raw = err?.shortMessage || err?.message || 'Unknown error';
      const lower = raw.toLowerCase();
      let friendly = raw;
      if (lower.includes('user rejected') || lower.includes('rejected the request'))
        friendly = 'You rejected the transaction in your wallet.';
      else if (lower.includes('already claimed'))
        friendly = 'Already claimed — winnings were already withdrawn.';
      else if (lower.includes('no winning stake'))
        friendly = 'No winning stake found for this market.';
      else if (lower.includes('not resolved'))
        friendly = "Market hasn't been resolved yet.";
      else if (lower.includes('reverted'))
        friendly = 'Transaction failed on-chain. You may have already claimed.';
      toast.error(friendly, { id: toastId });
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
      if (p.isResolved && !p.isCancelled && p.userWon !== null) {
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
    <div className="flex min-h-screen bg-[#131313] text-[#e5e2e1]">
      <Sidebar />
      <main className="lg:ml-[264px] pt-24 pb-20 flex-1 min-w-0">
        <div className="max-w-[1440px] mx-auto w-full px-4 md:px-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-[family-name:var(--font-hanken)] text-3xl font-bold text-[#ddb7ff] mb-1">Portfolio</h1>
          <p className="font-[family-name:var(--font-jetbrains-mono)] text-xs text-[#94a3b8] tracking-widest uppercase">
            On-Chain Positions · {address ? `${address.slice(0,6)}…${address.slice(-4)}` : 'Not connected'}
          </p>
        </div>

        {!address ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-[#1c1b1b] border border-[#3a3939] flex items-center justify-center">
              <AlertCircle size={28} className="text-[#94a3b8]" />
            </div>
            <p className="font-[family-name:var(--font-hanken)] text-lg text-white">Connect your wallet</p>
            <p className="font-[family-name:var(--font-jetbrains-mono)] text-xs text-[#94a3b8]">to view your positions</p>
          </div>
        ) : loading ? (
          <>
            {/* ── Stats Bar Skeleton ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
               {Array.from({length: 4}).map((_, i) => (
                 <div key={i} className="rounded-xl border border-[#3a3939] bg-[#1c1b1b] p-5 h-[100px] animate-pulse" />
               ))}
            </div>

            {/* ── Tabs Skeleton ──────────────────────────────────────────────────────── */}
            <div className="flex items-center border border-[#3a3939] rounded-lg overflow-hidden mb-6 w-fit animate-pulse bg-[#1c1b1b]">
               <div className="w-24 h-9 border-r border-[#3a3939]" />
               <div className="w-32 h-9 border-r border-[#3a3939]" />
               <div className="w-20 h-9" />
            </div>

            {/* ── Positions List Skeleton ────────────────────────────────────────────── */}
            <div className="flex flex-col gap-3">
               {Array.from({length: 3}).map((_, i) => (
                 <div key={i} className="rounded-xl border border-[#3a3939] bg-[#1c1b1b] p-5 h-[146px] animate-pulse" />
               ))}
            </div>
          </>
        ) : (
          <>
            {/* ── Stats Bar (Unified Analytics Design System) ─────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCardCustom
                title="Total Staked"
                value={`${stats.totalStaked.toFixed(2)} USDC`}
                icon={<Coins size={16} />}
                accent={{ color: '#c4b5fd', bg: 'rgba(196,181,253,0.09)' }}
              />
              <StatCardCustom
                title="Net P&L"
                value={`${stats.totalPnl >= 0 ? '+' : ''}${stats.totalPnl.toFixed(2)} USDC`}
                icon={stats.totalPnl >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                accent={{
                  color: stats.totalPnl >= 0 ? '#86efac' : '#ffb4ab',
                  bg: stats.totalPnl >= 0 ? 'rgba(134,239,172,0.09)' : 'rgba(255,180,171,0.09)'
                }}
              />
              <StatCardCustom
                title="Win Rate"
                value={`${stats.winRate.toFixed(1)}%`}
                icon={<Trophy size={16} />}
                accent={{ color: '#fbbf24', bg: 'rgba(251,191,36,0.09)' }}
              />
              <StatCardCustom
                title="Unclaimed"
                value={`${stats.unclaimed.toFixed(2)} USDC`}
                icon={<BarChart3 size={16} />}
                accent={{ color: '#4fdbc8', bg: 'rgba(79,219,200,0.09)' }}
              />
            </div>

            {/* ── Tabs (Unified Primary Palette) ──────────────────────────────────────── */}
            <div className="flex items-center gap-0 border border-[#3a3939] rounded-lg overflow-hidden mb-6 w-fit bg-[#1c1b1b]">
              {(['open', 'resolved', 'all'] as Tab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  aria-pressed={activeTab === tab}
                  className={`min-h-[44px] px-5 py-2.5 font-[family-name:var(--font-jetbrains-mono)] text-xs uppercase tracking-widest transition-all ${
                    activeTab === tab
                      ? 'bg-[#ddb7ff] text-[#0f172a] font-bold'
                      : 'bg-transparent text-[#94a3b8] hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab === 'open' ? `Open (${stats.openCount})` : tab === 'resolved' ? `Resolved (${stats.resolved})` : `All (${positions.length})`}
                </button>
              ))}
            </div>

            {/* ── Positions List ────────────────────────────────────────────── */}
            {displayed.length === 0 ? (
              <EmptyState tab={activeTab} onRetry={fetchPortfolio} />
            ) : (
              <div className="flex flex-col gap-6">
                {(['action', 'open', 'history'] as const).map((group) => {
                  const groupPositions = displayed.filter((pos) => group === 'action'
                    ? pos.isResolved && pos.userWon === true && !pos.claimed
                    : group === 'open' ? !pos.isResolved
                    : pos.isResolved && !(pos.userWon === true && !pos.claimed));
                  if (groupPositions.length === 0) return null;
                  const title = group === 'action' ? 'Needs action' : group === 'open' ? 'Awaiting resolution' : 'Settlement history';
                  return <section key={group} className="space-y-3">
                    <div className="flex items-center gap-3"><h2 className="font-[family-name:var(--font-jetbrains-mono)] text-[11px] uppercase tracking-[0.18em] text-[#94a3b8]">{title}</h2><span className="text-[10px] text-[#64748b]">{groupPositions.length}</span></div>
                    {groupPositions.map(pos => <PositionCard key={`${pos.market.marketId}-${pos.side}`} pos={pos} onClaim={handleClaim} claiming={!!claiming[pos.market.marketId]} claimTxHash={claimTxHashes[pos.market.marketId]} />)}
                  </section>;
                })}
              </div>
            )}
          </>
        )}
        </div>
      </main>
    </div>
  );
}

// ─── Unified StatCard Component ───────────────────────────────────────────────

const StatCardCustom = React.memo(function StatCardCustom({
  title,
  value,
  icon,
  accent,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  accent: { color: string; bg: string };
}) {
  return (
    <div
      className="bg-[#1c1b1b] border border-[#3a3939] relative overflow-hidden flex flex-col h-full rounded-xl p-5"
      style={{ borderTop: `2px solid ${accent.color}` }}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="font-[family-name:var(--font-inter)] text-[0.72rem] font-medium uppercase tracking-[0.1em] text-[#64748b]">
          {title}
        </span>
        <span
          className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0"
          style={{ color: accent.color, backgroundColor: accent.bg }}
        >
          {icon}
        </span>
      </div>
      <div className="mt-auto font-[family-name:var(--font-jetbrains-mono)] text-2xl font-bold tracking-tight" style={{ color: accent.color }}>
        {value}
      </div>
    </div>
  );
});

const PositionCard = React.memo(function PositionCard({ pos, onClaim, claiming, claimTxHash }: { pos: Position; onClaim: (id: string) => void; claiming: boolean; claimTxHash?: string }) {
  const isFollow = pos.side === 0;
  const marketTitle = pos.market.question || pos.market.marketId;
  const shortTitle = marketTitle.length > 70 ? marketTitle.slice(0, 70) + '…' : marketTitle;

  const followPoolUsdc = Number(formatUnits(pos.market.followPool as bigint, 6));
  const fadePoolUsdc   = Number(formatUnits(pos.market.fadePool   as bigint, 6));
  const totalPool = followPoolUsdc + fadePoolUsdc;
  const sidePool  = isFollow ? followPoolUsdc : fadePoolUsdc;
  const odds      = sidePool > 0 && totalPool > 0 ? (totalPool / sidePool).toFixed(2) : '—';

  const canClaim = pos.isResolved && pos.userWon === true && !pos.claimed;
  const awaitingResolution = !pos.isResolved && Math.floor(Date.now() / 1000) >= pos.market.resolutionTime;
  const stageLabel = pos.isCancelled ? 'Cancelled' : pos.isResolved ? 'Settled' : awaitingResolution ? 'Awaiting resolution' : 'Open for staking';
  const stageProgress = pos.isResolved || pos.isCancelled ? 100 : awaitingResolution ? 75 : 35;

  return (
    <div className={`rounded-xl border p-5 transition-all ${
      canClaim
        ? 'border-[#34d399]/40 bg-[#34d399]/5 shadow-[0_0_24px_rgba(52,211,153,0.08)]'
        : pos.isResolved && pos.userWon === false
        ? 'border-[#3a3939] bg-[#131313] opacity-75'
        : 'border-[#3a3939] bg-[#131313]'
    }`}>
      <div className="flex flex-col gap-4">

        {/* Top row: badges + title */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* Category */}
            <span className={`px-2 py-0.5 rounded text-[10px] font-[family-name:var(--font-jetbrains-mono)] uppercase tracking-widest border ${
              pos.market.category === 'FOOTBALL'
                ? 'bg-[#38bdf8]/10 text-[#38bdf8] border-[#38bdf8]/20'
                : 'bg-[#818cf8]/10 text-[#818cf8] border-[#818cf8]/20'
            }`}>{pos.market.category}</span>

            {/* Status */}
            {!pos.isResolved && (
              <span className="px-2 py-0.5 rounded text-[10px] font-[family-name:var(--font-jetbrains-mono)] uppercase tracking-widest border border-[#8e8e8e]/30 text-[#8e8e8e]">
                PENDING
              </span>
            )}
            {pos.isResolved && pos.userWon === true && !pos.claimed && (
              <span className="px-2 py-0.5 rounded text-[10px] font-[family-name:var(--font-jetbrains-mono)] uppercase tracking-widest border border-[#34d399]/30 text-[#34d399] bg-[#34d399]/10">
                WON
              </span>
            )}
            {pos.isResolved && pos.userWon === true && pos.claimed && (
              <span className="px-2 py-0.5 rounded text-[10px] font-[family-name:var(--font-jetbrains-mono)] uppercase tracking-widest border border-[#8e8e8e]/30 text-[#8e8e8e]">
                CLAIMED
              </span>
            )}
            {pos.isCancelled && (
              <span className="px-2 py-0.5 rounded text-[10px] font-[family-name:var(--font-jetbrains-mono)] uppercase tracking-widest border border-[#fbbf24]/30 text-[#fbbf24] bg-[#fbbf24]/10">CANCELLED</span>
            )}
            {pos.isResolved && !pos.isCancelled && pos.userWon === false && (
              <span className="px-2 py-0.5 rounded text-[10px] font-[family-name:var(--font-jetbrains-mono)] uppercase tracking-widest border border-[#f87171]/30 text-[#f87171] bg-[#f87171]/10">
                LOST
              </span>
            )}
          </div>

          <div className="flex items-start justify-between gap-4">
            <Link href={`/market/${pos.market.marketId}`} className="hover:text-[#a855f7] transition-colors flex-1">
              <p className="font-[family-name:var(--font-hanken)] font-semibold text-white text-sm leading-snug">{shortTitle}</p>
            </Link>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-widest text-[#64748b]"><span>Position progress</span><span className="text-[#ddb7ff]">{stageLabel}</span></div>
          <div className="h-1.5 rounded-full bg-[#2a2929] overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-[#a855f7] to-[#ddb7ff]" style={{ width: `${stageProgress}%` }} /></div>
          <p className="text-[11px] text-[#64748b]">{pos.isCancelled ? 'This market was cancelled. No outcome was recorded.' : pos.isResolved ? 'Settlement is complete.' : `Resolution target: ${new Date(pos.market.resolutionTime * 1000).toLocaleString()}`}</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <MiniStat label="Position" value={isFollow ? 'FOLLOW AI' : 'FADE AI'} color={isFollow ? '#34d399' : '#f87171'} />
          <MiniStat label="Staked" value={`${pos.stakeUsdc.toFixed(2)} USDC`} />
          <MiniStat label="Pool Odds" value={`${odds}×`} />
          {pos.isCancelled ? (
            <MiniStat label="Settlement" value="Cancelled" color="#fbbf24" />
          ) : pos.isResolved ? (
            pos.userWon === true ? (
              <MiniStat label="Payout" value={`+${pos.payout.toFixed(2)} USDC`} color="#34d399" />
            ) : (
              <MiniStat label="P&L" value={`-${pos.stakeUsdc.toFixed(2)} USDC`} color="#f87171" />
            )
          ) : (
            <MiniStat label="Est. Payout" value={sidePool > 0 ? `${(pos.stakeUsdc * (totalPool / sidePool)).toFixed(2)} USDC` : '—'} color="#8e8e8e" />
          )}
        </div>

        {/* Claim button */}
        {canClaim && (
          <button
            onClick={() => onClaim(pos.market.marketId)}
            disabled={claiming}
            className="w-full min-h-[48px] py-3 rounded-lg font-[family-name:var(--font-jetbrains-mono)] text-sm font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            style={{
              background: claiming ? '#1c1b1b' : 'linear-gradient(135deg, #a855f7, #34d399)',
              color: 'white',
              boxShadow: claiming ? 'none' : '0 0 20px rgba(168,85,247,0.3)',
            }}
          >
            {claiming ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Claiming…
              </>
            ) : (
              `Claim Winnings (${pos.payout.toFixed(2)} USDC)`
            )}
          </button>
        )}
        {claimTxHash && <a href={`https://testnet.arcscan.app/tx/${claimTxHash}`} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center justify-center gap-2 text-xs text-[#c4b5fd] hover:text-white transition-colors"><ExternalLink size={13} /> View claim transaction</a>}
      </div>
    </div>
  );
});

const MiniStat = React.memo(function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-[#0d0d0d] border border-[#3a3939] rounded-lg p-3">
      <p className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] text-[#8e8e8e] uppercase tracking-widest mb-1">{label}</p>
      <p className="font-[family-name:var(--font-jetbrains-mono)] font-bold text-sm" style={{ color: color || '#e5e2e1' }}>{value}</p>
    </div>
  );
});

const EmptyState = React.memo(function EmptyState({ tab, onRetry }: { tab: Tab; onRetry: () => void }) {
  const msgs: Record<Tab, { title: string; sub: string }> = {
    open:     { title: 'No open positions', sub: 'Browse live markets and stake on an AI prediction to get started.' },
    resolved: { title: 'No resolved positions', sub: 'Your past positions will appear here once markets close.' },
    all:      { title: 'No positions yet', sub: 'You have not staked on any markets with this wallet.' },
  };
  const { title, sub } = msgs[tab];
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center border border-[#3a3939] rounded-xl bg-[#131313]">
      <Clock size={36} className="text-[#3a3939]" />
      <p className="font-[family-name:var(--font-hanken)] text-lg text-white">{title}</p>
      <p className="font-[family-name:var(--font-jetbrains-mono)] text-xs text-[#8e8e8e] max-w-xs">{sub}</p>
      <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
        <Link href="/markets" className="min-h-[44px] inline-flex items-center px-5 py-2.5 rounded-lg bg-[#a855f7] text-white font-[family-name:var(--font-jetbrains-mono)] text-xs font-bold tracking-widest uppercase hover:opacity-90 transition-opacity">Browse Markets</Link>
        <button onClick={onRetry} className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[#3a3939] text-[#c4b5fd] font-[family-name:var(--font-jetbrains-mono)] text-xs font-bold tracking-widest uppercase hover:border-[#a855f7]/50 transition-colors"><RefreshCw size={13} /> Refresh</button>
      </div>
    </div>
  );
});
