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
  Bookmark,
  Share2,
  Check,
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

/** Extract price target from question text, e.g. "$103,500" → 103500 */
function extractTargetFromQuestion(question: string | undefined): number | null {
  if (!question) return null;
  const match = question.match(/\$([0-9,]+(?:\.[0-9]+)?)/);
  if (!match) return null;
  return parseFloat(match[1].replace(/,/g, ''));
}

/** Build human-readable resolution explanation */
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
      ? `✓ FOLLOW WON — AI prediction correct`
      : fadeWon
        ? `✕ FADE WON — AI prediction incorrect`
        : 'Market resolved';

    const detail = target
      ? followWon
        ? `Oracle settlement price exceeded $${target.toLocaleString()} target${timeframe ? ` within ${timeframe}` : ''}.`
        : `Oracle settlement price missed $${target.toLocaleString()} target${timeframe ? ` within ${timeframe}` : ''}.`
      : `Verified on-chain via oracle feeds.`;

    const coinGeckoUrl = `https://www.coingecko.com/en/coins/${symbol.toLowerCase()}`;

    return { headline, detail, coinGeckoUrl };
  }

  if (market.category === 'FOOTBALL') {
    const headline = followWon
      ? `✓ FOLLOW WON — Home team victory`
      : fadeWon
        ? `✕ FADE WON — Away win or draw`
        : 'Match resolved';

    const teamMatch = market.question?.match(/Will (.+?) beat (.+?) on/);
    const home = teamMatch?.[1] ?? 'Home team';

    const detail = followWon
      ? `${home} won the match as predicted.`
      : `${home} did not win the match.`;

    return { headline, detail, coinGeckoUrl: null };
  }

  return {
    headline: outcome === 'FOLLOW' ? '✓ FOLLOW WON' : '✕ FADE WON',
    detail: 'Market resolved on-chain.',
    coinGeckoUrl: null,
  };
}

