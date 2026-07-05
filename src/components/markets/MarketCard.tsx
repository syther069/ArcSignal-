'use client';

import React, { useState } from 'react';
import { formatUnits } from 'viem';
import { useReadContract } from 'wagmi';
import { ARCSIGNAL_ABI, ARCSIGNAL_ADDRESS } from '@/lib/contracts';
import type { SerializableMarket } from '@/lib/markets';
import { CountdownTimer } from './CountdownTimer';
import {
  Brain,
  FileText,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export interface MarketCardProps {
  market: SerializableMarket;
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

function getTimeframe(marketId: string): string | null {
  const match = marketId.match(/-PRICE-(5m|15m|1h|4h|24h)-/);
  return match ? match[1] : null;
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
  const liveFollowPool = chainMarket?.followPool ?? numberToUsdc(Number(market.followPool));
  const liveFadePool   = chainMarket?.fadePool   ?? numberToUsdc(Number(market.fadePool));
  const totalPool      = liveFollowPool + liveFadePool;
  const followShare    = totalPool > 0n ? Number((liveFollowPool * 100n) / totalPool) : 0;
  const fadeShare      = totalPool > 0n ? Number((liveFadePool * 100n) / totalPool) : 0;

  const probability = market.analysis?.probability ?? market.analysis?.confidence ?? 50;
  const isResolved  = market.resolved;
  const hasAnalysis = !!market.analysis;

  const timeframe = getTimeframe(market.marketId);

  return (
    <article className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-5 flex flex-col gap-5 transition-all duration-300 ease-in-out hover:border-[#ddb7ff]/40 hover:shadow-lg hover:shadow-[#ddb7ff]/5">

      {/* ── ALWAYS VISIBLE: Top section ── */}
      <div className="space-y-4">
        {/* Badges row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-[#ddb7ff]/10 text-[#ddb7ff] border border-[#ddb7ff]/20 px-2 py-0.5 rounded text-[10px] font-[family-name:var(--font-jetbrains-mono)] font-bold uppercase tracking-wider">
              {market.category}
            </span>
            {timeframe && (
              <span className="bg-[#94a3b8]/10 text-[#94a3b8] border border-[#94a3b8]/20 px-2 py-0.5 rounded text-[10px] font-[family-name:var(--font-jetbrains-mono)] font-bold uppercase tracking-wider">
                {timeframe}
              </span>
            )}
            {!isResolved && (
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#4fdbc8] animate-pulse-dot" />
              </div>
            )}
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

        {/* Market question */}
        <h2 className="font-[family-name:var(--font-hanken)] text-lg md:text-xl font-semibold text-white leading-snug">
          {market.question}
        </h2>

        {/* AI stats row */}
        <div className="flex flex-wrap items-center gap-5 md:gap-8 pt-1">
          <div className="space-y-0.5">
            <p className="text-[9px] font-[family-name:var(--font-jetbrains-mono)] text-[#94a3b8] uppercase tracking-wider">AI PREDICTION</p>
            <p className="font-[family-name:var(--font-jetbrains-mono)] text-sm text-[#4fdbc8] font-bold">
              {market.analysis?.prediction?.toUpperCase() || 'YES'}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[9px] font-[family-name:var(--font-jetbrains-mono)] text-[#94a3b8] uppercase tracking-wider">PROBABILITY</p>
            <p className="font-[family-name:var(--font-jetbrains-mono)] text-sm text-white font-bold">{probability}%</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[9px] font-[family-name:var(--font-jetbrains-mono)] text-[#94a3b8] uppercase tracking-wider">AI CONFIDENCE</p>
            <p className="font-[family-name:var(--font-jetbrains-mono)] text-sm text-[#ddb7ff] font-bold">{market.analysis?.confidence ?? 50}%</p>
          </div>
        </div>
      </div>

      {/* ── ALWAYS VISIBLE: Pool amounts + timer ── */}
      <div className="grid grid-cols-2 gap-3 border-t border-[#1e293b] pt-4">
        <div className="rounded-lg border border-[#1e293b] bg-[#1c1b1b] p-3">
          <p className="text-[9px] font-[family-name:var(--font-jetbrains-mono)] text-[#94a3b8] uppercase tracking-wider">Follow Pool</p>
          <p className="mt-1 font-[family-name:var(--font-jetbrains-mono)] text-sm font-semibold text-white">
            {toPoolDisplay(liveFollowPool)}{' '}
            <span className="text-xs text-[#94a3b8]">USDC</span>
          </p>
        </div>
        <div className="rounded-lg border border-[#1e293b] bg-[#1c1b1b] p-3">
          <p className="text-[9px] font-[family-name:var(--font-jetbrains-mono)] text-[#94a3b8] uppercase tracking-wider">Fade Pool</p>
          <p className="mt-1 font-[family-name:var(--font-jetbrains-mono)] text-sm font-semibold text-white">
            {toPoolDisplay(liveFadePool)}{' '}
            <span className="text-xs text-[#94a3b8]">USDC</span>
          </p>
        </div>
      </div>

      {/* Countdown */}
      <div className="flex items-center justify-between text-[10px] font-[family-name:var(--font-jetbrains-mono)] text-[#94a3b8]">
        <CountdownTimer resolutionTime={market.resolutionTime} />
        <span>Confidence {market.analysis?.confidence ?? 50}%</span>
      </div>

      {/* ── ALWAYS VISIBLE: Follow / Fade buttons ── */}
      <div className="space-y-2">
        {!isResolved ? (
          <>
            <p className="text-[10px] text-[#94a3b8] text-center font-[family-name:var(--font-jetbrains-mono)]">
              AI predicts{' '}
              <span className="text-[#4fdbc8] font-bold">
                {market.analysis?.prediction?.toUpperCase() || 'YES'}
              </span>
              . Agree? FOLLOW. Disagree? FADE.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onFollow}
                className="group flex items-center justify-center gap-2 py-2.5 bg-transparent border border-[#4fdbc8] text-[#4fdbc8] font-bold text-[10px] font-[family-name:var(--font-jetbrains-mono)] tracking-wider uppercase rounded-lg transition-all hover:bg-[#4fdbc8] hover:text-[#0f172a] active:scale-[0.98]"
              >
                <CheckCircle2 size={14} className="group-hover:scale-110 transition-transform" />
                FOLLOW AI
              </button>
              <button
                onClick={onFade}
                className="group flex items-center justify-center gap-2 py-2.5 bg-transparent border border-[#ffb4ab] text-[#ffb4ab] font-bold text-[10px] font-[family-name:var(--font-jetbrains-mono)] tracking-wider uppercase rounded-lg transition-all hover:bg-[#ffb4ab] hover:text-[#0f172a] active:scale-[0.98]"
              >
                <XCircle size={14} className="group-hover:scale-110 transition-transform" />
                FADE AI
              </button>
            </div>
          </>
        ) : (
          <div className="bg-[#1e293b]/50 border border-[#1e293b] py-2.5 rounded-lg text-center">
            <p className="text-[10px] text-[#94a3b8] font-[family-name:var(--font-jetbrains-mono)] uppercase tracking-wider font-semibold">
              MARKET RESOLVED: {market.outcome}
            </p>
          </div>
        )}
      </div>

      {/* ── EXPANDABLE: Full AI Analysis ── */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          expanded ? 'max-h-[9999px] opacity-100' : 'max-h-0 opacity-0'
        }`}
        aria-hidden={!expanded}
      >
        <div className="border-t border-[#1e293b] pt-5 space-y-5">
          {!hasAnalysis ? (
            <p className="text-sm text-[#94a3b8] italic">AI analysis loading...</p>
          ) : (
            <>
              {/* Summary */}
              {market.analysis?.summary && (
                <div className="bg-[#1c1b1b] border border-[#1e293b] p-5 rounded-lg relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                    <Brain className="w-14 h-14" />
                  </div>
                  <h3 className="text-[10px] font-[family-name:var(--font-jetbrains-mono)] text-[#ddb7ff] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <FileText size={13} /> SUMMARIZE
                  </h3>
                  <p className="text-xs text-[#94a3b8] leading-relaxed relative z-10">
                    {market.analysis.summary}
                  </p>
                </div>
              )}

              {/* Bull / Bear cases */}
              <div className="grid gap-3 md:grid-cols-2">
                <div className="bg-[#1c1b1b] p-4 rounded-lg border border-[#1e293b]/50">
                  <h3 className="text-[10px] font-[family-name:var(--font-jetbrains-mono)] text-[#4fdbc8] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <TrendingUp size={13} /> BULL CASE
                  </h3>
                  <p className="text-xs text-[#94a3b8] leading-relaxed">
                    {market.analysis?.bullCase || 'No bull case provided.'}
                  </p>
                </div>
                <div className="bg-[#1c1b1b] p-4 rounded-lg border border-[#1e293b]/50">
                  <h3 className="text-[10px] font-[family-name:var(--font-jetbrains-mono)] text-[#ffb4ab] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <TrendingDown size={13} /> BEAR CASE
                  </h3>
                  <p className="text-xs text-[#94a3b8] leading-relaxed">
                    {market.analysis?.bearCase || 'No bear case provided.'}
                  </p>
                </div>
              </div>

              {/* Key / Risk factors */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-[10px] font-[family-name:var(--font-jetbrains-mono)] text-[#ddb7ff] uppercase tracking-wider mb-2">KEY FACTORS</p>
                  <ul className="space-y-1.5 text-xs">
                    {market.analysis?.keyFactors?.map((factor, i) => (
                      <li key={`factor-${i}`} className="flex items-start gap-2 text-[#94a3b8]">
                        <span className="text-[#4fdbc8] mt-0.5 shrink-0">●</span>
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[10px] font-[family-name:var(--font-jetbrains-mono)] text-[#ddb7ff] uppercase tracking-wider mb-2">RISK FACTORS</p>
                  <ul className="space-y-1.5 text-xs">
                    {market.analysis?.riskFactors?.map((risk, i) => (
                      <li key={`risk-${i}`} className="flex items-start gap-2 text-[#94a3b8]">
                        <span className="text-[#ffb4ab] mt-0.5 shrink-0">●</span>
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Model confidence bar */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <p className="text-[10px] font-[family-name:var(--font-jetbrains-mono)] text-[#94a3b8] uppercase tracking-wider">MODEL CONFIDENCE</p>
                  <span className="text-[10px] font-[family-name:var(--font-jetbrains-mono)] font-bold text-white">{market.analysis?.confidence ?? 50}%</span>
                </div>
                <div className="h-1.5 w-full bg-[#1e293b] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#ddb7ff] transition-all duration-1000"
                    style={{ width: `${market.analysis?.confidence ?? 50}%` }}
                  />
                </div>
              </div>

              {/* Live pool visual bar */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-[family-name:var(--font-jetbrains-mono)] text-[#94a3b8] uppercase tracking-wider">LIVE POOL SPLIT</p>
                  <div className="flex gap-4 font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-semibold">
                    <span className="text-[#4fdbc8]">FOLLOW {followShare.toFixed(0)}%</span>
                    <span className="text-[#ffb4ab]">FADE {fadeShare.toFixed(0)}%</span>
                  </div>
                </div>
                {totalPool === 0n ? (
                  <div className="flex h-2 rounded-full overflow-hidden bg-[#1e293b] items-center justify-center">
                    <span className="text-[8px] font-[family-name:var(--font-jetbrains-mono)] text-[#94a3b8]">NO LIQUIDITY</span>
                  </div>
                ) : (
                  <div className="flex h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-[#4fdbc8] transition-all duration-1000" style={{ width: `${followShare}%` }} />
                    <div className="h-full bg-[#ffb4ab] transition-all duration-1000" style={{ width: `${fadeShare}%` }} />
                  </div>
                )}
              </div>

              {/* Sources */}
              {(market.analysis?.sources?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-2">
                  {market.analysis?.sources?.map((source, i) => (
                    <span
                      key={`source-${i}`}
                      className="text-[9px] bg-[#1c1b1b] text-[#94a3b8] px-2 py-1 rounded border border-[#1e293b] font-[family-name:var(--font-jetbrains-mono)] uppercase"
                    >
                      {source.length > 22 ? source.substring(0, 22) + '...' : source}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Toggle button ── */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 mx-auto text-xs text-[#94a3b8] hover:text-[#ddb7ff] transition-colors font-[family-name:var(--font-jetbrains-mono)] pt-1"
        aria-expanded={expanded}
        aria-label={expanded ? 'Collapse analysis' : 'Expand analysis'}
      >
        {expanded ? (
          <>Collapse <ChevronUp size={14} /></>
        ) : (
          <>View Full Analysis <ChevronDown size={14} /></>
        )}
      </button>

    </article>
  );
}
