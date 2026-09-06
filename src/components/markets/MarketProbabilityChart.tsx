'use client';

import React from 'react';
import { ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';
import { formatMarketDetailUSDC, formatPercentage } from '@/app/market/[id]/marketDetailFormatters';

interface MarketProbabilityChartProps {
  followPercent: number;
  fadePercent: number;
  aiConfidence: number;
  aiPrediction: string;
  openedAt?: number;
  resolutionTime: number;
  marketId: string;
  followAmount?: bigint | number | string;
  fadeAmount?: bigint | number | string;
  totalLiquidity?: bigint | number | string;
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
}

export function MarketProbabilityChart({
  followPercent,
  fadePercent,
  aiConfidence,
  aiPrediction,
  resolutionTime,
  marketId,
  followAmount,
  fadeAmount,
  totalLiquidity,
}: MarketProbabilityChartProps) {
  const follow = clampPercent(followPercent);
  const fade = clampPercent(fadePercent);
  const confidence = clampPercent(aiConfidence);

  const formattedFollowAmount = followAmount !== undefined
    ? formatMarketDetailUSDC(followAmount)
    : null;
  const formattedFadeAmount = fadeAmount !== undefined
    ? formatMarketDetailUSDC(fadeAmount)
    : null;
  const formattedTotalLiquidity = totalLiquidity !== undefined
    ? formatMarketDetailUSDC(totalLiquidity)
    : null;

  return (
    <section className="space-y-5 rounded-2xl border border-[#403947] bg-[#1C1B1B] p-5 lg:p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-[#403947]/70 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-[#DDB7FF]" />
            <h3 className="font-display text-[20px] leading-[28px] font-semibold tracking-tight text-[#F1EEF4]">
              Current On-Chain Pool Snapshot
            </h3>
          </div>
          <p className="mt-1 font-sans text-[13px] leading-[18px] text-[#B0ABB5]">
            Live Follow and Fade shares calculated directly from the Arc contract liquidity pools
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {formattedTotalLiquidity && (
            <div className="rounded-lg border border-[#403947] bg-[#252229] px-3 py-1 text-right">
              <span className="block text-[11px] uppercase tracking-wider text-[#B0ABB5] font-mono">Total Liquidity</span>
              <span className="font-mono text-xs font-bold text-[#F1EEF4] tabular-nums">{formattedTotalLiquidity}</span>
            </div>
          )}
          <span className="rounded-full border border-[#4FDBC8]/30 bg-[#4FDBC8]/10 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-[#4FDBC8]">
            ARC Verified
          </span>
        </div>
      </div>

      {/* Pool Split Bar & Values */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#4FDBC8]">
              FOLLOW {formatPercentage(follow, 1)}
            </span>
            {formattedFollowAmount && (
              <span className="text-[#B0ABB5] tabular-nums font-mono">
                ({formattedFollowAmount})
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {formattedFadeAmount && (
              <span className="text-[#B0ABB5] tabular-nums font-mono">
                ({formattedFadeAmount})
              </span>
            )}
            <span className="font-bold text-[#F3A6C8]">
              FADE {formatPercentage(fade, 1)}
            </span>
          </div>
        </div>

        <div
          className="flex h-3.5 w-full overflow-hidden rounded-full bg-[#131313] p-0.5 border border-[#403947]/60"
          aria-label={`Current on-chain pool split: Follow ${follow.toFixed(1)}%, Fade ${fade.toFixed(1)}%`}
        >
          <div
            className="h-full rounded-l-full bg-[#4FDBC8] transition-all duration-250 ease-out"
            style={{ width: `${follow}%` }}
          />
          <div
            className="h-full rounded-r-full bg-[#F3A6C8] transition-all duration-250 ease-out"
            style={{ width: `${fade}%` }}
          />
        </div>

        {/* Required Pool Split Disclaimer */}
        <p className="font-sans text-[12px] leading-[16px] text-[#B0ABB5]/80 flex items-center gap-1.5 pt-0.5">
          <AlertCircle size={12} className="shrink-0 text-[#B0ABB5]" />
          <span>Pool split reflects current liquidity and is not guaranteed probability.</span>
        </p>
      </div>

      {/* Model Signal vs On-Chain Pool Distinction */}
      <div className="grid gap-3 sm:grid-cols-2 pt-1">
        {/* AI Model Signal Card */}
        <div className="rounded-xl border border-[#403947]/80 bg-[#252229] p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-sans text-xs font-semibold text-[#B0ABB5]">
              <Sparkles size={14} className="text-[#DDB7FF]" />
              <span>AI Model Signal</span>
            </div>
            <span className="rounded bg-[#DDB7FF]/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-[#DDB7FF]">
              Off-Chain Hypothesis
            </span>
          </div>
          <p className="font-mono text-xl font-bold text-[#F1EEF4] tracking-tight flex items-baseline gap-2">
            <span className="text-[#DDB7FF]">{aiPrediction || 'Unavailable'}</span>
            <span className="text-xs text-[#B0ABB5] font-normal">Prediction</span>
          </p>
          <div className="flex items-center justify-between pt-1 border-t border-[#403947]/50 font-mono text-xs">
            <span className="text-[#B0ABB5]">Model Confidence:</span>
            <span className="font-bold text-[#F1EEF4] tabular-nums">{confidence.toFixed(0)}%</span>
          </div>
          <p className="font-sans text-[11px] leading-[15px] text-[#B0ABB5]/70 pt-0.5">
            Model output represents algorithmic conviction, completely distinct from on-chain pool shares.
          </p>
        </div>

        {/* Resolution Deadline & Market ID Card */}
        <div className="rounded-xl border border-[#403947]/80 bg-[#252229] p-4 space-y-1.5 font-mono">
          <div className="flex items-center justify-between">
            <span className="font-sans text-xs font-semibold text-[#B0ABB5]">Resolution Cutoff</span>
            <span className="rounded bg-white/[0.06] px-2 py-0.5 text-[10px] uppercase text-[#B0ABB5]">
              Oracle Lock
            </span>
          </div>
          <p className="text-sm font-bold text-[#F1EEF4] tabular-nums pt-1">
            {new Date(resolutionTime * 1000).toUTCString()}
          </p>
          <div className="pt-2 border-t border-[#403947]/50">
            <span className="text-[10px] uppercase tracking-wider text-[#B0ABB5] block mb-0.5">Market ID</span>
            <p className="break-all text-[11px] text-[#DDB7FF] font-mono select-all">{marketId}</p>
          </div>
        </div>
      </div>
    </section>
  );
}