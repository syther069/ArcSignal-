'use client';

import { tradingDesign } from '@/components/layout/TradingDesign';

import React, { useState } from 'react';
import Link from 'next/link';
import { formatUnits } from 'viem';
import { ArrowUpRight, Check, Clock3, HelpCircle, Sparkles, X } from 'lucide-react';
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

export const MarketRow = React.memo(function MarketRow({ market, onFollow, onFade }: MarketRowProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const followPool = asRawUsdc(market.followPool);
  const fadePool = asRawUsdc(market.fadePool);
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

  // Status mapping per specification
  let statusLabel = 'OPEN';
  let statusColorClass = 'border-[#c0c1ff]/30 bg-[#c0c1ff]/10 text-[#c0c1ff]';
  let statusExplanation = '';

  if (isResolved) {
    if (market.outcome === 'CANCELLED') {
      statusLabel = 'CANCELLED';
      statusColorClass = 'border-[#b0abb5]/30 bg-[#b0abb5]/10 text-[#b0abb5]';
      statusExplanation = 'Market was cancelled or voided. Stakes are refunded.';
    } else {
      statusLabel = 'RESOLVED';
      statusColorClass = 'border-[#ddb7ff]/30 bg-[#ddb7ff]/10 text-[#ddb7ff]';
      statusExplanation = `Settlement recorded (${market.outcome === 'FOLLOW' ? 'Follow won' : 'Fade won'}). Winnings claimable.`;
    }
  } else if (isPending) {
    statusLabel = 'PENDING RESOLUTION';
    statusColorClass = 'border-[#f2c66d]/30 bg-[#f2c66d]/10 text-[#f2c66d]';
    statusExplanation = 'Closed — awaiting oracle resolution. Trading is disabled until settlement is recorded.';
  } else if (isClosed) {
    statusLabel = 'CLOSED';
    statusColorClass = 'border-[#f2c66d]/30 bg-[#f2c66d]/10 text-[#f2c66d]';
    statusExplanation = 'Market closed for trading — awaiting oracle resolution.';
  }

  const isFollowAi = aiPrediction === 'YES' || aiPrediction === 'FOLLOW';

  return (
    <article className={`${tradingDesign} group relative flex flex-col xl:flex-row xl:items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-[#1c1b1b] px-5 py-5 transition-all duration-[140ms] hover:border-[#ddb7ff]/35 hover:bg-[#252229] hover:shadow-[0_4px_20px_rgba(0,0,0,0.35)]`}>
      
      {/* Left Column: Metadata + Market Question */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        {/* Meta badges row */}
        <div className="flex flex-wrap items-center gap-2 mb-1.5 font-mono text-[13px] tracking-[0.06em]">
          <span className="rounded px-2 py-0.5 font-bold uppercase text-[#ddb7ff] bg-[#ddb7ff]/10 border border-[#ddb7ff]/20">
            {market.category}
          </span>

          {timeframe && (
            <span className="rounded px-1.5 py-0.5 font-medium uppercase text-[#b0abb5] bg-white/[0.04] border border-white/[0.08]">
              {timeframe}
            </span>
          )}

          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold uppercase ${statusColorClass}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-[#c0c1ff] animate-pulse' : isPending ? 'bg-[#f2c66d]' : 'bg-current'}`} />
            {statusLabel}
          </span>

          <div className="flex items-center gap-1 font-sans text-[13px] text-[#b0abb5] ml-auto xl:ml-2">
            <Clock3 size={12} className="text-[#b0abb5]" />
            <span className="tabular-nums font-mono text-[13px]">
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
          className="group/link flex items-center gap-1.5 text-[#f1eef4] font-display text-[18px] font-semibold tracking-[-0.015em] hover:text-[#ddb7ff] transition-colors leading-[1.35] line-clamp-2"
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
            <span className="text-[#ddb7ff] flex items-center gap-1 font-semibold tracking-tight">
              FOLLOW <span className="font-bold tabular-nums text-[13px]">{followShare.toFixed(0)}%</span>
            </span>
            <span className="text-[#f3a6c8] flex items-center gap-1 font-semibold tracking-tight">
              FADE <span className="font-bold tabular-nums text-[13px]">{fadeShare.toFixed(0)}%</span>
            </span>
          </div>

          {/* Unified Dual Color Probability Bar */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#403947] flex">
            <div
              className="bg-[#ddb7ff] transition-all duration-[250ms] rounded-l-full"
              style={{ width: `${followShare}%` }}
              title={`Follow pool: ${followShare.toFixed(1)}%`}
            />
            <div
              className="bg-[#f3a6c8] transition-all duration-[250ms] rounded-r-full"
              style={{ width: `${fadeShare}%` }}
              title={`Fade pool: ${fadeShare.toFixed(1)}%`}
            />
          </div>

          {/* Context details: Liquidity + AI Signal */}
          <div className="flex items-center justify-between text-[13px]">
            <span className="font-mono tabular-nums text-[#f1eef4] font-medium">
              {formatUsdc(totalPool)} <span className="text-[#b0abb5] font-sans text-[13px] font-normal">USDC</span>
            </span>

            <span className="inline-flex items-center gap-1 text-[#ddb7ff] font-mono text-[13px]">
              <Sparkles size={11} className="text-[#ddb7ff]" />
              <span className="font-bold text-[#f1eef4] uppercase tracking-tight">AI {isFollowAi ? 'FOLLOW' : 'FADE'}</span>
              {confidence > 0 && <span className="text-[#b0abb5] tabular-nums">· {confidence}%</span>}
            </span>
          </div>
        </div>
      </div>

      {/* Right Column: Equal-Weight Trading Action Controls & Microcopy */}
      <div className="flex flex-col gap-1.5 shrink-0 xl:min-w-[260px]">
        {isOpen ? (
          <div className="flex items-center gap-2">
            {/* Follow Button (Teal) */}
            <button
              type="button"
              onClick={onFollow}
              className="flex-1 group/btn relative flex items-center justify-center gap-1.5 rounded-lg border border-[#ddb7ff]/40 bg-[#ddb7ff]/10 hover:bg-[#ddb7ff] text-[#ddb7ff] hover:text-[#240b35] font-sans font-semibold text-xs min-h-[44px] py-2.5 px-3 transition-all duration-[140ms] active:scale-[0.98] shadow-sm"
              title="Support the AI prediction"
              aria-label={`Follow AI prediction: ${market.question || market.marketId}`}
            >
              <Check size={13} className="stroke-[2.5]" />
              <span>Follow</span>
              <span className="font-mono font-bold text-[13px] tabular-nums opacity-90">
                {followShare.toFixed(0)}%
              </span>
            </button>

            {/* Fade Button (Coral) */}
            <button
              type="button"
              onClick={onFade}
              className="flex-1 group/btn relative flex items-center justify-center gap-1.5 rounded-lg border border-[#f3a6c8]/40 bg-[#f3a6c8]/10 hover:bg-[#f3a6c8] text-[#f3a6c8] hover:text-[#240b35] font-sans font-semibold text-xs min-h-[44px] py-2.5 px-3 transition-all duration-[140ms] active:scale-[0.98] shadow-sm"
              title="Oppose the AI prediction"
              aria-label={`Fade AI prediction: ${market.question || market.marketId}`}
            >
              <X size={13} className="stroke-[2.5]" />
              <span>Fade</span>
              <span className="font-mono font-bold text-[13px] tabular-nums opacity-90">
                {fadeShare.toFixed(0)}%
              </span>
            </button>

            {/* Clarification Tooltip Icon */}
            <div className="relative">
              <button
                type="button"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onFocus={() => setShowTooltip(true)}
                onBlur={() => setShowTooltip(false)}
                onClick={() => setShowTooltip(!showTooltip)}
                className="min-h-[44px] min-w-[44px] p-1.5 text-[#b0abb5] hover:text-[#f1eef4] transition-colors rounded-full hover:bg-white/[0.05]"
                aria-label="Trading mechanism explanation"
              >
                <HelpCircle size={14} />
              </button>

              {showTooltip && (
                <div className="absolute right-0 bottom-full mb-2 w-64 p-2.5 rounded-lg bg-[#0e0e0e] border border-white/[0.12] shadow-2xl text-[13px] text-[#f1eef4] z-30 leading-relaxed pointer-events-none font-sans">
                  <p className="font-semibold text-[#f1eef4] mb-1 font-display">Trading Mechanics:</p>
                  <p className="mb-1"><strong className="text-[#ddb7ff]">Follow</strong> = support AI prediction ({aiPrediction})</p>
                  <p className="mb-1"><strong className="text-[#f3a6c8]">Fade</strong> = oppose AI prediction</p>
                  <p className="text-[13px] text-[#b0abb5] border-t border-white/[0.06] pt-1 mt-1 font-mono">
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
              className="flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.08] text-[#f1eef4] hover:text-[#f1eef4] font-sans font-medium text-xs py-2 px-3 transition-colors text-center"
            >
              <span>{isPending ? 'View Resolution Status' : 'View Market Details'}</span>
              <ArrowUpRight size={13} />
            </Link>
            {statusExplanation && (
              <p className="text-[13px] text-[#b0abb5] text-center line-clamp-1 font-sans">
                {statusExplanation}
              </p>
            )}
          </div>
        )}

        {/* Micro-copy intent line for open markets */}
        {isOpen && (
          <div className="flex items-center justify-between font-mono text-[13px] tracking-wide text-[#b0abb5] px-0.5 uppercase">
            <span>Follow: Support AI</span>
            <span>Fade: Oppose AI</span>
          </div>
        )}
      </div>
    </article>
  );
});

