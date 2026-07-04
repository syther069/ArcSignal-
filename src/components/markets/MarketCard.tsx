'use client';

import { useState } from 'react';
import { formatUnits } from 'viem';
import { useReadContract } from 'wagmi';
import { ARCSIGNAL_ABI, ARCSIGNAL_ADDRESS } from '@/lib/contracts';
import type { Market } from '@/types';
import { CountdownTimer } from './CountdownTimer';

export interface MarketCardProps {
  market: Market;
  onFollow: () => void;
  onFade: () => void;
}

function toPoolDisplay(value: bigint) {
  return Number(formatUnits(value, 6)).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

function numberToUsdc(value: number) {
  return BigInt(Math.round(value * 1_000_000));
}

export function MarketCard({ market, onFollow, onFade }: MarketCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { data } = useReadContract({
    address: ARCSIGNAL_ADDRESS,
    abi: ARCSIGNAL_ABI,
    functionName: 'getMarket',
    args: [market.marketId],
    query: {
      enabled:
        /^0x[a-fA-F0-9]{40}$/.test(ARCSIGNAL_ADDRESS) &&
        market.marketId.length > 0,
    },
  });

  const chainMarket = data as { followPool: bigint; fadePool: bigint } | undefined;
  const liveFollowPool = chainMarket?.followPool ?? numberToUsdc(market.followPool);
  const liveFadePool   = chainMarket?.fadePool   ?? numberToUsdc(market.fadePool);
  const totalPool      = liveFollowPool + liveFadePool;
  const followShare    =
    totalPool > 0n
      ? Number((liveFollowPool * 10_000n) / totalPool) / 100
      : 0;

  const probability = market.probability ?? market.confidence;
  const isResolved  = market.resolved;

  return (
    <article className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-5 transition-all duration-150 hover:border-[#ddb7ff]/40 hover:shadow-lg hover:shadow-[#ddb7ff]/5 flex flex-col">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-[#ddb7ff]/10 text-[#ddb7ff] border border-[#ddb7ff]/20 px-2 py-0.5 rounded text-[10px] font-[family-name:var(--font-jetbrains-mono)] font-bold uppercase tracking-wider">
              {market.category} / {market.subType ?? 'market'}
            </span>
            {!isResolved && (
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#4fdbc8] animate-pulse-dot" />
              </div>
            )}
          </div>
          <h3 className="font-[family-name:var(--font-hanken)] text-base font-semibold text-white leading-snug">
            {market.title}
          </h3>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-[family-name:var(--font-jetbrains-mono)] font-bold uppercase tracking-wider border ${
            isResolved
              ? 'bg-[#94a3b8]/10 border-[#94a3b8]/20 text-[#94a3b8]'
              : 'bg-[#4fdbc8]/10 border-[#4fdbc8]/20 text-[#4fdbc8]'
          }`}
        >
          {market.outcome ?? (isResolved ? 'RESOLVED' : 'PENDING')}
        </span>
      </div>

      {/* Body */}
      <div className="space-y-4 flex-1">
        {/* AI Probability */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-[family-name:var(--font-jetbrains-mono)] font-semibold text-[#94a3b8] uppercase tracking-wider">
              AI Probability
            </span>
            <span className="text-[10px] font-[family-name:var(--font-jetbrains-mono)] font-bold text-[#ddb7ff]">
              {probability}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-[#1e293b]">
            <div
              className="h-full rounded-full bg-[#ddb7ff] transition-all duration-500"
              style={{ width: `${probability}%` }}
            />
          </div>
        </div>

        {/* Pool boxes */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-[#1e293b] bg-[#1c1b1b] p-3">
            <p className="text-[10px] font-[family-name:var(--font-jetbrains-mono)] text-[#94a3b8] uppercase tracking-wider">
              Follow Pool
            </p>
            <p className="mt-1 font-[family-name:var(--font-jetbrains-mono)] text-base font-semibold text-white">
              {toPoolDisplay(liveFollowPool)}{' '}
              <span className="text-xs text-[#94a3b8]">USDC</span>
            </p>
          </div>
          <div className="rounded-lg border border-[#1e293b] bg-[#1c1b1b] p-3">
            <p className="text-[10px] font-[family-name:var(--font-jetbrains-mono)] text-[#94a3b8] uppercase tracking-wider">
              Fade Pool
            </p>
            <p className="mt-1 font-[family-name:var(--font-jetbrains-mono)] text-base font-semibold text-white">
              {toPoolDisplay(liveFadePool)}{' '}
              <span className="text-xs text-[#94a3b8]">USDC</span>
            </p>
          </div>
        </div>

        {/* Follow / Fade split bar */}
        <div className="h-1 overflow-hidden rounded-full bg-[#ffb4ab]/30">
          <div
            className="h-full bg-[#4fdbc8] transition-all duration-500"
            style={{ width: `${followShare}%` }}
          />
        </div>

        {/* Countdown + confidence */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-[family-name:var(--font-jetbrains-mono)] text-[#94a3b8]">
            <CountdownTimer resolutionTime={market.resolutionTime} />
          </span>
          <span className="text-[10px] font-[family-name:var(--font-jetbrains-mono)] text-[#94a3b8]">
            Confidence {market.confidence}%
          </span>
        </div>
      </div>

      {/* Analysis expand */}
      {expanded && (
        <div className="mt-5 space-y-4 border-t border-[#1e293b] pt-5 text-sm text-[#94a3b8]">
          <p>{market.summary ?? market.description}</p>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-[10px] font-[family-name:var(--font-jetbrains-mono)] text-[#4fdbc8] uppercase tracking-wider">
                Bull Case
              </p>
              <p className="mt-1 text-xs">{market.bull_case ?? market.description}</p>
            </div>
            <div>
              <p className="text-[10px] font-[family-name:var(--font-jetbrains-mono)] text-[#ffb4ab] uppercase tracking-wider">
                Bear Case
              </p>
              <p className="mt-1 text-xs">{market.bear_case ?? market.description}</p>
            </div>
          </div>
          <ul className="space-y-1.5 text-xs text-[#94a3b8]">
            {market.keyFactors?.map((factor) => (
              <li key={factor} className="flex items-start gap-1.5">
                <span className="text-[#ddb7ff] mt-0.5">›</span>
                {factor}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="rounded-lg border border-[#ddb7ff]/30 px-3 py-2 text-xs font-[family-name:var(--font-jetbrains-mono)] font-semibold text-[#ddb7ff] uppercase tracking-wider transition-colors hover:bg-[#ddb7ff]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ddb7ff]/50"
        >
          Analysis
        </button>
        <button
          onClick={onFollow}
          disabled={isResolved}
          className="rounded-lg border border-[#4fdbc8]/40 bg-[#4fdbc8]/20 px-3 py-2 text-xs font-[family-name:var(--font-jetbrains-mono)] font-semibold text-[#4fdbc8] uppercase tracking-wider transition-colors hover:bg-[#4fdbc8]/40 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4fdbc8]/50"
        >
          Follow AI
        </button>
        <button
          onClick={onFade}
          disabled={isResolved}
          className="rounded-lg border border-[#1e293b] bg-[#1c1b1b] px-3 py-2 text-xs font-[family-name:var(--font-jetbrains-mono)] font-semibold text-[#94a3b8] uppercase tracking-wider transition-colors hover:bg-[#ffb4ab]/20 hover:text-[#ffb4ab] hover:border-[#ffb4ab]/40 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffb4ab]/50"
        >
          Fade AI
        </button>
      </div>
    </article>
  );
}
