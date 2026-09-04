'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import { StakeModal } from '@/components/markets/StakeModal';
import { MarketProbabilityChart } from '@/components/markets/MarketProbabilityChart';
import { MarketTimeline } from '@/components/markets/MarketTimeline';
import { CountdownTimer } from '@/components/markets/CountdownTimer';
import { Market, StakeSide } from '@/types';
import { useReadContract, useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { decodeEventLog, formatUnits } from 'viem';
import { ARCSIGNAL_ADDRESS, ARCSIGNAL_ABI } from '@/lib/contracts';
import toast from 'react-hot-toast';
import {
  ChevronRight,
  Brain,
  FileText,
  TrendingUp,
  TrendingDown,
  Gavel,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  ExternalLink,
  Sparkles,
  Zap,
} from 'lucide-react';

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

function getTimeframe(marketId: string) {
  return marketId.match(/-PRICE-(5m|15m|1h|4h|24h)-/)?.[1] ?? null;
}

export default function MarketDetailClient({ market }: MarketDetailClientProps) {
  const [stakeModalSide, setStakeModalSide] = useState<StakeSide | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [activeTab, setActiveTab] = useState<'analysis' | 'rules'>('analysis');

  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  // Read live on-chain pool data
  const { data: chainMarket, refetch: refetchMarket } = useReadContract({
    address: ARCSIGNAL_ADDRESS,
    abi: ArcSignal_ABI,
    functionName: 'markets',
    args: [market.marketId],
    query: { staleTime: 10_000, refetchInterval: 12_000 },
  });

  const { data: followRaw, refetch: refetchFollow } = useReadContract({
    address: ARCSIGNAL_ADDRESS,
    abi: ARCSIGNAL_ABI,
    functionName: 'followStakes',
    args: address ? [market.marketId, address] : undefined,
    query: { enabled: !!address, staleTime: 10_000, refetchInterval: 12_000 },
  });

  const { data: fadeRaw, refetch: refetchFade } = useReadContract({
    address: ARCSIGNAL_ADDRESS,
    abi: ARCSIGNAL_ABI,
    functionName: 'fadeStakes',
    args: address ? [market.marketId, address] : undefined,
    query: { enabled: !!address, staleTime: 10_000, refetchInterval: 12_000 },
  });

  const { data: claimedRaw, refetch: refetchClaimed } = useReadContract({
    address: ARCSIGNAL_ADDRESS,
    abi: ARCSIGNAL_ABI,
    functionName: 'claimed',
    args: address ? [market.marketId, address] : undefined,
    query: { enabled: !!address, staleTime: 10_000, refetchInterval: 12_000 },
  });

  const followPool = chainMarket ? parseFloat(formatUnits(chainMarket[3] as bigint, 6)) : market.followPool;
  const fadePool = chainMarket ? parseFloat(formatUnits(chainMarket[4] as bigint, 6)) : market.fadePool;

  const totalPool = followPool + fadePool;
  const followPercent = totalPool > 0 ? (followPool / totalPool) * 100 : 50;
  const fadePercent = totalPool > 0 ? (fadePool / totalPool) * 100 : 50;
  const followMultiplier = totalPool > 0 && followPool > 0 ? (totalPool / followPool).toFixed(2) : '2.00';
  const fadeMultiplier = totalPool > 0 && fadePool > 0 ? (totalPool / fadePool).toFixed(2) : '2.00';

  const categoryLabels: string[] =
    market.category === 'football'
      ? ['TACTICAL ANALYSIS', 'FORM & FITNESS', 'HISTORICAL DATA', 'ODDS MOVEMENT']
      : ['ON-CHAIN METRICS', 'ORDER BOOK FLOW', 'SENTIMENT ANALYSIS', 'MACRO FACTORS'];

  const followStakeRaw = (followRaw as bigint) || 0n;
  const fadeStakeRaw = (fadeRaw as bigint) || 0n;
  const isClaimed = (claimedRaw as boolean) || false;
  const resolved = chainMarket ? chainMarket[5] : market.resolved;
  const outcome = chainMarket ? chainMarket[6] : (market.outcome === 'FOLLOW' ? 1 : market.outcome === 'FADE' ? 2 : 0);

  const now = Math.floor(Date.now() / 1000);
  const isPending = !resolved && (market.status === 'PENDING_RESOLUTION' || market.resolutionTime <= now);
  const isClosed = !resolved && !isPending && market.status === 'CLOSED';
  const isOpen = !resolved && !isPending && !isClosed;
  const timeframe = getTimeframe(market.marketId);

  let userWon = false;
  let payout = 0;
  if (resolved) {
    if (outcome === 1 && followStakeRaw > 0n) {
      userWon = true;
      payout = Number(formatUnits(followStakeRaw, 6)) + (Number(formatUnits(followStakeRaw, 6)) * fadePool) / (followPool || 1);
    } else if (outcome === 2 && fadeStakeRaw > 0n) {
      userWon = true;
      payout = Number(formatUnits(fadeStakeRaw, 6)) + (Number(formatUnits(fadeStakeRaw, 6)) * followPool) / (fadePool || 1);
    }
  }

  const handleClaim = async () => {
    if (!walletClient || !publicClient || !address) return;
    const toastId = toast.loading('Waiting for wallet confirmation…');
    try {
      setIsClaiming(true);
      const { request } = await publicClient.simulateContract({
        account: address,
        address: ARCSIGNAL_ADDRESS,
        abi: ARCSIGNAL_ABI,
        functionName: 'claimWinnings',
        args: [market.marketId],
      });
      const hash = await walletClient.writeContract(request);
      toast.loading('Transaction submitted, confirming…', { id: toastId });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success' || receipt.to?.toLowerCase() !== ARCSIGNAL_ADDRESS.toLowerCase()) {
        throw new Error('Claim transaction was not confirmed successfully on ArcSignal.');
      }
      const hasMatchingClaimEvent = receipt.logs.some((log) => {
        if (log.address.toLowerCase() !== ARCSIGNAL_ADDRESS.toLowerCase()) return false;
        try {
          const decoded = decodeEventLog({ abi: ARCSIGNAL_ABI, data: log.data, topics: log.topics });
          if (decoded.eventName !== 'Claimed') return false;
          const args = decoded.args as { marketId: string; user: string; amount: bigint };
          return args.marketId === market.marketId
            && args.user.toLowerCase() === address.toLowerCase()
            && args.amount > 0n;
        } catch {
          return false;
        }
      });
      if (!hasMatchingClaimEvent) {
        throw new Error('Confirmed transaction did not contain the expected ArcSignal claim event.');
      }
      toast.success('Winnings claimed!', { id: toastId });
      await Promise.all([refetchMarket(), refetchFollow(), refetchFade(), refetchClaimed()]);
    } catch (err: any) {
      console.error('Claim failed:', err);
      toast.error('Claim failed: ' + (err?.shortMessage || err?.message || 'Unknown error'), { id: toastId });
    } finally {
      setIsClaiming(false);
    }
  };

  // Status mapping
  let statusLabel = 'OPEN';
  let statusBadgeClass = 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
  let statusAlertMessage = '';

  if (resolved) {
    if (outcome === 0) {
      statusLabel = 'CANCELLED';
      statusBadgeClass = 'border-slate-500/30 bg-slate-500/10 text-slate-400';
      statusAlertMessage = 'This market has been cancelled or voided. All original stakes are refundable.';
    } else {
      statusLabel = 'RESOLVED';
      statusBadgeClass = 'border-[#ddb7ff]/30 bg-[#ddb7ff]/10 text-[#ddb7ff]';
      statusAlertMessage = `Market settlement verified on-chain. Outcome: ${outcome === 1 ? 'FOLLOW WON' : 'FADE WON'}.`;
    }
  } else if (isPending) {
    statusLabel = 'PENDING RESOLUTION';
    statusBadgeClass = 'border-amber-400/30 bg-amber-400/10 text-amber-300';
    statusAlertMessage = 'Closed — awaiting oracle resolution. Trading is disabled until settlement is recorded.';
  } else if (isClosed) {
    statusLabel = 'CLOSED';
    statusBadgeClass = 'border-amber-400/30 bg-amber-400/10 text-amber-300';
    statusAlertMessage = 'Market closed for trading — awaiting resolution.';
  }

  const aiPickUpper = (market.agentPick || 'YES').toUpperCase();
  const isFollowAi = aiPickUpper === 'YES' || aiPickUpper === 'FOLLOW';

  return (
    <div className="flex min-h-screen bg-[#121212] text-[#e5e2e1]">
      <Sidebar />

      {/* Main Content Shell */}
      <main className="lg:ml-[264px] min-h-screen pt-20 pb-20 md:pb-12 flex-1 min-w-0">
        <div className="max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-6">

          {/* ── 1. BREADCRUMBS & TOP NAV ── */}
          <nav className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#94a3b8] pt-2">
            <Link href="/markets" className="hover:text-[#ddb7ff] transition-colors">
              MARKETS
            </Link>
            <ChevronRight size={13} />
            <span className="uppercase text-[#cbd5e1]">{market.category}</span>
            {timeframe && (
              <>
                <ChevronRight size={13} />
                <span className="uppercase text-[#94a3b8]">{timeframe}</span>
              </>
            )}
            <ChevronRight size={13} />
            <span className="text-[#ddb7ff] truncate max-w-[200px] sm:max-w-md">
              {market.title}
            </span>
          </nav>

          {/* ── 2. CLOSED / PENDING / RESOLUTION ALERT ── */}
          {statusAlertMessage && (
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
              resolved
                ? 'bg-[#ddb7ff]/5 border-[#ddb7ff]/20 text-[#e5e2e1]'
                : isPending
                ? 'bg-amber-400/5 border-amber-400/20 text-amber-200'
                : 'bg-white/[0.04] border-white/[0.08] text-[#cbd5e1]'
            }`}>
              <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#ddb7ff]" />
              <div className="font-sans">
                <p className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                  Market Status: {statusLabel}
                </p>
                <p className="text-xs text-[#94a3b8] mt-0.5 leading-relaxed">
                  {statusAlertMessage}
                </p>
              </div>
            </div>
          )}

          {/* ── 3. MARKET HEADER & PRIMARY DECISION HERO ── */}
          <header className="rounded-2xl border border-white/[0.08] bg-[#161616] p-6 lg:p-8 space-y-6 shadow-lg">
            
            {/* Meta Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
              <div className="flex items-center gap-2">
                <span className="rounded px-2.5 py-1 font-bold uppercase tracking-wider text-[#ddb7ff] bg-[#ddb7ff]/10 border border-[#ddb7ff]/20">
                  {market.category}
                </span>
                {timeframe && (
                  <span className="rounded px-2 py-1 font-medium uppercase tracking-wider text-[#94a3b8] bg-white/[0.04] border border-white/[0.08]">
                    {timeframe} Timeframe
                  </span>
                )}
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-bold uppercase tracking-wider ${statusBadgeClass}`}>
                  <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-current'}`} />
                  {statusLabel}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-[#94a3b8] font-sans">
                <Clock size={14} className="text-[#94a3b8]" />
                <span className="font-mono tabular-nums text-[11px]">
                  {resolved ? (
                    'Settlement Complete'
                  ) : isPending ? (
                    'Oracle Awaiting Resolution'
                  ) : (
                    <>Closes in <CountdownTimer resolutionTime={market.resolutionTime} resolved={false} /></>
                  )}
                </span>
              </div>
            </div>

            {/* Question Text */}
            <h1 className="font-display text-2xl sm:text-3xl lg:text-[32px] font-extrabold text-white tracking-[-0.025em] leading-[1.25]">
              {market.title}
            </h1>

            {/* Key Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/[0.06] font-mono">
              {/* AI Prediction */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
                  AI Prediction
                </span>
                <p className="text-lg sm:text-xl font-bold text-[#ddb7ff] flex items-center gap-1.5 tracking-tight">
                  <Sparkles size={16} />
                  <span>{isFollowAi ? 'FOLLOW AI' : 'FADE AI'}</span>
                </p>
              </div>

              {/* AI Confidence */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
                  AI Confidence
                </span>
                <p className="text-lg sm:text-xl font-bold text-white tabular-nums tracking-tight">
                  {market.confidence}%
                </p>
              </div>

              {/* Market Odds Split */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
                  Market Split
                </span>
                <p className="text-lg sm:text-xl font-bold text-white tabular-nums tracking-tight">
                  <span className="text-[#4fdbc8]">{followPercent.toFixed(0)}%</span> / <span className="text-[#f87171]">{fadePercent.toFixed(0)}%</span>
                </p>
              </div>

              {/* Liquidity Pool */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
                  Total Liquidity
                </span>
                <p className="text-lg sm:text-xl font-bold text-white tabular-nums tracking-tight">
                  {totalPool.toFixed(2)} <span className="text-xs text-[#94a3b8] font-sans font-normal">USDC</span>
                </p>
              </div>
            </div>

          </header>

          {/* ── 4. TWO-COLUMN RESEARCH & TRADING WORKSPACE ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column: Research, Probability Chart, Rules & Timeline (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Interactive Probability Chart */}
              <MarketProbabilityChart
                followPercent={followPercent}
                fadePercent={fadePercent}
                aiConfidence={market.confidence}
                aiPrediction={aiPickUpper}
                openedAt={market.resolution_timestamp ? market.resolution_timestamp - 86400 : undefined}
                resolutionTime={market.resolutionTime}
                marketId={market.marketId}
              />

              {/* Lifecycle Progression Timeline */}
              <MarketTimeline
                resolutionTime={market.resolutionTime}
                resolved={resolved}
                outcome={market.outcome}
                status={market.status}
                openedAt={market.resolution_timestamp ? market.resolution_timestamp - 86400 : undefined}
              />

              {/* Deep Research Section */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#141414] p-5 lg:p-6 space-y-5">
                
                {/* Section Navigation Tabs */}
                <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3 font-sans">
                  <button
                    onClick={() => setActiveTab('analysis')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      activeTab === 'analysis'
                        ? 'bg-[#ddb7ff] text-[#131313]'
                        : 'text-[#94a3b8] hover:text-white'
                    }`}
                  >
                    <Brain size={14} /> AI Analysis
                  </button>
                  <button
                    onClick={() => setActiveTab('rules')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      activeTab === 'rules'
                        ? 'bg-[#ddb7ff] text-[#131313]'
                        : 'text-[#94a3b8] hover:text-white'
                    }`}
                  >
                    <Gavel size={14} /> Settlement Rules
                  </button>
                </div>

                {/* Tab Content: AI Analysis */}
                {activeTab === 'analysis' && (
                  <div className="space-y-6 font-sans">
                    {/* Executive Summary */}
                    {market.summary && (
                      <div className="space-y-2">
                        <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#ddb7ff] flex items-center gap-1.5">
                          <FileText size={14} /> Executive Summary
                        </h3>
                        <p className="text-[13px] sm:text-sm text-[#cbd5e1] leading-[1.65] bg-[#1a1a1a] p-4 rounded-xl border border-white/[0.04]">
                          {market.summary}
                        </p>
                      </div>
                    )}

                    {/* Bull / Bear Arguments */}
                    {(market.bull_case || market.bear_case) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {market.bull_case && (
                          <div className="p-4 rounded-xl border border-[#4fdbc8]/20 bg-[#4fdbc8]/5 space-y-2">
                            <h4 className="font-mono text-xs font-bold text-[#4fdbc8] uppercase tracking-wider flex items-center gap-1.5">
                              <TrendingUp size={14} /> Bull Case (Follow)
                            </h4>
                            <p className="text-[13px] text-[#cbd5e1] leading-[1.6]">
                              {market.bull_case}
                            </p>
                          </div>
                        )}
                        {market.bear_case && (
                          <div className="p-4 rounded-xl border border-[#f87171]/20 bg-[#f87171]/5 space-y-2">
                            <h4 className="font-mono text-xs font-bold text-[#f87171] uppercase tracking-wider flex items-center gap-1.5">
                              <TrendingDown size={14} /> Bear Case (Fade)
                            </h4>
                            <p className="text-[13px] text-[#cbd5e1] leading-[1.6]">
                              {market.bear_case}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Psychology & Key Factors */}
                    {market.keyFactors && market.keyFactors.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#94a3b8]">
                          Psychological & Market Conviction Factors
                        </h3>
                        <div className="space-y-2">
                          {market.keyFactors.map((factor, i) => (
                            <div
                              key={i}
                              className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-[#1a1a1a] border border-white/[0.04] gap-2"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="text-[9px] font-bold font-mono uppercase px-2 py-0.5 rounded bg-white/[0.06] text-[#ddb7ff]">
                                  {categoryLabels[i] || `FACTOR ${i + 1}`}
                                </span>
                                <span className="text-xs sm:text-[13px] text-white">{factor}</span>
                              </div>
                              <span className="text-[10px] font-bold text-[#4fdbc8] font-mono shrink-0 self-end sm:self-auto">
                                STRENGTH: HIGH
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Data Sources */}
                    <div className="space-y-2">
                      <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#94a3b8]">
                        Data Ingestion Feeds & Oracles
                      </h3>
                      <div className="flex flex-wrap gap-2 font-mono">
                        {market.data_sources && market.data_sources.length > 0 ? (
                          market.data_sources.map((src, i) => (
                            <span
                              key={i}
                              className="px-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-white/[0.06] text-xs text-[#cbd5e1]"
                            >
                              {src}
                            </span>
                          ))
                        ) : (
                          <span className="px-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-white/[0.06] text-xs text-[#cbd5e1]">
                            {market.category === 'football' ? 'API-Football Live Oracle' : 'CoinGecko Live Price Feed'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab Content: Settlement Rules & Transparency */}
                {activeTab === 'rules' && (
                  <div className="space-y-6 font-sans">
                    <div className="space-y-2">
                      <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#ddb7ff] flex items-center gap-1.5">
                        <Gavel size={14} /> Official Resolution Clause
                      </h3>
                      <div className="bg-[#1a1a1a] p-4 rounded-xl border border-white/[0.06] text-xs sm:text-[13px] text-[#cbd5e1] leading-[1.7] italic space-y-2">
                        <p>
                          {market.category === 'crypto'
                            ? `This market resolves deterministically based on the verified volume-weighted index price from primary oracle feeds (CoinGecko / Chainlink). If the condition stated in the market title is met at the timestamp cutoff, FOLLOW is recorded as winning. If the condition is not met, FADE is recorded as winning.`
                            : `This market resolves based on the official 90-minute + stoppage time match score verified via sports oracle data feeds. Extra time and penalty shootouts are excluded unless explicitly specified in the market parameters.`}
                        </p>
                        <p className="text-[11px] text-[#94a3b8] not-italic border-t border-white/[0.06] pt-2 font-mono">
                          Resolution Source: <strong className="text-white font-sans">{market.resolution_source || (market.category === 'football' ? 'API-Football' : 'CoinGecko')}</strong>
                        </p>
                      </div>
                    </div>

                    {/* On-chain Explorer Transparency */}
                    <div className="space-y-3">
                      <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#94a3b8]">
                        Blockchain Contract Transparency
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-[#1a1a1a] border border-white/[0.04] space-y-1">
                          <span className="font-mono text-[10px] text-[#94a3b8] uppercase tracking-wider block">
                            Contract Address
                          </span>
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-white truncate max-w-[180px]">
                              {ARCSIGNAL_ADDRESS}
                            </span>
                            <Link href="/docs" className="text-[#ddb7ff] hover:underline">
                              Contract details
                            </Link>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-[#1a1a1a] border border-white/[0.04] space-y-1">
                          <span className="font-mono text-[10px] text-[#94a3b8] uppercase tracking-wider block">
                            Protocol Trading Fee: 0%
                          </span>
                          <span className="font-mono text-white font-bold">
                            No fee charged by the deployed contract
                          </span>
                          <p className="font-mono text-[10px] text-[#94a3b8]">
                            Network fees are paid in native USDC on Arc.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>

            </div>

            {/* Right Column: Execution & Trading Terminal (4 cols) */}
            <aside className="lg:col-span-4 space-y-6 shrink-0 font-sans">
              
              {/* Trading Terminal Box */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#161616] p-6 space-y-6 shadow-xl sticky top-24">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                  <div>
                    <h2 className="font-display text-base font-bold text-white tracking-tight">
                      {resolved ? 'Settlement Terminal' : 'Trading Action'}
                    </h2>
                    <p className="text-[11px] text-[#94a3b8] mt-0.5">
                      {resolved ? 'View results & claim winnings' : 'Take a position on this prediction'}
                    </p>
                  </div>
                  <Zap size={18} className="text-[#ddb7ff]" />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-[#4fdbc8]/20 bg-[#4fdbc8]/5 px-3 py-2 font-mono text-[11px]">
                  <span className="text-[#94a3b8] uppercase tracking-wider">Protocol Trading Fee</span>
                  <span className="font-bold text-[#4fdbc8]">0%</span>
                </div>

                {/* Pool Status Visualizer */}
                <div className="space-y-2 font-mono">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-[#4fdbc8] tracking-tight">
                      FOLLOW <span className="tabular-nums">{followPercent.toFixed(0)}%</span>
                    </span>
                    <span className="text-[#f87171] tracking-tight">
                      FADE <span className="tabular-nums">{fadePercent.toFixed(0)}%</span>
                    </span>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#262626] flex">
                    <div
                      className="bg-[#4fdbc8] transition-all duration-500 rounded-l-full"
                      style={{ width: `${followPercent}%` }}
                    />
                    <div
                      className="bg-[#f87171] transition-all duration-500 rounded-r-full"
                      style={{ width: `${fadePercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#94a3b8] tabular-nums">
                    <span>{followPool.toFixed(2)} USDC</span>
                    <span>{fadePool.toFixed(2)} USDC</span>
                  </div>
                </div>

                {/* Reward Multipliers Cards */}
                <div className="grid grid-cols-2 gap-2 text-center font-mono">
                  <div className="p-3 rounded-xl bg-[#1c1b1b] border border-white/[0.04]">
                    <span className="text-[10px] text-[#94a3b8] uppercase tracking-wider block mb-1">
                      Follow Payout
                    </span>
                    <span className="text-base font-bold text-[#4fdbc8] tabular-nums tracking-tight">
                      {followMultiplier}x
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#1c1b1b] border border-white/[0.04]">
                    <span className="text-[10px] text-[#94a3b8] uppercase tracking-wider block mb-1">
                      Fade Payout
                    </span>
                    <span className="text-base font-bold text-[#f87171] tabular-nums tracking-tight">
                      {fadeMultiplier}x
                    </span>
                  </div>
                </div>

                {/* Active Trading Controls */}
                {isOpen ? (
                  <div className="space-y-3 pt-2">
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setStakeModalSide(0)}
                        className="w-full flex items-center justify-between py-3.5 px-4 rounded-xl border border-[#4fdbc8]/40 bg-[#4fdbc8]/10 hover:bg-[#4fdbc8] text-[#4fdbc8] hover:text-[#0b1716] font-sans font-bold text-xs transition-all duration-150 active:scale-[0.98] shadow-md group"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={16} />
                          <span>Follow AI Prediction</span>
                        </div>
                        <span className="font-mono text-xs tabular-nums font-bold">
                          {followPercent.toFixed(0)}%
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setStakeModalSide(1)}
                        className="w-full flex items-center justify-between py-3.5 px-4 rounded-xl border border-[#f87171]/40 bg-[#f87171]/10 hover:bg-[#f87171] text-[#f87171] hover:text-[#180a0a] font-sans font-bold text-xs transition-all duration-150 active:scale-[0.98] shadow-md group"
                      >
                        <div className="flex items-center gap-2">
                          <XCircle size={16} />
                          <span>Fade AI Prediction</span>
                        </div>
                        <span className="font-mono text-xs tabular-nums font-bold">
                          {fadePercent.toFixed(0)}%
                        </span>
                      </button>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] text-[11px] text-[#94a3b8] leading-relaxed space-y-1">
                      <p>
                        <strong className="text-white">Follow</strong> = support AI conviction ({aiPickUpper}).
                      </p>
                      <p>
                        <strong className="text-white">Fade</strong> = oppose AI conviction.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Resolved / Claim Section */
                  <div className="space-y-4 pt-2">
                    <div className="p-4 rounded-xl bg-[#1c1b1b] border border-white/[0.06] space-y-2 text-center">
                      <Gavel size={24} className="mx-auto text-[#ddb7ff]" />
                      <h4 className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                        Official Outcome Recorded
                      </h4>
                      <p className={`font-mono text-base font-bold tracking-tight ${
                        outcome === 1 ? 'text-[#4fdbc8]' : outcome === 2 ? 'text-[#f87171]' : 'text-white'
                      }`}>
                        {outcome === 1 ? 'FOLLOW WON' : outcome === 2 ? 'FADE WON' : 'CANCELLED / REFUND'}
                      </p>
                    </div>

                    {userWon && !isClaimed && (
                      <button
                        onClick={handleClaim}
                        disabled={isClaiming}
                        className="w-full py-4 rounded-xl font-bold text-xs font-mono tracking-wider transition-all disabled:opacity-50 shadow-lg"
                        style={{
                          background: isClaiming
                            ? '#1c1b1b'
                            : 'linear-gradient(135deg, #a855f7, #34d399)',
                          color: 'white',
                          boxShadow: isClaiming ? 'none' : '0 0 20px rgba(168,85,247,0.35)',
                        }}
                      >
                        {isClaiming ? 'Claiming Winnings…' : `Claim Winnings (${payout.toFixed(2)} USDC)`}
                      </button>
                    )}

                    {userWon && isClaimed && (
                      <div className="w-full py-3.5 rounded-xl bg-[#4fdbc8]/10 border border-[#4fdbc8]/30 text-[#4fdbc8] text-center font-bold text-xs font-mono">
                        ✓ Winnings Claimed Successfully
                      </div>
                    )}

                    {!userWon && (followStakeRaw > 0n || fadeStakeRaw > 0n) && (
                      <div className="w-full py-3.5 rounded-xl bg-[#f87171]/10 border border-[#f87171]/30 text-[#f87171] text-center font-semibold text-xs font-sans">
                        Position Closed (No Winnings)
                      </div>
                    )}

                    {followStakeRaw === 0n && fadeStakeRaw === 0n && (
                      <div className="w-full py-3 rounded-xl bg-[#1c1b1b] border border-white/[0.04] text-[#64748b] text-center text-xs font-sans">
                        No active wallet position in this pool
                      </div>
                    )}
                  </div>
                )}

                {/* User's Current Position */}
                {address && (followStakeRaw > 0n || fadeStakeRaw > 0n) && (
                  <div className="p-3.5 rounded-xl bg-[#1a1a1a] border border-[#ddb7ff]/20 space-y-1.5 font-sans">
                    <span className="font-mono text-[10px] font-bold text-[#ddb7ff] uppercase tracking-wider block">
                      Your Position
                    </span>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#94a3b8]">Staked Side:</span>
                      <strong className={`font-mono ${followStakeRaw > 0n ? 'text-[#4fdbc8]' : 'text-[#f87171]'}`}>
                        {followStakeRaw > 0n ? 'FOLLOW' : 'FADE'}
                      </strong>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#94a3b8]">Amount:</span>
                      <span className="font-mono text-white tabular-nums">
                        {formatUnits(followStakeRaw > 0n ? followStakeRaw : fadeStakeRaw, 6)} USDC
                      </span>
                    </div>
                  </div>
                )}

              </div>

            </aside>

          </div>

        </div>
      </main>

      {/* Stake Modal */}
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
