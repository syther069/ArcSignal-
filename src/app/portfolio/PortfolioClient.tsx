'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { ARCSIGNAL_ADDRESS, ARCSIGNAL_ABI } from '@/lib/contracts';
import { getMarketsFromChain } from '@/lib/markets';
import type { Market } from '@/lib/types';
import { formatUnits } from 'viem';
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

  // ─── Fetch all positions via multicall ──────────────────────────────────────
  const fetchPortfolio = async () => {
    if (!address || !publicClient) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const markets = await getMarketsFromChain();
      if (markets.length === 0) {
        setPositions([]);
        setLoading(false);
        return;
      }

      // ARC Testnet does not have Multicall3 deployed, so we use Promise.all
      const fetchMarketData = async (m: any) => {
        try {
          const [followRaw, fadeRaw, isClaimed] = await Promise.all([
            publicClient.readContract({ address: ARCSIGNAL_ADDRESS, abi: ARCSIGNAL_ABI, functionName: 'followStakes', args: [m.marketId, address] }) as Promise<bigint>,
            publicClient.readContract({ address: ARCSIGNAL_ADDRESS, abi: ARCSIGNAL_ABI, functionName: 'fadeStakes', args: [m.marketId, address] }) as Promise<bigint>,
            publicClient.readContract({ address: ARCSIGNAL_ADDRESS, abi: ARCSIGNAL_ABI, functionName: 'claimed', args: [m.marketId, address] }) as Promise<boolean>,
          ]);
          return { followRaw, fadeRaw, isClaimed };
        } catch (e) {
          console.error('Failed to read position for market', m.marketId, e);
          return { followRaw: 0n, fadeRaw: 0n, isClaimed: false };
        }
      };

      const results = await Promise.all(markets.map(fetchMarketData));

      const newPositions: Position[] = [];

      markets.forEach((market, i) => {
        const { followRaw, fadeRaw, isClaimed } = results[i];

        const addPosition = (side: 0 | 1, stakeRaw: bigint) => {
          const stakeUsdc = Number(formatUnits(stakeRaw, 6));
          const isResolved = market.resolved;
          const userSide = side === 0 ? 'FOLLOW' : 'FADE';
          
          let userWon: boolean | null = null;
          let payout = 0;
          let netPnl = 0;

          if (isResolved) {
            userWon = (market.outcome === 'FOLLOW' && userSide === 'FOLLOW') ||
                      (market.outcome === 'FADE' && userSide === 'FADE');

            if (userWon) {
              const followPoolUsdc = Number(formatUnits(market.followPool as bigint, 6));
              const fadePoolUsdc   = Number(formatUnits(market.fadePool   as bigint, 6));
              
              const winPool  = userSide === 'FOLLOW' ? followPoolUsdc : fadePoolUsdc;
              const losePool = userSide === 'FOLLOW' ? fadePoolUsdc   : followPoolUsdc;
              
              if (winPool > 0) {
                payout = stakeUsdc + (stakeUsdc * losePool) / winPool;
                netPnl = payout - stakeUsdc;
              }
            } else {
              netPnl = -stakeUsdc;
            }
          }

          // We'll preserve outcome as a numeric code just in case other parts of the UI rely on it (though we just refactored it out of use mostly)
          const outcome = isResolved ? (market.outcome === 'FOLLOW' ? 1 : market.outcome === 'FADE' ? 2 : 0) : 0;

          newPositions.push({ market, side, stakeRaw, stakeUsdc, claimed: isClaimed, isResolved, outcome, userWon, payout, netPnl });
        };

        if (followRaw > 0n) addPosition(0, followRaw);
        if (fadeRaw   > 0n) addPosition(1, fadeRaw);
      });

      setPositions(newPositions);
    } catch (err) {
      console.error('Portfolio fetch failed:', err);
      toast.error('Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, [address, publicClient]);

  // ─── Claim Handler ──────────────────────────────────────────────────────────
  const handleClaim = async (marketId: string) => {
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
  };

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
    <div className="flex min-h-screen bg-[#0d0d0d] text-[#e5e2e1]">
      <Sidebar />
      <main className="lg:ml-[264px] pt-24 pb-20 flex-1 min-w-0">\n        <div className="max-w-[1440px] mx-auto w-full px-4 md:px-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-[family-name:var(--font-hanken)] text-3xl font-bold text-white mb-1">Portfolio</h1>
          <p className="font-[family-name:var(--font-jetbrains-mono)] text-xs text-[#8e8e8e] tracking-widest uppercase">
            On-Chain Positions · {address ? `${address.slice(0,6)}…${address.slice(-4)}` : 'Not connected'}
          </p>
        </div>

        {!address ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-[#1c1b1b] border border-[#3a3939] flex items-center justify-center">
              <AlertCircle size={28} className="text-[#8e8e8e]" />
            </div>
            <p className="font-[family-name:var(--font-hanken)] text-lg text-white">Connect your wallet</p>
            <p className="font-[family-name:var(--font-jetbrains-mono)] text-xs text-[#8e8e8e]">to view your positions</p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <span className="w-10 h-10 rounded-full border-2 border-[#a855f7] border-t-transparent animate-spin" />
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-xs text-[#8e8e8e] uppercase tracking-widest">
              Loading positions…
            </span>
          </div>
        ) : (
          <>
            {/* ── Stats Bar ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
              <StatCard icon={<Coins size={18} />} label="Total Staked" value={`${stats.totalStaked.toFixed(2)} USDC`} />
              <StatCard
                icon={stats.totalPnl >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                label="Net P&L"
                value={`${stats.totalPnl >= 0 ? '+' : ''}${stats.totalPnl.toFixed(2)} USDC`}
                positive={stats.totalPnl >= 0}
                negative={stats.totalPnl < 0}
              />
              <StatCard icon={<Trophy size={18} />} label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} />
              <StatCard
                icon={<BarChart3 size={18} />}
                label="Unclaimed"
                value={`${stats.unclaimed.toFixed(2)} USDC`}
                highlight={stats.unclaimed > 0}
              />
            </div>

            {/* ── Tabs ──────────────────────────────────────────────────────── */}
            <div className="flex items-center gap-0 border border-[#3a3939] rounded-lg overflow-hidden mb-6 w-fit">
              {(['open', 'resolved', 'all'] as Tab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2.5 font-[family-name:var(--font-jetbrains-mono)] text-xs uppercase tracking-widest transition-colors ${
                    activeTab === tab
                      ? 'bg-[#a855f7] text-white'
                      : 'bg-transparent text-[#8e8e8e] hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab === 'open' ? `Open (${stats.openCount})` : tab === 'resolved' ? `Resolved (${stats.resolved})` : `All (${positions.length})`}
                </button>
              ))}
            </div>

            {/* ── Positions List ────────────────────────────────────────────── */}
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

function StatCard({ icon, label, value, positive, negative, highlight }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${
      highlight ? 'border-[#a855f7]/50 bg-[#a855f7]/5 shadow-[0_0_20px_rgba(168,85,247,0.1)]' : 'border-[#3a3939] bg-[#131313]'
    }`}>
      <div className={`flex items-center gap-2 mb-2 text-xs font-[family-name:var(--font-jetbrains-mono)] uppercase tracking-widest ${
        highlight ? 'text-[#a855f7]' : 'text-[#8e8e8e]'
      }`}>
        {icon}
        {label}
      </div>
      <p className={`font-[family-name:var(--font-jetbrains-mono)] font-bold text-lg ${
        positive ? 'text-[#34d399]' : negative ? 'text-[#f87171]' : highlight ? 'text-[#a855f7]' : 'text-white'
      }`}>
        {value}
      </p>
    </div>
  );
}

function PositionCard({ pos, onClaim, claiming }: { pos: Position; onClaim: (id: string) => void; claiming: boolean }) {
  const isFollow = pos.side === 0;
  const marketTitle = pos.market.question || pos.market.marketId;
  const shortTitle = marketTitle.length > 70 ? marketTitle.slice(0, 70) + '…' : marketTitle;

  const followPoolUsdc = Number(formatUnits(pos.market.followPool as bigint, 6));
  const fadePoolUsdc   = Number(formatUnits(pos.market.fadePool   as bigint, 6));
  const totalPool = followPoolUsdc + fadePoolUsdc;
  const sidePool  = isFollow ? followPoolUsdc : fadePoolUsdc;
  const odds      = sidePool > 0 && totalPool > 0 ? (totalPool / sidePool).toFixed(2) : '—';

  const canClaim = pos.isResolved && pos.userWon === true && !pos.claimed;
  const alreadyClaimed = pos.isResolved && pos.userWon === true && pos.claimed;

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
            {pos.isResolved && pos.userWon === false && (
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

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <MiniStat label="Position" value={isFollow ? 'FOLLOW AI' : 'FADE AI'} color={isFollow ? '#34d399' : '#f87171'} />
          <MiniStat label="Staked" value={`${pos.stakeUsdc.toFixed(2)} USDC`} />
          <MiniStat label="Pool Odds" value={`${odds}×`} />
          {pos.isResolved ? (
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
            className="w-full py-3 rounded-lg font-[family-name:var(--font-jetbrains-mono)] text-sm font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-[#0d0d0d] border border-[#3a3939] rounded-lg p-3">
      <p className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] text-[#8e8e8e] uppercase tracking-widest mb-1">{label}</p>
      <p className="font-[family-name:var(--font-jetbrains-mono)] font-bold text-sm" style={{ color: color || '#e5e2e1' }}>{value}</p>
    </div>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
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
      <Link href="/markets" className="mt-2 px-5 py-2.5 rounded-lg bg-[#a855f7] text-white font-[family-name:var(--font-jetbrains-mono)] text-xs font-bold tracking-widest uppercase hover:opacity-90 transition-opacity">
        Browse Markets
      </Link>
    </div>
  );
}
