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
  ShieldCheck,
  ExternalLink,
  Sparkles,
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

function getTimeframeSeconds(timeframe: string | null): number | null {
  if (!timeframe) return null;
  const durations: Record<string, number> = {
    '5m': 5 * 60,
    '15m': 15 * 60,
    '1h': 60 * 60,
    '4h': 4 * 60 * 60,
    '24h': 24 * 60 * 60,
  };
  return durations[timeframe] ?? null;
}

function formatMarketDate(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function getResolutionSource(market: SerializableMarket) {
  return market.category === 'FOOTBALL'
    ? 'API-Football result, recorded on-chain'
    : 'CoinGecko price, recorded on-chain';
}

/** Extract price target from question text, e.g. "$103,500" → 103500 */
function extractTargetFromQuestion(question: string | undefined): number | null {
  if (!question) return null;
  // Match prices like $103,500 or $103500 or $2.45
  const match = question.match(/\$([0-9,]+(?:\.[0-9]+)?)/);
  if (!match) return null;
  return parseFloat(match[1].replace(/,/g, ''));
}

/** Build a human-readable resolution explanation from what we know */
function getResolutionExplanation(market: SerializableMarket): {
  headline: string;
  detail: string;
  coinGeckoUrl: string | null;
} {
  const outcome = market.outcome; // 'FOLLOW' | 'FADE' | 'PENDING' | 'CANCELLED'
  const followWon = outcome === 'FOLLOW';
  const fadeWon = outcome === 'FADE';

  if (market.category === 'CRYPTO') {
    const symbol = market.marketId.split('-')[0].toUpperCase();
    const target = extractTargetFromQuestion(market.question);
    const timeframe = getTimeframe(market.marketId);

    const headline = followWon
      ? `✓ FOLLOW WON — AI prediction was correct`
      : fadeWon
        ? `✓ FADE WON — AI prediction was incorrect`
        : 'Market resolved';

    const detail = target
      ? followWon
        ? `At resolution, ${symbol} price was above the $${target.toLocaleString()} target${timeframe ? ` within the ${timeframe} window` : ''}.`
        : `At resolution, ${symbol} price was below the $${target.toLocaleString()} target${timeframe ? ` within the ${timeframe} window` : ''}. The AI prediction did not materialise.`
      : `Resolved via on-chain oracle. Outcome verified by contract at resolution time.`;

    const coinGeckoUrl = `https://www.coingecko.com/en/coins/${symbol.toLowerCase()}`;

    return { headline, detail, coinGeckoUrl };
  }

  if (market.category === 'FOOTBALL') {
    const headline = followWon
      ? `✓ FOLLOW WON — Home team won`
      : fadeWon
        ? `✓ FADE WON — Away team won or draw`
        : 'Match resolved';

    // Extract teams from question: "Will X beat Y on ..."
    const teamMatch = market.question?.match(/Will (.+?) beat (.+?) on/);
    const home = teamMatch?.[1] ?? 'Home team';
    const away = teamMatch?.[2] ?? 'Away team';

    const detail = followWon
      ? `${home} won the match. The Follow AI prediction was correct.`
      : `${home} did not win (draw or ${away} victory). Fade won.`;

    return { headline, detail, coinGeckoUrl: null };
  }

  return {
    headline: outcome === 'FOLLOW' ? '✓ FOLLOW WON' : '✓ FADE WON',
    detail: 'Market resolved on-chain.',
    coinGeckoUrl: null,
  };
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
      staleTime: 10_000,
      refetchInterval: 15_000,
    },

  });

  const chainMarket = data as { followPool: bigint; fadePool: bigint } | undefined;
  const liveFollowPool = chainMarket?.followPool ?? numberToUsdc(Number(market.followPool));
  const liveFadePool = chainMarket?.fadePool ?? numberToUsdc(Number(market.fadePool));
  const totalPool = liveFollowPool + liveFadePool;
  const followShare = totalPool > 0n ? Number((liveFollowPool * 1000n) / totalPool) / 10 : 0;
  const fadeShare = totalPool > 0n ? Number((liveFadePool * 1000n) / totalPool) / 10 : 0;

  const probability = market.analysis?.probability ?? market.analysis?.confidence ?? 50;
  const confidence = market.analysis?.confidence ?? 50;
  const isResolved = market.resolved;
  const isPendingResolution = !isResolved && (market.status === 'PENDING_RESOLUTION' || market.resolutionTime <= Math.floor(Date.now() / 1000));
  const isActive = !isResolved && market.status !== 'CLOSED' && !isPendingResolution;
  const hasAnalysis = !!market.analysis;
  const timeframe = getTimeframe(market.marketId);
  const timeframeSeconds = getTimeframeSeconds(timeframe);
  const openingTime = timeframeSeconds ? market.resolutionTime - timeframeSeconds : null;
  const target = extractTargetFromQuestion(market.question);

  // AI summary snippet shown always (before betting)
  const summarySnippet = market.analysis?.summary
    ? market.analysis.summary.length > 130
      ? market.analysis.summary.substring(0, 130) + '…'
      : market.analysis.summary
    : null;

  // Resolution explanation
  const resolution = isResolved ? getResolutionExplanation(market) : null;

  return (
    <article className="bg-[#1c1b1b] rounded-2xl p-6 flex flex-col gap-5 transition-all duration-300 ease-in-out hover:shadow-xl hover:shadow-[#ddb7ff]/5 relative overflow-hidden group">

      {/* ── Top: Badges + Status ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="bg-[#ddb7ff]/10 text-[#ddb7ff] px-2.5 py-1 rounded-md text-[10px] font-[family-name:var(--font-inter)] font-semibold uppercase tracking-wider">
            {market.category}
          </span>
          {timeframe && (
            <span className="bg-[#4fdbc8]/10 text-[#4fdbc8] px-2.5 py-1 rounded-md text-[10px] font-[family-name:var(--font-inter)] font-semibold uppercase tracking-wider">
              {timeframe}
            </span>
          )}
          {isActive && (
            <div className="w-1.5 h-1.5 rounded-full bg-[#4fdbc8] animate-pulse-dot" />
          )}
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-[family-name:var(--font-jetbrains-mono)] font-bold uppercase tracking-wider border ${isResolved
            ? 'bg-[#94a3b8]/10 border-[#94a3b8]/20 text-[#94a3b8]'
            : 'bg-[#4fdbc8]/10 border-[#4fdbc8]/20 text-[#4fdbc8]'
          }`}>
          {isResolved ? 'RESOLVED' : market.status === 'CLOSED' ? 'CLOSED' : isPendingResolution ? 'PENDING' : 'LIVE'}
        </span>
      </div>

      {/* ── Market question ── */}
      <h2 className="font-[family-name:var(--font-hanken)] text-2xl md:text-[1.75rem] font-bold text-white leading-[1.15] tracking-tight text-balance">
        {market.question}
      </h2>

      {/* ── Market terms ── */}
      <div className="rounded-xl border border-[#1e293b] bg-[#0f172a]/35 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-[family-name:var(--font-jetbrains-mono)] font-bold text-[#ddb7ff] uppercase tracking-widest">
            MARKET TERMS
          </p>
          <span className="text-[10px] text-[#94a3b8] font-[family-name:var(--font-inter)]">
            {market.category === 'CRYPTO' ? 'Price market' : 'Match market'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-[10px] font-[family-name:var(--font-inter)]">
          <div>
            <p className="text-[#94a3b8]">Market window (timeframe)</p>
            <p className="mt-0.5 text-white leading-relaxed">
              {openingTime ? `${formatMarketDate(openingTime)} → ` : 'Closes '}
              {formatMarketDate(market.resolutionTime)}
            </p>
          </div>
          <div>
            <p className="text-[#94a3b8]">Resolution source</p>
            <p className="mt-0.5 text-white leading-relaxed">{getResolutionSource(market)}</p>
          </div>
          <div>
            <p className="text-[#94a3b8]">Target value</p>
            <p className="mt-0.5 text-white">
              {target !== null ? `$${target.toLocaleString()}` : 'Defined by match result'}
            </p>
          </div>
          <div>
            <p className="text-[#94a3b8]">Protocol fee</p>
            <p className="mt-0.5 text-white">None</p>
          </div>
        </div>

        <div className="border-t border-[#1e293b] pt-3">
          <p className="text-[10px] text-[#94a3b8]">How settlement works</p>
          <p className="mt-1 text-[10px] text-white leading-relaxed">
            Follow supports the AI prediction; Fade takes the opposing side. After on-chain resolution, winning stakers can claim their proportional share of the losing pool.
          </p>
        </div>
      </div>

      {/* ── FEATURE 2: AI Analysis Preview (always visible before betting) ── */}
      {hasAnalysis && (
        <div className="bg-[#0f172a]/60 rounded-xl p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ddb7ff]" />
              <span className="text-[10px] font-[family-name:var(--font-jetbrains-mono)] font-bold text-[#ddb7ff] uppercase tracking-widest">
                AI MODEL SIGNAL
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] text-[#94a3b8] font-[family-name:var(--font-inter)] font-medium">Prediction</p>
                <p className="text-xs font-[family-name:var(--font-inter)] font-bold text-[#4fdbc8]">
                  {market.analysis?.prediction?.toUpperCase() || 'YES'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-[#94a3b8] font-[family-name:var(--font-inter)] font-medium">Confidence</p>
                <p className="text-xs font-[family-name:var(--font-jetbrains-mono)] font-bold text-[#ddb7ff]">
                  {confidence}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-[#94a3b8] font-[family-name:var(--font-inter)] font-medium">AI model probability</p>
                <p className="text-xs font-[family-name:var(--font-jetbrains-mono)] font-bold text-white">
                  {probability}%
                </p>
              </div>
            </div>
          </div>

          {/* Confidence bar */}
          <div className="h-1 w-full bg-[#1e293b] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#ddb7ff] to-[#4fdbc8] transition-all duration-1000 rounded-full"
              style={{ width: `${confidence}%` }}
            />
          </div>

          {/* AI Summary snippet */}
          {summarySnippet && (
            <p className="text-[11px] text-[#94a3b8] leading-relaxed font-[family-name:var(--font-jetbrains-mono)]">
              {summarySnippet}
            </p>
          )}

          <p className="text-[10px] text-[#94a3b8]/80 leading-relaxed font-[family-name:var(--font-inter)]">
            Model output is separate from the live market-implied pool share below.
          </p>

          {/* Key factors — top 2 always visible */}
          {(market.analysis?.keyFactors?.length ?? 0) > 0 && (
            <div className="space-y-1">
              {market.analysis!.keyFactors!.slice(0, 2).map((factor, i) => (
                <div key={`kf-${i}`} className="flex items-start gap-1.5 text-[10px] text-[#94a3b8]">
                  <span className="text-[#4fdbc8] shrink-0 mt-0.5">▸</span>
                  {factor}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Pool amounts and market-implied indicators ── */}
      <div className="rounded-xl border border-[#1e293b] bg-[#0f172a]/45 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-[family-name:var(--font-inter)] font-semibold text-[#94a3b8] uppercase tracking-wide">
            LIVE LIQUIDITY
          </p>
          <p className="text-xs font-[family-name:var(--font-jetbrains-mono)] font-bold text-white">
            {toPoolDisplay(totalPool)} USDC total
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-[#0f172a]/60 p-4">
          <p className="text-[10px] font-[family-name:var(--font-inter)] font-semibold text-[#94a3b8] uppercase tracking-wide">Follow Pool</p>
          <p className="mt-1 font-[family-name:var(--font-jetbrains-mono)] text-lg font-bold text-white">
            {toPoolDisplay(liveFollowPool)}{' '}
            <span className="text-xs text-[#94a3b8] font-medium">USDC</span>
          </p>
          <p className="mt-1 text-[10px] text-[#4fdbc8] font-[family-name:var(--font-jetbrains-mono)]">
            {followShare.toFixed(1)}% market-implied share
          </p>
        </div>
        <div className="rounded-xl bg-[#0f172a]/60 p-4">
          <p className="text-[10px] font-[family-name:var(--font-inter)] font-semibold text-[#94a3b8] uppercase tracking-wide">Fade Pool</p>
          <p className="mt-1 font-[family-name:var(--font-jetbrains-mono)] text-lg font-bold text-white">
            {toPoolDisplay(liveFadePool)}{' '}
            <span className="text-xs text-[#94a3b8] font-medium">USDC</span>
          </p>
          <p className="mt-1 text-[10px] text-[#ffb4ab] font-[family-name:var(--font-jetbrains-mono)]">
            {fadeShare.toFixed(1)}% market-implied share
          </p>
        </div>
        </div>

        {totalPool === 0n ? (
          <p className="text-[10px] text-[#94a3b8] font-[family-name:var(--font-inter)]">
            No liquidity yet. Market-implied shares will appear after staking begins.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="flex h-2 rounded-full overflow-hidden bg-[#1e293b]" aria-label={`Market-implied split: Follow ${followShare.toFixed(1)}%, Fade ${fadeShare.toFixed(1)}%`}>
              <div className="h-full bg-[#4fdbc8] transition-all duration-1000" style={{ width: `${followShare}%` }} />
              <div className="h-full bg-[#ffb4ab] transition-all duration-1000" style={{ width: `${fadeShare}%` }} />
            </div>
            <p className="text-[10px] text-[#94a3b8] leading-relaxed">
              Pool shares are market-implied indicators, not guaranteed probabilities or forecasts.
            </p>
          </div>
        )}
      </div>

      {/* Countdown */}
      <div className="rounded-xl border border-[#ddb7ff]/20 bg-[#ddb7ff]/5 p-4 space-y-2">
        <div className="flex items-center justify-between gap-3 text-[10px] font-[family-name:var(--font-jetbrains-mono)] uppercase tracking-widest">
          <span className="text-[#ddb7ff]">Market clock</span>
          <span className="text-[#94a3b8]">{isResolved ? 'Settlement recorded' : 'No more staking after close'}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-xs font-[family-name:var(--font-jetbrains-mono)] text-white">
          <span className="tabular-nums" aria-live="polite">
            <CountdownTimer resolutionTime={market.resolutionTime} resolved={isResolved} />
          </span>
          <span className="text-right text-[10px] text-[#94a3b8] font-[family-name:var(--font-inter)]">
            {isResolved ? 'Final result available' : `Closes at ${formatMarketDate(market.resolutionTime)}`}
          </span>
        </div>
      </div>

      {/* ── Follow / Fade buttons OR resolution panel ── */}
      {isActive ? (
        <div className="space-y-3 rounded-xl border border-white/5 bg-[#1c1b1b] p-4">
          <p className="text-[10px] text-[#ddb7ff] text-center font-[family-name:var(--font-jetbrains-mono)] uppercase tracking-widest">
            Make your call
          </p>
          <p className="text-[11px] text-[#94a3b8] text-center font-[family-name:var(--font-inter)]">
            AI predicts{' '}
            <span className="text-[#4fdbc8] font-bold">
              {market.analysis?.prediction?.toUpperCase() || 'YES'}
            </span>
            . Agree? Follow. Disagree? Fade.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onFollow}
              className="group flex items-center justify-center gap-2 py-3 bg-[#4fdbc8]/10 text-[#4fdbc8] font-bold text-xs font-[family-name:var(--font-inter)] rounded-xl transition-all hover:bg-[#4fdbc8] hover:text-[#0f172a] active:scale-[0.98]"
            >
              <CheckCircle2 size={16} className="group-hover:scale-110 transition-transform" />
              Follow AI
            </button>
            <button
              onClick={onFade}
              className="group flex items-center justify-center gap-2 py-3 bg-[#ffb4ab]/10 text-[#ffb4ab] font-bold text-xs font-[family-name:var(--font-inter)] rounded-xl transition-all hover:bg-[#ffb4ab] hover:text-[#0f172a] active:scale-[0.98]"
            >
              <XCircle size={16} className="group-hover:scale-110 transition-transform" />
              Fade AI
            </button>
          </div>
        </div>
      ) : isResolved ? (
        /* ── FEATURE 1: Resolution Transparency Panel ── */
        <div className={`rounded-xl border p-4 space-y-3 ${market.outcome === 'FOLLOW'
            ? 'bg-[#4fdbc8]/5 border-[#4fdbc8]/25'
            : 'bg-[#ffb4ab]/5 border-[#ffb4ab]/25'
          }`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className={`w-4 h-4 shrink-0 ${market.outcome === 'FOLLOW' ? 'text-[#4fdbc8]' : 'text-[#ffb4ab]'}`} />
              <p className={`text-[11px] font-[family-name:var(--font-jetbrains-mono)] font-bold uppercase tracking-wide ${market.outcome === 'FOLLOW' ? 'text-[#4fdbc8]' : 'text-[#ffb4ab]'
              }`}>
                Resolution details
              </p>
            </div>
            <span className="text-[10px] font-[family-name:var(--font-jetbrains-mono)] font-bold uppercase tracking-widest text-white">
              {market.outcome === 'CANCELLED' ? 'CANCELLED' : `${market.outcome} WON`}
            </span>
          </div>

          {/* Detail explanation */}
          <p className="text-[11px] text-[#94a3b8] leading-relaxed font-[family-name:var(--font-jetbrains-mono)]">
            {resolution?.detail}
          </p>

          <div className="grid grid-cols-2 gap-3 border-y border-white/5 py-3 text-[10px] font-[family-name:var(--font-inter)]">
            <div>
              <p className="text-[#94a3b8]">Resolution source</p>
              <p className="mt-0.5 text-white">{getResolutionSource(market)}</p>
            </div>
            <div>
              <p className="text-[#94a3b8]">Final outcome</p>
              <p className="mt-0.5 text-white">{market.outcome === 'CANCELLED' ? 'No valid result' : market.outcome}</p>
            </div>
          </div>

          <p className="text-[10px] text-[#94a3b8]/60 font-[family-name:var(--font-jetbrains-mono)]">
            Resolution deadline: {new Date(market.resolutionTime * 1000).toUTCString()}
          </p>

          <p className="text-[10px] text-[#94a3b8] leading-relaxed font-[family-name:var(--font-inter)]">
            {market.outcome === 'CANCELLED'
              ? 'This market did not produce a valid result.'
              : 'Claim instructions: connect the wallet that staked on the winning side, then claim winnings from your portfolio.'}
          </p>

          {/* Verify link for crypto */}
          {resolution?.coinGeckoUrl && (
            <a
              href={resolution.coinGeckoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-[#ddb7ff] hover:text-[#ddb7ff]/80 transition-colors font-[family-name:var(--font-jetbrains-mono)] underline underline-offset-2"
            >
              <ExternalLink className="w-3 h-3" />
              Verify on CoinGecko
            </a>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-[#ddb7ff]/25 bg-[#ddb7ff]/5 p-4 space-y-2.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 text-[#ddb7ff]" />
            <p className="text-[11px] font-[family-name:var(--font-jetbrains-mono)] font-bold uppercase tracking-wide text-[#ddb7ff]">
              Pending Resolution
            </p>
          </div>
          <p className="text-[11px] text-[#94a3b8] leading-relaxed font-[family-name:var(--font-jetbrains-mono)]">
            This market has reached its deadline and is waiting for oracle resolution. Follow and Fade are disabled while the final outcome is being recorded.
          </p>
          <p className="text-[10px] text-[#94a3b8]/60 font-[family-name:var(--font-jetbrains-mono)]">
            Deadline: {new Date(market.resolutionTime * 1000).toUTCString()}
          </p>
        </div>
      )}

      {/* ── EXPANDABLE: Full AI Analysis ── */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${expanded ? 'max-h-[9999px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        aria-hidden={!expanded}
      >
        <div className="border-t border-[#1e293b] pt-5 space-y-5">
          {!hasAnalysis ? (
            <p className="text-sm text-[#94a3b8] italic">AI analysis loading...</p>
          ) : (
            <>
              {/* Full Summary */}
              {market.analysis?.summary && (
                <div className="bg-[#1c1b1b] border border-[#1e293b] p-5 rounded-lg relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                    <Brain className="w-14 h-14" />
                  </div>
                  <h3 className="text-[10px] font-[family-name:var(--font-jetbrains-mono)] text-[#ddb7ff] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <FileText size={13} /> FULL AI SUMMARY
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

              {/* All Key / Risk factors */}
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
                  <span className="text-[10px] font-[family-name:var(--font-jetbrains-mono)] font-bold text-white">{confidence}%</span>
                </div>
                <div className="h-1.5 w-full bg-[#1e293b] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#ddb7ff] to-[#4fdbc8] transition-all duration-1000"
                    style={{ width: `${confidence}%` }}
                  />
                </div>
              </div>

              {/* Live pool split */}
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
        className="flex items-center gap-1.5 mx-auto text-xs text-[#94a3b8] hover:text-white transition-colors font-[family-name:var(--font-inter)] font-medium pt-2"
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
