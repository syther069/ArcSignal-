'use client';

import React, { useState } from 'react';
import SignalIntelligence from '@/components/signals/SignalIntelligence';
import type { AISignal, SignalCoverageRecord } from '@/lib/signal-intelligence/types';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import { MarketDetailStakeModal } from './MarketDetailStakeModal';
import { MarketProbabilityChart } from '@/components/markets/MarketProbabilityChart';
import { MarketTimeline } from '@/components/markets/MarketTimeline';
import { CountdownTimer } from '@/components/markets/CountdownTimer';
import { useGlobalTime } from '@/hooks/useGlobalTime';
import { Market, StakeSide } from '@/types';
import { useReadContract, useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { decodeEventLog } from 'viem';
import { ARCSIGNAL_ADDRESS, ARCSIGNAL_ABI, CANCELLATION_REFUNDS_ENABLED, arcTestnet } from '@/lib/contracts';
import { OUTCOME_TOKEN_V2_ABI, PREDICTION_MARKET_AMM_V2_ABI } from '@/lib/contracts-v2';
import { calculateParimutuelPayoutRaw } from '@/lib/parimutuel-math';
import type { ResolutionEvidence } from '@/lib/oracle-evidence';
import { tradingDesign } from '@/components/layout/TradingDesign';
import {
  formatMarketDetailUSDC,
  toHumanUsdcNumber,
  formatMultiplier,
  formatPercentage,
} from './marketDetailFormatters';
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
  AlertTriangle,
} from 'lucide-react';

type ChainMarket = {
  marketId: string;
  category: string;
  question: string;
  analysisJson: string;
  resolutionTime: bigint;
  followPool: bigint;
  fadePool: bigint;
  resolved: boolean;
  outcome: number;
};

interface MarketDetailClientProps {
  market: Market;
  resolutionEvidence: ResolutionEvidence | null;
  initialSignals?: AISignal[];
  signalCoverage?: SignalCoverageRecord;
}

function getTimeframe(marketId: string) {
  return marketId.match(/-PRICE-(5m|15m|1h|4h|24h)-/)?.[1] ?? null;
}

function safeAddress(value: string | undefined): `0x${string}` | undefined {
  return value && /^0x[a-fA-F0-9]{40}$/.test(value) ? value as `0x${string}` : undefined;
}

