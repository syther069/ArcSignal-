'use client';

import Link from 'next/link';
import { formatUnits } from 'viem';
import { useReadContract } from 'wagmi';
import { ArrowUpRight, Check, Clock3, Sparkles, X } from 'lucide-react';
import { ARCSIGNAL_ABI, ARCSIGNAL_ADDRESS } from '@/lib/contracts';
import type { SerializableMarket } from '@/lib/markets';
import { CountdownTimer } from './CountdownTimer';

interface ProfessionalMarketCardProps {
  market: SerializableMarket;
  onFollow: () => void;
  onFade: () => void;
}

function formatUsdc(value: bigint) {
  return Number(formatUnits(value, 6)).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function asRawUsdc(value: string | number) {
  return BigInt(Math.max(0, Math.round(Number(value) * 1_000_000)));
}

function getTimeframe(marketId: string) {
  return marketId.match(/-PRICE-(5m|15m|1h|4h|24h)-/)?.[1] ?? null;
}

export function ProfessionalMarketCard({ market, onFollow, onFade }: ProfessionalMarketCardProps) {
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
  const isResolved = market.resolved;
  const isPending = !isResolved && (market.status === 'PENDING_RESOLUTION' || market.resolutionTime <= now);
  const isOpen = !isResolved && !isPending && market.status !== 'CLOSED';
  const aiPrediction = market.analysis?.prediction?.toUpperCase() || '—';
  const confidence = Math.round(market.analysis?.confidence ?? 0);
  const closeTime = new Date(market.resolutionTime * 1000);
  const statusLabel = isResolved ? (market.outcome === 'CANCELLED' ? 'CANCELLED' : 'RESOLVED') : isPending ? 'PENDING' : 'OPEN';
  const statusClass = isResolved
    ? market.outcome === 'CANCELLED' ? 'border-slate-500/20 bg-slate-500/10 text-slate-300' : 'border-[#ddb7ff]/20 bg-[#ddb7ff]/10 text-[#ddb7ff]'
    : isPending ? 'border-amber-400/20 bg-amber-400/10 text-amber-300' : 'border-emerald-400/20 bg-emerald-400/10 text-emerald-400';

  return (
    <article className="group flex min-h-[288px] flex-col rounded-2xl border border-white/[0.08] bg-[#171717] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#ddb7ff]/35 hover:bg-[#1b1a1b] hover:shadow-[0_18px_45px_rgba(0,0,0,0.28)] md:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="rounded-md border border-[#ddb7ff]/20 bg-[#ddb7ff]/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#ddb7ff]">{market.category}</span>
          {timeframe && <span className="rounded-md border border-white/[0.08] px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[#94a3b8]">{timeframe}</span>}
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${statusClass}`}>{statusLabel}</span>
      </div>

      <Link href={`/market/${market.marketId}`} className="mt-4 block flex-1">
        <h2 className="line-clamp-3 font-[family-name:var(--font-hanken)] text-[1.15rem] font-semibold leading-[1.25] text-white transition-colors group-hover:text-[#ead7ff]">{market.question}</h2>
        <div className="mt-3 flex items-center gap-2 text-[11px] text-[#64748b]"><Clock3 size={13} /> Closes {closeTime.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}<ArrowUpRight size={13} className="ml-auto opacity-50" /></div>
      </Link>

      <div className="mt-4 rounded-xl border border-white/[0.06] bg-[#101010] p-3">
        <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.12em] text-[#64748b]"><span>Market-implied split</span><span>{formatUsdc(totalPool)} USDC liquidity</span></div>
        <div className="flex h-2 overflow-hidden rounded-full bg-[#292929]"><div className="bg-[#4fdbc8] transition-all" style={{ width: `${followShare}%` }} /><div className="bg-[#f87171] transition-all" style={{ width: `${fadeShare}%` }} /></div>
        <div className="mt-2 grid grid-cols-2 gap-3 text-xs"><div><p className="text-[#94a3b8]">FOLLOW</p><p className="mt-0.5 font-[family-name:var(--font-jetbrains-mono)] font-bold text-[#4fdbc8]">{followShare.toFixed(1)}%</p></div><div className="text-right"><p className="text-[#94a3b8]">FADE</p><p className="mt-0.5 font-[family-name:var(--font-jetbrains-mono)] font-bold text-[#f87171]">{fadeShare.toFixed(1)}%</p></div></div>
      </div>

      <div className="mt-3 flex items-center justify-between border-b border-white/[0.06] pb-3 text-[11px] text-[#94a3b8]">
        <span className="inline-flex items-center gap-1.5"><Sparkles size={13} className="text-[#ddb7ff]" /> AI {aiPrediction}{confidence > 0 ? ` · ${confidence}% confidence` : ''}</span>
        <span>{isResolved ? 'Settlement complete' : <CountdownTimer resolutionTime={market.resolutionTime} resolved={false} />}</span>
      </div>

      {isOpen ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={onFollow} className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-[#4fdbc8]/40 bg-[#4fdbc8]/10 px-3 text-xs font-bold text-[#4fdbc8] hover:bg-[#4fdbc8] hover:text-[#0b1716] transition-colors"><Check size={14} /> Follow AI</button>
          <button onClick={onFade} className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-[#f87171]/40 bg-[#f87171]/10 px-3 text-xs font-bold text-[#f87171] hover:bg-[#f87171] hover:text-[#180a0a] transition-colors"><X size={14} /> Fade AI</button>
        </div>
      ) : (
        <Link href={`/market/${market.marketId}`} className="mt-3 flex min-h-[44px] items-center justify-center rounded-lg border border-white/[0.08] text-xs font-semibold text-[#c4b5fd] transition-colors hover:border-[#ddb7ff]/40 hover:text-white">{isPending ? 'View pending resolution' : 'View market details'}</Link>
      )}
    </article>
  );
}