export function MarketCard({ market, onFollow, onFade }: MarketCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [copied, setCopied] = useState(false);

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
  const followShare = totalPool > 0n ? Number((liveFollowPool * 100n) / totalPool) : 50;
  const fadeShare = totalPool > 0n ? Number((liveFadePool * 100n) / totalPool) : 50;

  // Calculate estimated multiplier (x odds)
  const followMultiplier = followShare > 0 ? (100 / followShare).toFixed(2) : '2.00';
  const fadeMultiplier = fadeShare > 0 ? (100 / fadeShare).toFixed(2) : '2.00';

  const probability = market.analysis?.probability ?? market.analysis?.confidence ?? 50;
  const confidence = market.analysis?.confidence ?? 50;
  const isResolved = market.resolved;
  const isPendingResolution = !market.resolved && market.resolutionTime <= Math.floor(Date.now() / 1000);
  const isActive = !isResolved && !isPendingResolution;
  const hasAnalysis = !!market.analysis;
  const timeframe = getTimeframe(market.marketId);

  const resolution = isResolved ? getResolutionExplanation(market) : null;

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarked(!bookmarked);
  };

  return (
    <article
      className={`rounded-xl p-5 flex flex-col justify-between gap-4 transition-all duration-200 border ${
        isResolved
          ? market.outcome === 'FOLLOW'
            ? 'bg-[#10141f] border-emerald-500/30'
            : 'bg-[#141014] border-rose-500/30'
          : 'bg-[#131722] border-[#22283a] hover:border-slate-700 hover:shadow-lg hover:-translate-y-0.5'
      }`}
    >
      {/* ── Header: Badges & Status ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="bg-slate-800/80 text-slate-300 px-2 py-0.5 rounded text-[11px] font-mono font-medium uppercase tracking-wider">
            {market.category}
          </span>
          {timeframe && (
            <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded text-[11px] font-mono font-medium uppercase tracking-wider">
              {timeframe}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleBookmark}
            title="Bookmark market"
            className={`p-1.5 rounded-md hover:bg-slate-800 transition-colors ${
              bookmarked ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bookmark size={14} className={bookmarked ? 'fill-amber-400' : ''} />
          </button>
          <button
            onClick={handleShare}
            title="Share market"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
          </button>

          <span
            className={`shrink-0 flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider border ${
              isResolved
                ? 'bg-slate-800/60 border-slate-700 text-slate-300'
                : isPendingResolution
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}
          >
            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />}
            {isResolved ? 'RESOLVED' : isPendingResolution ? 'PENDING' : 'LIVE'}
          </span>
        </div>
      </div>

      {/* ── Dominant Question Title ── */}
      <h2 className="text-base md:text-lg font-bold text-slate-100 leading-snug tracking-tight">
        {market.question}
      </h2>

      {/* ── AI Signal Banner (Compact) ── */}
      {hasAnalysis && (
        <div className="bg-[#0b0e17] border border-[#1b2030] rounded-lg p-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="text-slate-300 font-medium">AI Signal</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                market.analysis?.prediction?.toLowerCase() === 'yes'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              }`}
            >
              {market.analysis?.prediction?.toUpperCase() || 'YES'}
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="text-slate-400">Conf: <strong className="text-slate-200">{confidence}%</strong></span>
            <span className="text-slate-400">Prob: <strong className="text-white">{probability}%</strong></span>
          </div>
        </div>
      )}

      {/* ── Action Buttons OR Settlement Panel ── */}
      {isActive ? (
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={onFollow}
              className="flex flex-col items-center justify-center py-2.5 px-3 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 font-semibold rounded-lg transition-all active:scale-[0.98] group"
            >
              <div className="flex items-center gap-1.5 text-xs font-sans">
                <CheckCircle2 size={14} />
                <span>Follow AI (YES)</span>
              </div>
              <span className="text-[11px] font-mono font-normal opacity-80 group-hover:opacity-100">
                {followMultiplier}x Return ({followShare}%)
              </span>
            </button>

            <button
              onClick={onFade}
              className="flex flex-col items-center justify-center py-2.5 px-3 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500 hover:text-slate-950 text-rose-400 font-semibold rounded-lg transition-all active:scale-[0.98] group"
            >
              <div className="flex items-center gap-1.5 text-xs font-sans">
                <XCircle size={14} />
                <span>Fade AI (NO)</span>
              </div>
              <span className="text-[11px] font-mono font-normal opacity-80 group-hover:opacity-100">
                {fadeMultiplier}x Return ({fadeShare}%)
              </span>
            </button>
          </div>
        </div>
      ) : isResolved ? (
        <div
          className={`rounded-lg border p-3.5 space-y-2 ${
            market.outcome === 'FOLLOW'
              ? 'bg-emerald-500/5 border-emerald-500/30'
              : 'bg-rose-500/5 border-rose-500/30'
          }`}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck
              className={`w-4 h-4 shrink-0 ${
                market.outcome === 'FOLLOW' ? 'text-emerald-400' : 'text-rose-400'
              }`}
            />
            <p
              className={`text-xs font-mono font-bold uppercase tracking-wide ${
                market.outcome === 'FOLLOW' ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {resolution?.headline}
            </p>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            {resolution?.detail}
          </p>

          {resolution?.coinGeckoUrl && (
            <a
              href={resolution.coinGeckoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-mono transition-colors"
            >
              <ExternalLink size={12} /> Verify Oracle Feed
            </a>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-1.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <p className="text-xs font-mono font-bold text-amber-400 uppercase">
              Pending Resolution
            </p>
          </div>
          <p className="text-xs text-slate-300">
            Awaiting oracle resolution. Staking is currently locked.
          </p>
        </div>
      )}

      {/* ── Footer Stats & Expiry ── */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
        <CountdownTimer resolutionTime={market.resolutionTime} resolved={isResolved} />
        <span>Pool: {toPoolDisplay(totalPool)} USDC</span>
      </div>

      {/* ── Toggleable Details ── */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors pt-1 font-medium"
      >
        <span>{expanded ? 'Hide Analysis' : 'View Analysis'}</span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {/* Expanded view */}
      {expanded && hasAnalysis && (
        <div className="pt-3 border-t border-slate-800 space-y-3 text-xs text-slate-300 animate-fadeIn">
          {market.analysis?.summary && (
            <p className="leading-relaxed bg-[#0b0e17] p-3 rounded border border-slate-800">
              {market.analysis.summary}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#0b0e17] p-2.5 rounded border border-emerald-500/20">
              <span className="text-[10px] font-mono uppercase text-emerald-400 block mb-1">Bull Case</span>
              <p className="text-slate-300">{market.analysis?.bullCase || 'N/A'}</p>
            </div>
            <div className="bg-[#0b0e17] p-2.5 rounded border border-rose-500/20">
              <span className="text-[10px] font-mono uppercase text-rose-400 block mb-1">Bear Case</span>
              <p className="text-slate-300">{market.analysis?.bearCase || 'N/A'}</p>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