export default function MarketDetailClient({ market, resolutionEvidence, initialSignals, signalCoverage }: MarketDetailClientProps) {
  const [stakeModalSide, setStakeModalSide] = useState<StakeSide | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [activeTab, setActiveTab] = useState<'analysis' | 'rules'>('analysis');
  const isV2 = market.protocolVersion === 2;

  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient({ chainId: arcTestnet.id });
  const v2AmmAddress = safeAddress(market.proof?.ammAddress);
  const v2YesTokenAddress = safeAddress(market.proof?.yesTokenAddress);
  const v2NoTokenAddress = safeAddress(market.proof?.noTokenAddress);

  // Read live on-chain pool data
  const { data: chainMarket, refetch: refetchMarket } = useReadContract({
    address: ARCSIGNAL_ADDRESS,
    abi: ARCSIGNAL_ABI,
    functionName: 'getMarket',
    args: [market.marketId],
    chainId: arcTestnet.id,
    query: { enabled: !isV2, staleTime: 10_000, refetchInterval: 12_000 },
  });

  const { data: followRaw, refetch: refetchFollow } = useReadContract({
    address: ARCSIGNAL_ADDRESS,
    abi: ARCSIGNAL_ABI,
    functionName: 'followStakes',
    args: address ? [market.marketId, address] : undefined,
    chainId: arcTestnet.id,
    query: { enabled: !!address && !isV2, staleTime: 10_000, refetchInterval: 12_000 },
  });

  const { data: fadeRaw, refetch: refetchFade } = useReadContract({
    address: ARCSIGNAL_ADDRESS,
    abi: ARCSIGNAL_ABI,
    functionName: 'fadeStakes',
    args: address ? [market.marketId, address] : undefined,
    chainId: arcTestnet.id,
    query: { enabled: !!address && !isV2, staleTime: 10_000, refetchInterval: 12_000 },
  });

  const { data: claimedRaw, refetch: refetchClaimed } = useReadContract({
    address: ARCSIGNAL_ADDRESS,
    abi: ARCSIGNAL_ABI,
    functionName: 'claimed',
    args: address ? [market.marketId, address] : undefined,
    chainId: arcTestnet.id,
    query: { enabled: !!address && !isV2, staleTime: 10_000, refetchInterval: 12_000 },
  });

  const { data: v2ReservesRaw } = useReadContract({
    address: v2AmmAddress,
    abi: PREDICTION_MARKET_AMM_V2_ABI,
    functionName: 'reserves',
    chainId: arcTestnet.id,
    query: { enabled: isV2 && !!v2AmmAddress, staleTime: 10_000, refetchInterval: 12_000 },
  });

  const { data: v2ProtocolFeeBpsRaw } = useReadContract({
    address: v2AmmAddress,
    abi: PREDICTION_MARKET_AMM_V2_ABI,
    functionName: 'protocolFeeBps',
    chainId: arcTestnet.id,
    query: { enabled: isV2 && !!v2AmmAddress, staleTime: 60_000 },
  });

  const { data: v2LpFeeBpsRaw } = useReadContract({
    address: v2AmmAddress,
    abi: PREDICTION_MARKET_AMM_V2_ABI,
    functionName: 'lpFeeBps',
    chainId: arcTestnet.id,
    query: { enabled: isV2 && !!v2AmmAddress, staleTime: 60_000 },
  });

  const { data: v2YesBalanceRaw } = useReadContract({
    address: v2YesTokenAddress,
    abi: OUTCOME_TOKEN_V2_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: arcTestnet.id,
    query: { enabled: isV2 && !!address && !!v2YesTokenAddress, staleTime: 10_000, refetchInterval: 12_000 },
  });

  const { data: v2NoBalanceRaw } = useReadContract({
    address: v2NoTokenAddress,
    abi: OUTCOME_TOKEN_V2_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: arcTestnet.id,
    query: { enabled: isV2 && !!address && !!v2NoTokenAddress, staleTime: 10_000, refetchInterval: 12_000 },
  });

  const liveMarket = chainMarket as ChainMarket | undefined;
  const v2Reserves = v2ReservesRaw as readonly [bigint, bigint] | undefined;
  const followPoolRaw = isV2
    ? v2Reserves?.[0] ?? BigInt(market.followPoolRaw ?? 0)
    : liveMarket?.followPool ?? BigInt(market.followPoolRaw ?? 0);
  const fadePoolRaw = isV2
    ? v2Reserves?.[1] ?? BigInt(market.fadePoolRaw ?? 0)
    : liveMarket?.fadePool ?? BigInt(market.fadePoolRaw ?? 0);

  // Unit-aware pool conversion - never double scales
  const followPool = isV2
    ? toHumanUsdcNumber(followPoolRaw)
    : liveMarket?.followPool !== undefined
    ? toHumanUsdcNumber(liveMarket.followPool)
    : market.followPoolRaw
    ? toHumanUsdcNumber(BigInt(market.followPoolRaw))
    : toHumanUsdcNumber(market.followPool);

  const fadePool = isV2
    ? toHumanUsdcNumber(fadePoolRaw)
    : liveMarket?.fadePool !== undefined
    ? toHumanUsdcNumber(liveMarket.fadePool)
    : market.fadePoolRaw
    ? toHumanUsdcNumber(BigInt(market.fadePoolRaw))
    : toHumanUsdcNumber(market.fadePool);

  const totalPool = followPool + fadePool;
  const followPercent = totalPool > 0 ? (followPool / totalPool) * 100 : 50;
  const fadePercent = totalPool > 0 ? (fadePool / totalPool) * 100 : 50;
  const followMultiplier = totalPool > 0 && followPool > 0 ? totalPool / followPool : 2.0;
  const fadeMultiplier = totalPool > 0 && fadePool > 0 ? totalPool / fadePool : 2.0;

  const categoryLabels: string[] =
    market.category === 'football'
      ? ['TACTICAL ANALYSIS', 'FORM & FITNESS', 'HISTORICAL DATA', 'ODDS MOVEMENT']
      : ['ON-CHAIN METRICS', 'ORDER BOOK FLOW', 'SENTIMENT ANALYSIS', 'MACRO FACTORS'];

  const followStakeRaw = (followRaw as bigint) || 0n;
  const fadeStakeRaw = (fadeRaw as bigint) || 0n;
  const v2YesBalance = (v2YesBalanceRaw as bigint) || 0n;
  const v2NoBalance = (v2NoBalanceRaw as bigint) || 0n;
  const v2ProtocolFeeBps = typeof v2ProtocolFeeBpsRaw === 'number' ? v2ProtocolFeeBpsRaw : Number(v2ProtocolFeeBpsRaw ?? 0);
  const v2LpFeeBps = typeof v2LpFeeBpsRaw === 'number' ? v2LpFeeBpsRaw : Number(v2LpFeeBpsRaw ?? 0);
  const isClaimed = (claimedRaw as boolean) || false;
  const resolved = liveMarket?.resolved ?? market.resolved;
  const outcome = liveMarket?.outcome ?? (market.outcome === 'FOLLOW' ? 1 : market.outcome === 'FADE' ? 2 : 0);

  const now = useGlobalTime();
  const isPending = !resolved && (market.status === 'PENDING_RESOLUTION' || market.resolutionTime <= now);
  const isClosed = !resolved && !isPending && market.status === 'CLOSED';
  const isOpen = !resolved && !isPending && !isClosed;
  const timeframe = getTimeframe(market.marketId);

  let userWon = false;
  let payout = 0;
  if (resolved) {
    if (outcome === 1 && followStakeRaw > 0n) {
      userWon = true;
      payout = toHumanUsdcNumber(calculateParimutuelPayoutRaw({
        stakeRaw: followStakeRaw,
        winningPoolRaw: followPoolRaw,
        losingPoolRaw: fadePoolRaw,
      }));
    } else if (outcome === 2 && fadeStakeRaw > 0n) {
      userWon = true;
      payout = toHumanUsdcNumber(calculateParimutuelPayoutRaw({
        stakeRaw: fadeStakeRaw,
        winningPoolRaw: fadePoolRaw,
        losingPoolRaw: followPoolRaw,
      }));
    }
  }
  const refundable = CANCELLATION_REFUNDS_ENABLED
    && resolved
    && outcome === 0
    && followStakeRaw + fadeStakeRaw > 0n;
  if (refundable) payout = toHumanUsdcNumber(followStakeRaw + fadeStakeRaw);

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
      toast.loading('Finalizing on Arc…', { id: toastId });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success' || receipt.to?.toLowerCase() !== ARCSIGNAL_ADDRESS.toLowerCase()) {
        throw new Error('Claim transaction was not finalized successfully on ArcSignal.');
      }
      const hasMatchingClaimEvent = receipt.logs.some((log) => {
        if (log.address.toLowerCase() !== ARCSIGNAL_ADDRESS.toLowerCase()) return false;
        try {
          const decoded = decodeEventLog({ abi: ARCSIGNAL_ABI, data: log.data, topics: log.topics });
          if (decoded.eventName !== 'Claimed' && decoded.eventName !== 'Refunded') return false;
          const args = decoded.args as { marketId: string; user: string; amount: bigint };
          return args.marketId === market.marketId
            && args.user.toLowerCase() === address.toLowerCase()
            && args.amount > 0n;
        } catch {
          return false;
        }
      });
      if (!hasMatchingClaimEvent) {
        throw new Error('The finalized transaction did not contain the expected ArcSignal claim event.');
      }
      toast.success(refundable ? 'Stake refunded!' : 'Winnings claimed!', { id: toastId });
      await Promise.all([refetchMarket(), refetchFollow(), refetchFade(), refetchClaimed()]);
    } catch (err: unknown) {
      console.error('Claim failed:', err);
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Claim failed: ' + errMsg, { id: toastId });
    } finally {
      setIsClaiming(false);
    }
  };

  // Status mapping
  let statusLabel = 'OPEN';
  let statusBadgeClass = 'border-[#4FDBC8]/40 bg-[#4FDBC8]/10 text-[#4FDBC8]';
  let statusAlertMessage = '';

  if (resolved) {
    if (outcome === 0) {
      statusLabel = 'CANCELLED';
      statusBadgeClass = 'border-[#B0ABB5]/40 bg-[#B0ABB5]/10 text-[#B0ABB5]';
      statusAlertMessage = CANCELLATION_REFUNDS_ENABLED
        ? 'This market was cancelled. Participants can claim their original stakes as refunds.'
        : 'This legacy market was cancelled. This deployed contract has no participant refund method.';
    } else {
      statusLabel = 'RESOLVED';
      statusBadgeClass = 'border-[#DDB7FF]/40 bg-[#DDB7FF]/10 text-[#DDB7FF]';
      statusAlertMessage = `Market settlement verified on-chain. Outcome: ${outcome === 1 ? 'FOLLOW WON' : 'FADE WON'}.`;
    }
  } else if (isPending) {
    statusLabel = 'PENDING RESOLUTION';
    statusBadgeClass = 'border-[#F2C66D]/40 bg-[#F2C66D]/10 text-[#F2C66D]';
    statusAlertMessage = 'Countdown expired — awaiting oracle resolution. Trading is disabled until settlement is recorded.';
  } else if (isClosed) {
    statusLabel = 'CLOSED';
    statusBadgeClass = 'border-[#F2C66D]/40 bg-[#F2C66D]/10 text-[#F2C66D]';
    statusAlertMessage = 'Market closed for trading — awaiting resolution.';
  }

  const aiPickUpper = (market.agentPick || 'YES').toUpperCase();
  const isFollowAi = aiPickUpper === 'YES' || aiPickUpper === 'FOLLOW';

  return (
    <div className={`${tradingDesign} flex min-h-screen bg-[#131313] text-[#F1EEF4]`}>
      <Sidebar />

      {/* Main Content Area */}
      <main className="lg:ml-[264px] min-h-screen pt-20 pb-20 md:pb-12 flex-1 min-w-0">
        <div className="max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-6">

          {/* ── 1. COMPACT BREADCRUMBS ── */}
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 font-mono text-xs text-[#B0ABB5] pt-1">
            <Link href="/markets" className="hover:text-[#DDB7FF] transition-colors">
              Markets
            </Link>
            <ChevronRight size={13} className="text-[#403947]" />
            <span className="uppercase text-[#F1EEF4] font-medium">{market.category}</span>
            {timeframe && (
              <>
                <ChevronRight size={13} className="text-[#403947]" />
                <span className="uppercase text-[#B0ABB5]">{timeframe}</span>
              </>
            )}
            <ChevronRight size={13} className="text-[#403947]" />
            <span className="text-[#DDB7FF] truncate max-w-[200px] sm:max-w-xs md:max-w-md">
              {market.title}
            </span>
          </nav>

          {/* ── 2. STATUS ALERT BANNER (If Pending / Resolved / Cancelled) ── */}
          {statusAlertMessage && (
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${
                resolved
                  ? outcome === 0
                    ? 'bg-[#FFB4AB]/5 border-[#FFB4AB]/30 text-[#F1EEF4]'
                    : 'bg-[#DDB7FF]/10 border-[#DDB7FF]/30 text-[#F1EEF4]'
                  : isPending
                  ? 'bg-[#F2C66D]/10 border-[#F2C66D]/30 text-[#F2C66D]'
                  : 'bg-[#1C1B1B] border-[#403947] text-[#B0ABB5]'
              }`}
            >
              {resolved && outcome === 0 ? (
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[#FFB4AB]" />
              ) : (
                <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#DDB7FF]" />
              )}
              <div className="font-sans text-xs">
                <p className="font-mono text-xs font-bold uppercase tracking-wider text-[#F1EEF4]">
                  Market Status: {statusLabel}
                </p>
                <p className="text-[#B0ABB5] mt-0.5 leading-relaxed">
                  {statusAlertMessage}
                </p>
              </div>
            </div>
          )}

          {/* ── 3. HEADER HERO PANEL ── */}
          <header className="rounded-2xl border border-[#403947] bg-[#1C1B1B] p-6 lg:p-8 space-y-6 shadow-md">
            {/* Meta Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
              <div className="flex items-center gap-2">
                <span className="rounded px-2.5 py-1 font-bold uppercase tracking-wider text-[#DDB7FF] bg-[#DDB7FF]/10 border border-[#DDB7FF]/20">
                  {market.category}
                </span>
                <span className={`rounded px-2.5 py-1 font-bold uppercase tracking-wider ${isV2 ? 'text-[#4FDBC8] bg-[#4FDBC8]/10 border border-[#4FDBC8]/20' : 'text-[#B0ABB5] bg-[#252229] border border-[#403947]'}`}>
                  {isV2 ? 'V2' : 'V1 Legacy'}
                </span>
                {timeframe && (
                  <span className="rounded px-2.5 py-1 font-medium uppercase tracking-wider text-[#B0ABB5] bg-[#252229] border border-[#403947]">
                    {timeframe} Timeframe
                  </span>
                )}
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-bold uppercase tracking-wider ${statusBadgeClass}`}>
                  <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-[#4FDBC8] animate-pulse' : 'bg-current'}`} />
                  {statusLabel}
                </span>
              </div>

              {/* Countdown / Status Indicator */}
              <div className="flex items-center gap-2 text-xs text-[#B0ABB5] font-sans">
                <Clock size={15} className="text-[#B0ABB5]" />
                <span className="font-mono tabular-nums text-xs">
                  {resolved ? (
                    'Settlement Complete'
                  ) : isPending ? (
                    'Awaiting Oracle Resolution'
                  ) : (
                    <>Closes in <CountdownTimer resolutionTime={market.resolutionTime} resolved={false} /></>
                  )}
                </span>
              </div>
            </div>

            {/* Market Question Heading (28px desktop, 22px mobile) */}
            <h1 className="font-display text-[22px] leading-[30px] sm:text-[28px] sm:leading-[36px] font-bold text-[#F1EEF4] tracking-tight">
              {market.title}
            </h1>

            {/* Key Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 border-t border-[#403947]/70 font-mono">
              {/* AI Prediction */}
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#B0ABB5] font-sans block">
                  AI Prediction
                </span>
                <p className="text-xl sm:text-2xl font-bold text-[#DDB7FF] flex items-center gap-1.5 tracking-tight">
                  <Sparkles size={18} className="shrink-0" />
                  <span>{isFollowAi ? 'FOLLOW AI' : 'FADE AI'}</span>
                </p>
              </div>

              {/* AI Confidence */}
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#B0ABB5] font-sans block">
                  AI Confidence
                </span>
                <p className="text-xl sm:text-2xl font-bold text-[#F1EEF4] tabular-nums tracking-tight">
                  {market.confidence}%
                </p>
              </div>

              {/* Follow / Fade Market Split */}
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#B0ABB5] font-sans block">
                  Market Split
                </span>
                <p className="text-xl sm:text-2xl font-bold tabular-nums tracking-tight">
                  <span className="text-[#4FDBC8]">{formatPercentage(followPercent)}</span>
                  <span className="text-[#B0ABB5] mx-1">/</span>
                  <span className="text-[#F3A6C8]">{formatPercentage(fadePercent)}</span>
                </p>
              </div>

              {/* Total Liquidity */}
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#B0ABB5] font-sans block">
                  Total Liquidity
                </span>
                <p className="text-xl sm:text-2xl font-bold text-[#F1EEF4] tabular-nums tracking-tight">
                  {formatMarketDetailUSDC(totalPool)}
                </p>
              </div>
            </div>
          </header>

          {/* ── 4. TWO-COLUMN WORKSPACE (1440px / 768px / 390px responsive) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* Left Column: Research, Pool Snapshot, Timeline, Analysis (8 cols) */}
            <div className="lg:col-span-8 space-y-6">

              {/* Pool Snapshot & Probability Visualizer */}
              <MarketProbabilityChart
                followPercent={followPercent}
                fadePercent={fadePercent}
                aiConfidence={market.confidence}
                aiPrediction={aiPickUpper}
                openedAt={market.resolution_timestamp ? market.resolution_timestamp - 86400 : undefined}
                resolutionTime={market.resolutionTime}
                marketId={market.marketId}
                followAmount={followPool}
                fadeAmount={fadePool}
                totalLiquidity={totalPool}
              />

              {/* Lifecycle Progression Timeline */}
              <MarketTimeline
                resolutionTime={market.resolutionTime}
                resolved={resolved}
                outcome={market.outcome}
                status={market.status}
                openedAt={market.resolution_timestamp ? market.resolution_timestamp - 86400 : undefined}
              />

              {/* Research, Analysis & Settlement Section */}
              <SignalIntelligence marketId={market.marketId} initialSignals={initialSignals} initialCoverage={signalCoverage} />
              <section className="rounded-2xl border border-[#403947] bg-[#1C1B1B] p-5 lg:p-6 space-y-5 shadow-sm">

                {/* Navigation Tabs */}
                <div className="flex items-center gap-2 border-b border-[#403947]/70 pb-3 font-sans">
                  <button
                    onClick={() => setActiveTab('analysis')}
                    className={`min-h-[44px] px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                      activeTab === 'analysis'
                        ? 'bg-[#DDB7FF] text-[#240B35]'
                        : 'text-[#B0ABB5] hover:text-[#F1EEF4] hover:bg-[#252229]'
                    }`}
                  >
                    <Brain size={15} /> AI Analysis
                  </button>
                  <button
                    onClick={() => setActiveTab('rules')}
                    className={`min-h-[44px] px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                      activeTab === 'rules'
                        ? 'bg-[#DDB7FF] text-[#240B35]'
                        : 'text-[#B0ABB5] hover:text-[#F1EEF4] hover:bg-[#252229]'
                    }`}
                  >
                    <Gavel size={15} /> Settlement Rules
                  </button>
                </div>

                {/* Tab: AI Analysis */}
                {activeTab === 'analysis' && (
                  <div className="space-y-6 font-sans">
                    {/* Executive Summary */}
                    {market.summary && (
                      <div className="space-y-2">
                        <h3 className="font-display text-[16px] leading-[24px] font-bold uppercase tracking-wider text-[#DDB7FF] flex items-center gap-2">
                          <FileText size={16} /> Executive Hypothesis
                        </h3>
                        <p className="text-sm text-[#F1EEF4]/90 leading-[1.65] bg-[#252229] p-4 rounded-xl border border-[#403947]">
                          {market.summary}
                        </p>
                      </div>
                    )}

                    {/* Bull / Bear Cases */}
                    {(market.bull_case || market.bear_case) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {market.bull_case && (
                          <div className="p-4 rounded-xl border border-[#4FDBC8]/30 bg-[#4FDBC8]/5 space-y-2">
                            <h4 className="font-mono text-xs font-bold text-[#4FDBC8] uppercase tracking-wider flex items-center gap-1.5">
                              <TrendingUp size={15} /> Bull Case (Follow)
                            </h4>
                            <p className="text-xs sm:text-[13px] text-[#F1EEF4]/90 leading-[1.6]">
                              {market.bull_case}
                            </p>
                          </div>
                        )}
                        {market.bear_case && (
                          <div className="p-4 rounded-xl border border-[#F3A6C8]/30 bg-[#F3A6C8]/5 space-y-2">
                            <h4 className="font-mono text-xs font-bold text-[#F3A6C8] uppercase tracking-wider flex items-center gap-1.5">
                              <TrendingDown size={15} /> Bear Case (Fade)
                            </h4>
                            <p className="text-xs sm:text-[13px] text-[#F1EEF4]/90 leading-[1.6]">
                              {market.bear_case}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Key Conviction Factors */}
                    {market.keyFactors && market.keyFactors.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="font-display text-[16px] leading-[24px] font-bold text-[#F1EEF4]">
                          Key Conviction Factors
                        </h3>
                        <div className="space-y-2">
                          {market.keyFactors.map((factor, i) => (
                            <div
                              key={i}
                              className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-[#252229] border border-[#403947] gap-2"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="text-[10px] font-bold font-mono uppercase px-2 py-0.5 rounded bg-[#403947] text-[#DDB7FF]">
                                  {categoryLabels[i] || `FACTOR ${i + 1}`}
                                </span>
                                <span className="text-xs sm:text-[13px] text-[#F1EEF4]">{factor}</span>
                              </div>
                              <span className="text-[11px] font-bold text-[#4FDBC8] font-mono shrink-0 self-end sm:self-auto">
                                STRENGTH: HIGH
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Data Ingestion Sources */}
                    <div className="space-y-2">
                      <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#B0ABB5]">
                        Data Ingestion Feeds & Oracles
                      </h3>
                      <div className="flex flex-wrap gap-2 font-mono">
                        {market.data_sources && market.data_sources.length > 0 ? (
                          market.data_sources.map((src, i) => (
                            <span
                              key={i}
                              className="px-3 py-1.5 rounded-lg bg-[#252229] border border-[#403947] text-xs text-[#F1EEF4]"
                            >
                              {src}
                            </span>
                          ))
                        ) : (
                          <span className="px-3 py-1.5 rounded-lg bg-[#252229] border border-[#403947] text-xs text-[#F1EEF4]">
                            {market.category === 'football' ? 'API-Football Live Oracle' : 'CoinGecko Live Price Feed'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: Settlement Rules */}
                {activeTab === 'rules' && (
                  <div className="space-y-6 font-sans">
                    <div className="space-y-2">
                      <h3 className="font-display text-[16px] leading-[24px] font-bold text-[#DDB7FF] flex items-center gap-2">
                        <Gavel size={16} /> Official Resolution Clause
                      </h3>
                      <div className="bg-[#252229] p-4 rounded-xl border border-[#403947] text-xs sm:text-[13px] text-[#F1EEF4] leading-[1.7] space-y-2">
                        <p>
                          {isV2
                            ? `This V2 market is governed by category policy ${market.proof?.categoryId}.${market.proof?.categoryVersion}, oracle policy ${market.proof?.oraclePolicyId}.${market.proof?.oraclePolicyVersion}, and the resolution-source commitment stored on-chain. YES/NO token settlement follows the final oracle result.`
                            : market.category === 'crypto'
                            ? `The owner resolver verifies the configured market-data observation after the cutoff time. The question result is YES when the stated threshold condition is met and NO otherwise. FOLLOW wins only when that result matches the AI prediction (${aiPickUpper}); FADE wins when it differs.`
                            : `The owner resolver checks the exact API-Football fixture recorded when this market was created. The question result uses the final 90-minute plus stoppage-time score. FOLLOW wins only when that result matches the AI prediction (${aiPickUpper}); FADE wins when it differs.`}
                        </p>
                        <p className="text-xs text-[#B0ABB5] border-t border-[#403947]/60 pt-2 font-mono">
                          Expected Oracle Source: <strong className="text-[#F1EEF4] font-sans">{market.resolution_source || (market.category === 'football' ? 'API-Football' : 'CoinGecko / Binance')}</strong>
                        </p>
                      </div>
                    </div>

                    {isV2 && market.proof && (
                      <div className="space-y-2">
                        <h3 className="font-display text-[16px] leading-[24px] font-bold text-[#DDB7FF] flex items-center gap-2">
                          <ShieldCheck size={16} /> V2 Proof Commitments
                        </h3>
                        <dl className="grid sm:grid-cols-2 gap-3 rounded-xl border border-[#403947] bg-[#252229] p-4 text-xs font-mono">
                          <div><dt className="text-[#B0ABB5] font-sans">Category Policy</dt><dd className="mt-1 text-[#F1EEF4]">{market.proof.categoryId}.{market.proof.categoryVersion}</dd></div>
                          <div><dt className="text-[#B0ABB5] font-sans">Oracle Policy</dt><dd className="mt-1 text-[#F1EEF4]">{market.proof.oraclePolicyId}.{market.proof.oraclePolicyVersion}</dd></div>
                          <div><dt className="text-[#B0ABB5] font-sans">State</dt><dd className="mt-1 text-[#F1EEF4]">{market.status} / {market.proof.oracleState}</dd></div>
                          <div><dt className="text-[#B0ABB5] font-sans">Dispute Window</dt><dd className="mt-1 text-[#F1EEF4]">{market.proof.liveness ? `${Math.round(market.proof.liveness / 60)} min` : 'Not indexed'}</dd></div>
                          <div><dt className="text-[#B0ABB5] font-sans">Final Result</dt><dd className="mt-1 text-[#F1EEF4]">{market.outcome ?? 'Pending'}</dd></div>
                          <div><dt className="text-[#B0ABB5] font-sans">Indexed Through</dt><dd className="mt-1 text-[#F1EEF4]">{market.proof.indexedThroughBlock ?? 'Pending'}</dd></div>
                          <div className="sm:col-span-2"><dt className="text-[#B0ABB5] font-sans">Resolution Source Commitment</dt><dd className="mt-1 text-[#F1EEF4] break-all">{market.proof.resolutionSourceHash}</dd></div>
                          <div className="sm:col-span-2"><dt className="text-[#B0ABB5] font-sans">Terms Hash</dt><dd className="mt-1 text-[#F1EEF4] break-all">{market.proof.termsHash}</dd></div>
                          <div className="sm:col-span-2"><dt className="text-[#B0ABB5] font-sans">Ancillary Data Hash</dt><dd className="mt-1 text-[#F1EEF4] break-all">{market.proof.ancillaryDataHash}</dd></div>
                        </dl>
                      </div>
                    )}

                    {resolved && (
                      <div className="space-y-2">
                        <h3 className="font-display text-[16px] leading-[24px] font-bold text-[#DDB7FF] flex items-center gap-2">
                          <ShieldCheck size={16} /> Recorded Settlement Evidence
                        </h3>
                        {resolutionEvidence ? (
                          <dl className="grid sm:grid-cols-2 gap-3 rounded-xl border border-[#403947] bg-[#252229] p-4 text-xs font-mono">
                            <div><dt className="text-[#B0ABB5] font-sans">Provider</dt><dd className="mt-1 text-[#F1EEF4] break-words">{resolutionEvidence.provider || 'Not recorded'}</dd></div>
                            <div><dt className="text-[#B0ABB5] font-sans">Observed Value</dt><dd className="mt-1 text-[#F1EEF4] break-words">{resolutionEvidence.observedValue || 'Not recorded'}</dd></div>
                            <div><dt className="text-[#B0ABB5] font-sans">AI Prediction</dt><dd className="mt-1 text-[#F1EEF4]">{resolutionEvidence.prediction || 'Not recorded'}</dd></div>
                            <div><dt className="text-[#B0ABB5] font-sans">Question Result</dt><dd className="mt-1 text-[#F1EEF4]">{resolutionEvidence.questionResult || 'Not recorded'}</dd></div>
                            <div className="sm:col-span-2"><dt className="text-[#B0ABB5] font-sans">Resolution Decision</dt><dd className="mt-1 text-[#F1EEF4] break-words">{resolutionEvidence.decisionReason || 'Authoritative on-chain settlement.'}</dd></div>
                            <div><dt className="text-[#B0ABB5] font-sans">Observed At</dt><dd className="mt-1 text-[#F1EEF4]">{resolutionEvidence.observedAt ? new Date(resolutionEvidence.observedAt).toLocaleString() : 'Not recorded'}</dd></div>
                            <div><dt className="text-[#B0ABB5] font-sans">Recorded At</dt><dd className="mt-1 text-[#F1EEF4]">{new Date(resolutionEvidence.recordedAt).toLocaleString()}</dd></div>
                            {resolutionEvidence.transactionHash && (
                              <div className="sm:col-span-2">
                                <Link href={`/transaction/${resolutionEvidence.transactionHash}`} className="inline-flex min-h-[44px] items-center gap-2 text-[#DDB7FF] hover:underline font-sans">
                                  <ExternalLink size={14} /> Verify resolution transaction on-chain
                                </Link>
                              </div>
                            )}
                          </dl>
                        ) : (
                          <p className="rounded-xl border border-[#403947] bg-[#252229] p-4 text-xs text-[#B0ABB5]">
                            No structured off-chain evidence record is stored for this settlement. The on-chain outcome remains authoritative.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Blockchain Contract Transparency */}
                    <div className="space-y-3">
                      <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#B0ABB5]">
                        Smart Contract Specifications
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3.5 rounded-xl bg-[#252229] border border-[#403947] space-y-1">
                          <span className="font-mono text-[11px] text-[#B0ABB5] uppercase tracking-wider block">
                            Contract Address
                          </span>
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[#F1EEF4] truncate max-w-[180px]">
                              {isV2 ? market.proof?.marketAddress : ARCSIGNAL_ADDRESS}
                            </span>
                            <Link href="/docs" className="text-[#DDB7FF] hover:underline">
                              Docs
                            </Link>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-[#252229] border border-[#403947] space-y-1">
                          <span className="font-mono text-[11px] text-[#B0ABB5] uppercase tracking-wider block">
                            Protocol Trading Fee
                          </span>
                          <span className="font-mono text-[#4FDBC8] font-bold">
                            {isV2 ? `${((v2ProtocolFeeBps + v2LpFeeBps) / 100).toFixed(2)}% total AMM fee` : '0.00 USDC (0%)'}
                          </span>
                          <p className="font-mono text-[11px] text-[#B0ABB5]">
                            {isV2 ? `Fee version ${market.proof?.feeVersion ?? 'not indexed'}: ${v2ProtocolFeeBps} bps protocol + ${v2LpFeeBps} bps LP.` : 'No protocol fee charged by the deployed contract.'}
                          </p>
                        </div>
                        {isV2 && market.proof && (
                          <>
                            <div className="p-3.5 rounded-xl bg-[#252229] border border-[#403947] space-y-1">
                              <span className="font-mono text-[11px] text-[#B0ABB5] uppercase tracking-wider block">AMM</span>
                              <span className="font-mono text-[#F1EEF4] break-all">{market.proof.ammAddress}</span>
                            </div>
                            <div className="p-3.5 rounded-xl bg-[#252229] border border-[#403947] space-y-1">
                              <span className="font-mono text-[11px] text-[#B0ABB5] uppercase tracking-wider block">YES / NO Tokens</span>
                              <span className="font-mono text-[#F1EEF4] break-all">{market.proof.yesTokenAddress}</span>
                              <span className="font-mono text-[#F1EEF4] break-all block">{market.proof.noTokenAddress}</span>
                            </div>
                            <div className="p-3.5 rounded-xl bg-[#252229] border border-[#403947] space-y-1">
                              <span className="font-mono text-[11px] text-[#B0ABB5] uppercase tracking-wider block">AMM Reserves</span>
                              <span className="font-mono text-[#4FDBC8] block">YES {formatMarketDetailUSDC(toHumanUsdcNumber(v2Reserves?.[0] ?? 0n))}</span>
                              <span className="font-mono text-[#F3A6C8] block">NO {formatMarketDetailUSDC(toHumanUsdcNumber(v2Reserves?.[1] ?? 0n))}</span>
                            </div>
                            <div className="p-3.5 rounded-xl bg-[#252229] border border-[#403947] space-y-1">
                              <span className="font-mono text-[11px] text-[#B0ABB5] uppercase tracking-wider block">Your V2 Position</span>
                              <span className="font-mono text-[#4FDBC8] block">YES {formatMarketDetailUSDC(toHumanUsdcNumber(v2YesBalance))}</span>
                              <span className="font-mono text-[#F3A6C8] block">NO {formatMarketDetailUSDC(toHumanUsdcNumber(v2NoBalance))}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              </section>

            </div>

            {/* Right Column: Sticky Trading Action Panel (4 cols) */}
            <aside className="lg:col-span-4 space-y-6 shrink-0 font-sans">

              <div className="rounded-2xl border border-[#403947] bg-[#1C1B1B] p-6 space-y-6 shadow-xl sticky top-24">

                {/* Panel Title & Status */}
                <div className="flex items-center justify-between border-b border-[#403947]/70 pb-4">
                  <div>
                    <h2 className="font-display text-[20px] leading-[26px] font-bold text-[#F1EEF4] tracking-tight">
                      {resolved ? 'Settlement Terminal' : 'Trading Action'}
                    </h2>
                    <p className="text-xs text-[#B0ABB5] mt-0.5">
                      {resolved ? 'View verified outcome & claim winnings' : 'Take a position on this prediction'}
                    </p>
                  </div>
                  <Zap size={18} className="text-[#DDB7FF]" />
                </div>

                {/* Protocol Trading Fee Visible */}
                <div className="flex items-center justify-between rounded-xl border border-[#4FDBC8]/30 bg-[#4FDBC8]/5 px-3 py-2 font-mono text-xs">
                  <span className="text-[#B0ABB5] uppercase tracking-wider font-sans">Protocol Trading Fee</span>
                  <span className="font-bold text-[#4FDBC8]">{isV2 ? `${v2ProtocolFeeBps + v2LpFeeBps} bps` : '0% (No Fee)'}</span>
                </div>

                {/* Current Pool Split Visualizer */}
                <div className="space-y-2 font-mono">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-[#4FDBC8] tracking-tight">
                      FOLLOW {formatPercentage(followPercent)}
                    </span>
                    <span className="text-[#F3A6C8] tracking-tight">
                      FADE {formatPercentage(fadePercent)}
                    </span>
                  </div>

                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#131313] flex border border-[#403947]/60">
                    <div
                      className="bg-[#4FDBC8] transition-all duration-250 rounded-l-full"
                      style={{ width: `${followPercent}%` }}
                    />
                    <div
                      className="bg-[#F3A6C8] transition-all duration-250 rounded-r-full"
                      style={{ width: `${fadePercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#B0ABB5] tabular-nums">
                    <span>{formatMarketDetailUSDC(followPool)}</span>
                    <span>{formatMarketDetailUSDC(fadePool)}</span>
                  </div>
                </div>

                {/* Current Pool Payout Estimate Cards */}
                <div className="grid grid-cols-2 gap-3 text-center font-mono">
                  <div className="p-3 rounded-xl bg-[#252229] border border-[#403947]">
                    <span className="text-[11px] text-[#B0ABB5] uppercase tracking-wider block mb-1 font-sans">
                      Follow Payout
                    </span>
                    <span className="text-lg font-bold text-[#4FDBC8] tabular-nums tracking-tight">
                      {formatMultiplier(followMultiplier)}
                    </span>
                    <span className="block text-[10px] text-[#B0ABB5]/70 mt-0.5">Current pool estimate</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#252229] border border-[#403947]">
                    <span className="text-[11px] text-[#B0ABB5] uppercase tracking-wider block mb-1 font-sans">
                      Fade Payout
                    </span>
                    <span className="text-lg font-bold text-[#F3A6C8] tabular-nums tracking-tight">
                      {formatMultiplier(fadeMultiplier)}
                    </span>
                    <span className="block text-[10px] text-[#B0ABB5]/70 mt-0.5">Current pool estimate</span>
                  </div>
                </div>

                {/* Active Trading Controls or Claim Section */}
                {isOpen && !isV2 ? (
                  <div className="space-y-4 pt-1">
                    <div className="space-y-2.5">
                      {/* Follow Button */}
                      <button
                        type="button"
                        onClick={() => setStakeModalSide(0)}
                        className="w-full min-h-[48px] flex items-center justify-between py-3 px-4 rounded-xl border border-[#4FDBC8]/40 bg-[#4FDBC8]/10 hover:bg-[#4FDBC8] text-[#4FDBC8] hover:text-[#131313] font-sans font-bold text-xs transition-all duration-140 active:scale-[0.98] shadow-md group"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={18} />
                          <span>Follow AI Prediction</span>
                        </div>
                        <span className="font-mono text-xs tabular-nums font-bold">
                          {formatPercentage(followPercent)}
                        </span>
                      </button>

                      {/* Fade Button */}
                      <button
                        type="button"
                        onClick={() => setStakeModalSide(1)}
                        className="w-full min-h-[48px] flex items-center justify-between py-3 px-4 rounded-xl border border-[#F3A6C8]/40 bg-[#F3A6C8]/10 hover:bg-[#F3A6C8] text-[#F3A6C8] hover:text-[#240B35] font-sans font-bold text-xs transition-all duration-140 active:scale-[0.98] shadow-md group"
                      >
                        <div className="flex items-center gap-2">
                          <XCircle size={18} />
                          <span>Fade AI Prediction</span>
                        </div>
                        <span className="font-mono text-xs tabular-nums font-bold">
                          {formatPercentage(fadePercent)}
                        </span>
                      </button>
                    </div>

                    {/* Concise Mechanics Explanatory Text */}
                    <div className="p-3.5 rounded-xl bg-[#252229] border border-[#403947] text-xs text-[#B0ABB5] leading-relaxed space-y-1">
                      <p>
                        <strong className="text-[#F1EEF4]">Follow</strong> supports the AI prediction ({aiPickUpper}).
                      </p>
                      <p>
                        <strong className="text-[#F1EEF4]">Fade</strong> opposes the AI prediction.
                      </p>
                    </div>
                  </div>
                ) : isOpen && isV2 ? (
                  <div className="space-y-4 pt-1">
                    <div className="p-4 rounded-xl bg-[#252229] border border-[#403947] space-y-2">
                      <h4 className="font-mono text-xs font-bold text-[#F1EEF4] uppercase tracking-wider">
                        V2 AMM Trading
                      </h4>
                      <p className="text-xs text-[#B0ABB5] leading-relaxed">
                        This market uses V2 YES/NO position tokens and an AMM. Live AMM reserves are read from the V2 AMM contract; the proof panel lists the market, collateral, and token contracts for direct verification.
                      </p>
                      <dl className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="rounded-lg border border-[#403947] bg-[#131313] p-2">
                          <dt className="text-[#B0ABB5] font-sans">YES reserve</dt>
                          <dd className="mt-1 text-[#4FDBC8]">{formatMarketDetailUSDC(toHumanUsdcNumber(v2Reserves?.[0] ?? 0n))}</dd>
                        </div>
                        <div className="rounded-lg border border-[#403947] bg-[#131313] p-2">
                          <dt className="text-[#B0ABB5] font-sans">NO reserve</dt>
                          <dd className="mt-1 text-[#F3A6C8]">{formatMarketDetailUSDC(toHumanUsdcNumber(v2Reserves?.[1] ?? 0n))}</dd>
                        </div>
                      </dl>
                      <Link href="#signal-intelligence-title" className="inline-flex min-h-[44px] items-center gap-2 text-[#DDB7FF] hover:underline text-xs font-bold">
                        Review signals before trading
                      </Link>
                    </div>
                  </div>
                ) : (
                  /* Resolved / Claim Section */
                  <div className="space-y-4 pt-1">
                    <div className="p-4 rounded-xl bg-[#252229] border border-[#403947] space-y-2 text-center">
                      <Gavel size={24} className="mx-auto text-[#DDB7FF]" />
                      <h4 className="font-mono text-xs font-bold text-[#F1EEF4] uppercase tracking-wider">
                        Official Outcome Recorded
                      </h4>
                      <p className={`font-mono text-lg font-bold tracking-tight ${
                        outcome === 1 ? 'text-[#4FDBC8]' : outcome === 2 ? 'text-[#F3A6C8]' : 'text-[#F1EEF4]'
                      }`}>
                        {outcome === 1 ? 'FOLLOW WON' : outcome === 2 ? 'FADE WON' : 'CANCELLED / REFUND'}
                      </p>
                    </div>

                    {(userWon || refundable) && !isClaimed && (
                      <button
                        onClick={handleClaim}
                        disabled={isClaiming}
                        className="w-full min-h-[48px] py-3 rounded-xl font-bold text-xs font-mono tracking-wider transition-all disabled:opacity-50 shadow-lg bg-[#DDB7FF] hover:bg-[#DDB7FF]/90 text-[#240B35] flex items-center justify-center gap-2"
                      >
                        {isClaiming
                          ? 'Submitting claim…'
                          : `${refundable ? 'Claim Refund' : 'Claim Winnings'} (${formatMarketDetailUSDC(payout)})`}
                      </button>
                    )}

                    {(userWon || refundable) && isClaimed && (
                      <div className="w-full min-h-[44px] py-3 rounded-xl bg-[#4FDBC8]/10 border border-[#4FDBC8]/30 text-[#4FDBC8] text-center font-bold text-xs font-mono flex items-center justify-center">
                        ✓ {refundable ? 'Refund' : 'Winnings'} Claimed Successfully
                      </div>
                    )}

                    {!userWon && !refundable && (followStakeRaw > 0n || fadeStakeRaw > 0n) && (
                      <div className="w-full min-h-[44px] py-3 rounded-xl bg-[#F3A6C8]/10 border border-[#F3A6C8]/30 text-[#F3A6C8] text-center font-semibold text-xs font-sans flex items-center justify-center">
                        Position Closed (No Winnings)
                      </div>
                    )}

                    {followStakeRaw === 0n && fadeStakeRaw === 0n && (
                      <div className="w-full min-h-[44px] py-3 rounded-xl bg-[#252229] border border-[#403947] text-[#B0ABB5] text-center text-xs font-sans flex items-center justify-center">
                        No active wallet position in this pool
                      </div>
                    )}
                  </div>
                )}

                {/* User's Current Position */}
                {address && (followStakeRaw > 0n || fadeStakeRaw > 0n) && (
                  <div className="p-3.5 rounded-xl bg-[#252229] border border-[#DDB7FF]/30 space-y-2 font-sans">
                    <span className="font-mono text-[11px] font-bold text-[#DDB7FF] uppercase tracking-wider block">
                      Your Position
                    </span>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#B0ABB5]">Staked Side:</span>
                      <strong className={`font-mono font-bold ${followStakeRaw > 0n ? 'text-[#4FDBC8]' : 'text-[#F3A6C8]'}`}>
                        {followStakeRaw > 0n ? 'FOLLOW' : 'FADE'}
                      </strong>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#B0ABB5]">Amount:</span>
                      <span className="font-mono text-[#F1EEF4] font-bold tabular-nums">
                        {formatMarketDetailUSDC(followStakeRaw > 0n ? followStakeRaw : fadeStakeRaw)}
                      </span>
                    </div>
                  </div>
                )}

              </div>

            </aside>

          </div>

        </div>
      </main>

      {/* Dedicated Market Detail Stake Modal */}
      {stakeModalSide !== null && !isV2 && (
        <MarketDetailStakeModal
          market={market}
          side={stakeModalSide}
          isOpen={true}
          onClose={() => setStakeModalSide(null)}
        />
      )}
    </div>
  );
}
