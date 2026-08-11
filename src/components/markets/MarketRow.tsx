'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { formatUnits } from 'viem';
import { useReadContract } from 'wagmi';
import { ArrowUpRight, Check, Clock3, HelpCircle, Sparkles, X } from 'lucide-react';
import { ARCSIGNAL_ABI, ARCSIGNAL_ADDRESS } from '@/lib/contracts';
import type { SerializableMarket } from '@/lib/markets';
import { CountdownTimer } from './CountdownTimer';

export interface MarketRowProps {
  market: SerializableMarket;
  onFollow: () => void;
  onFade: () => void;
}

function formatUsdc(value: bigint) {
  return Number(formatUnits(value, 6)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function asRawUsdc(value: string | number) {
  return BigInt(Math.max(0, Math.round(Number(value) * 1_000_000)));
}

function getTimeframe(marketId: string) {
  return marketId.match(/-PRICE-(5m|15m|1h|4h|24h)-/)?.[1] ?? null;
}

export function MarketRow({ market, onFollow, onFade }: MarketRowProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const { data } = useReadContract({
    address: ARCSIGNAL_ADDRESS,
    abi: ARCSIGNAL_ABI,
    functionName: 'getMarket',
    args: [market.marketId],
    query: { enabled: market.marketId.length > 0, staleTime: 10_000, refetchInterval: 15_000 },
  });

  const chainMarket = data as { followPool?: bigint; fadePool?: bigint } | undefined;
  const followPool = chainMarket?.followPool ?? asRawUsdc(market.followPool);
  const fadePool = chainMarket?.fadePool ?? asRawUsdc(market.fadePool);
  const totalPool = followPool + fadePool;

  const followShare = totalPool > 0n ? Number((followPool * 1000n) / totalPool) / 10 : 50;
  const fadeShare = totalPool > 0n ? Number((fadePool * 1000n) / totalPool) / 10 : 50;
  const timeframe = getTimeframe(market.marketId);

  const now = Math.floor(Date.now() / 1000);
  const isResolved = market.resolved || market.status === 'RESOLVED';
  const isPending = !isResolved && (market.status === 'PENDING_RESOLUTION' || market.resolutionTime <= now);
  const isClosed = !isResolved && !isPending && market.status === 'CLOSED';
  const isOpen = !isResolved && !isPending && !isClosed;

  const aiPrediction = market.analysis?.prediction?.toUpperCase() || 'YES';
  const confidence = Math.round(market.analysis?.confidence ?? 0);

  // Status mapping per prompt specification
  let statusLabel = 'OPEN';
  let statusColorClass = 'border-[#c0c1ff]/30 bg-[#c0c1ff]/10 text-[#c0c1ff]';
  let statusExplanation = '';

  if (isResolved) {
    if (market.outcome === 'CANCELLED') {
      statusLabel = 'CANCELLED';
      statusColorClass = 'border-slate-500/30 bg-slate-500/10 text-slate-400';
      statusExplanation = 'Market was cancelled or voided. Stakes are refunded.';
    } else {
      statusLabel = 'RESOLVED';
      statusColorClass = 'border-[#ddb7ff]/30 bg-[#ddb7ff]/10 text-[#ddb7ff]';
      statusExplanation = `Settlement recorded (${market.outcome === 'FOLLOW' ? 'Follow won' : 'Fade won'}). Winnings claimable.`;
    }
  } else if (isPending) {
    statusLabel = 'PENDING RESOLUTION';
    statusColorClass = 'border-amber-400/30 bg-amber-400/10 text-amber-300';
    statusExplanation = 'Closed — awaiting oracle resolution. Trading is disabled until settlement is recorded.';
  } else if (isClosed) {
    statusLabel = 'CLOSED';
    statusColorClass = 'border-amber-400/30 bg-amber-400/10 text-amber-300';
    statusExplanation = 'Market closed for trading — awaiting oracle resolution.';
  }

  const isFollowAi = aiPrediction === 'YES' || aiPrediction === 'FOLLOW';

  return (
    <article className="group relative flex flex-col xl:flex-row xl:items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-[#171717] px-4 py-3.5 transition-all duration-150 hover:border-[#ddb7ff]/35 hover:bg-[#1b1a1b] hover:shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
      
      {/* Left Column: Metadata + Market Question */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        {/* Meta badges row */}
        <div className="flex flex-wrap items-center gap-2 mb-1.5 font-mono text-[10px] tracking-[0.06em]">
          <span className="rounded px-2 py-0.5 font-bold uppercase text-[#ddb7ff] bg-[#ddb7ff]/10 border border-[#ddb7ff]/20">
            {market.category}
          </span>

          {timeframe && (
            <span className="rounded px-1.5 py-0.5 font-medium uppercase text-[#94a3b8] bg-white/[0.04] border border-white/[0.08]">
              {timeframe}
            </span>
          )}

          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold uppercase ${statusColorClass}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-[#c0c1ff] animate-pulse' : isPending ? 'bg-amber-300' : 'bg-current'}`} />
            {statusLabel}
          </span>

          <div className="flex items-center gap-1 font-sans text-[11px] text-[#94a3b8] ml-auto xl:ml-2">
            <Clock3 size={12} className="text-[#94a3b8]" />
            <span className="tabular-nums font-mono text-[11px]">
              {isResolved ? (
                'Settled'
              ) : isPending ? (
                'Awaiting oracle'
              ) : (
                <>Closes <CountdownTimer resolutionTime={market.resolutionTime} resolved={false} /></>
              )}
            </span>
          </div>
        </div>

        {/* Primary Question Text */}
        <Link
          href={`/market/${market.marketId}`}
          className="group/link flex items-center gap-1.5 text-white font-display text-[15px] sm:text-[16px] font-bold tracking-[-0.015em] hover:text-[#ead7ff] transition-colors leading-[1.35] line-clamp-2"
        >
          <span>{market.question || market.marketId}</span>
          <ArrowUpRight size={14} className="opacity-0 -translate-x-1 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all text-[#ddb7ff] shrink-0" />
        </Link>
      </div>

      {/* Center Column: Odds / Probability Split & Liquidity & AI Signal */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 xl:gap-6 shrink-0 xl:px-4 xl:border-x xl:border-white/[0.06]">
        
        {/* Follow / Fade Implied Odds with Split Bar */}
        <div className="flex flex-col gap-1.5 min-w-[200px] lg:min-w-[220px]">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#4fdbc8] flex items-center gap-1 font-semibold tracking-tight">
              FOLLOW <span className="font-bold tabular-nums text-[13px]">{followShare.toFixed(0)}%</span>
            </span>
            <span className="text-[#f87171] flex items-center gap-1 font-semibold tracking-tight">
              FADE <span className="font-bold tabular-nums text-[13px]">{fadeShare.toFixed(0)}%</span>
            </span>
          </div>

          {/* Unified Dual Color Probability Bar */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#262626] flex">
            <div
              className="bg-[#4fdbc8] transition-all duration-500 rounded-l-full"
              style={{ width: `${followShare}%` }}
              title={`Follow pool: ${followShare.toFixed(1)}%`}
            />
            <div
              className="bg-[#f87171] transition-all duration-500 rounded-r-full"
              style={{ width: `${fadeShare}%` }}
              title={`Fade pool: ${fadeShare.toFixed(1)}%`}
            />
          </div>

          {/* Context details: Liquidity + AI Signal */}
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-mono tabular-nums text-[#cbd5e1] font-medium">
              {formatUsdc(totalPool)} <span className="text-[#64748b] font-sans text-[10px] font-normal">USDC</span>
            </span>

            <span className="inline-flex items-center gap-1 text-[#ddb7ff] font-mono text-[10px]">
              <Sparkles size={11} className="text-[#ddb7ff]" />
              <span className="font-bold text-white uppercase tracking-tight">AI {isFollowAi ? 'FOLLOW' : 'FADE'}</span>
              {confidence > 0 && <span className="text-[#94a3b8] tabular-nums">· {confidence}%</span>}
            </span>
          </div>
        </div>
      </div>

      {/* Right Column: Equal-Weight Trading Action Controls & Microcopy */}
      <div className="flex flex-col gap-1.5 shrink-0 xl:min-w-[240px]">
        {isOpen ? (
          <div className="flex items-center gap-2">
            {/* Follow Button (Teal) */}
            <button
              type="button"
              onClick={onFollow}
              className="flex-1 group/btn relative flex items-center justify-center gap-1.5 rounded-lg border border-[#4fdbc8]/40 bg-[#4fdbc8]/10 hover:bg-[#4fdbc8] text-[#4fdbc8] hover:text-[#0b1716] font-sans font-semibold text-xs py-2.5 px-3 transition-all duration-150 active:scale-[0.98] shadow-sm"
              title="Support the AI prediction"
            >
              <Check size={13} className="stroke-[2.5]" />
              <span>Follow</span>
              <span className="font-mono font-bold text-[11px] tabular-nums opacity-90">
                {followShare.toFixed(0)}%
              </span>
            </button>

            {/* Fade Button (Coral) */}
            <button
              type="button"
              onClick={onFade}
              className="flex-1 group/btn relative flex items-center justify-center gap-1.5 rounded-lg border border-[#f87171]/40 bg-[#f87171]/10 hover:bg-[#f87171] text-[#f87171] hover:text-[#180a0a] font-sans font-semibold text-xs py-2.5 px-3 transition-all duration-150 active:scale-[0.98] shadow-sm"
              title="Oppose the AI prediction"
            >
              <X size={13} className="stroke-[2.5]" />
              <span>Fade</span>
              <span className="font-mono font-bold text-[11px] tabular-nums opacity-90">
                {fadeShare.toFixed(0)}%
              </span>
            </button>

            {/* Clarification Tooltip Icon */}
            <div className="relative">
              <button
                type="button"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onClick={() => setShowTooltip(!showTooltip)}
                className="p-1.5 text-[#64748b] hover:text-[#cbd5e1] transition-colors rounded-full hover:bg-white/[0.05]"
                aria-label="Trading mechanism explanation"
              >
                <HelpCircle size={14} />
              </button>

              {showTooltip && (
                <div className="absolute right-0 bottom-full mb-2 w-64 p-2.5 rounded-lg bg-[#0e0e0e] border border-white/[0.12] shadow-2xl text-[11px] text-[#cbd5e1] z-30 leading-relaxed pointer-events-none font-sans">
                  <p className="font-semibold text-white mb-1 font-display">Trading Mechanics:</p>
                  <p className="mb-1"><strong className="text-[#4fdbc8]">Follow</strong> = support AI prediction ({aiPrediction})</p>
                  <p className="mb-1"><strong className="text-[#f87171]">Fade</strong> = oppose AI prediction</p>
                  <p className="text-[10px] text-[#94a3b8] border-t border-white/[0.06] pt-1 mt-1 font-mono">
                    Percentages reflect current market pool split, not a guaranteed payout probability.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <Link
              href={`/market/${market.marketId}`}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.08] text-[#cbd5e1] hover:text-white font-sans font-medium text-xs py-2 px-3 transition-colors text-center"
            >
              <span>{isPending ? 'View Resolution Status' : 'View Market Details'}</span>
              <ArrowUpRight size={13} />
            </Link>
            {statusExplanation && (
              <p className="text-[10px] text-[#94a3b8] text-center line-clamp-1 font-sans">
                {statusExplanation}
              </p>
            )}
          </div>
        )}

        {/* Micro-copy intent line for open markets */}
        {isOpen && (
          <div className="flex items-center justify-between font-mono text-[10px] tracking-wide text-[#64748b] px-0.5 uppercase">
            <span>Follow: Support AI</span>
            <span>Fade: Oppose AI</span>
          </div>
        )}
      </div>
    </article>
  );
}
