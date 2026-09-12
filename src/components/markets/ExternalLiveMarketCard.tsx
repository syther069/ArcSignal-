'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, BarChart3, Bot, Check, LineChart, PlayCircle, ShieldAlert, X } from 'lucide-react';
import type { ArcSignalLiveMarket } from '@/lib/markets/liveMarketTypes';

function percent(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) return '—';
  return `${Math.round(value * 100)}%`;
}

function money(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) return '—';
  return value.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function dateLabel(value?: string) {
  if (!value) return 'Not reported';
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return 'Not reported';
  return new Date(time).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function sourceLabel(source: ArcSignalLiveMarket['source']) {
  if (source === 'polymarket') return 'Polymarket';
  if (source === 'kalshi') return 'Kalshi';
  if (source === 'manifold') return 'Manifold';
  return 'Internal';
}

function riskClass(risk: ArcSignalLiveMarket['aiRiskLevel']) {
  if (risk === 'LOW') return 'border-[#4fdbc8]/30 bg-[#4fdbc8]/10 text-[#4fdbc8]';
  if (risk === 'MEDIUM') return 'border-[#f2c66d]/30 bg-[#f2c66d]/10 text-[#f2c66d]';
  return 'border-[#f3a6c8]/30 bg-[#f3a6c8]/10 text-[#f3a6c8]';
}

export function ExternalLiveMarketCard({ market }: { market: ArcSignalLiveMarket }) {
  const [expanded, setExpanded] = useState(false);
  const [simulatedAction, setSimulatedAction] = useState<string | null>(null);
  const yesProbability = percent(market.marketProbability);
  const noProbability = percent(1 - market.marketProbability);
  const edge = market.signalEdge === undefined ? '—' : `${market.signalEdge.toFixed(1)} pts`;
  const suggestedSide = market.aiSuggestedSide === 'NO' ? 'FADE' : 'FOLLOW';
  const suggestedSideClass = suggestedSide === 'FOLLOW' ? 'text-[#4fdbc8]' : 'text-[#f3a6c8]';
  const promotionCommand = `npm run promote:live id=${market.id}`;

  return (
    <article className="group overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#211c24] via-[#1c1b1b] to-[#141414] transition-all duration-[140ms] hover:border-[#ddb7ff]/35 hover:shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
      <div className="h-1 bg-gradient-to-r from-[#ddb7ff] via-[#4fdbc8] to-[#f3a6c8]" />
      <div className="px-5 py-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em]">
            <span className="rounded px-2 py-0.5 font-bold text-[#ddb7ff] bg-[#ddb7ff]/10 border border-[#ddb7ff]/20">
              {market.category}
            </span>
            <span className="rounded px-2 py-0.5 font-bold text-[#c0c1ff] bg-[#c0c1ff]/10 border border-[#c0c1ff]/20">
              {sourceLabel(market.source)}
            </span>
            <span className="rounded px-2 py-0.5 font-bold text-[#f2c66d] bg-[#f2c66d]/10 border border-[#f2c66d]/20">
              {market.arcSettlement ? 'Arc V2 settlement enabled' : 'External market signal — not Arc-native settlement yet'}
            </span>
          </div>

          <a href={market.sourceUrl} target="_blank" rel="noreferrer" className="group/link inline-flex max-w-full items-start gap-1.5 text-[#f1eef4] font-display text-[20px] font-semibold tracking-[-0.02em] hover:text-[#ddb7ff] transition-colors leading-[1.3]">
            <span>{market.question}</span>
            <ArrowUpRight size={14} className="mt-1 text-[#ddb7ff] shrink-0" />
          </a>

          <p className="mt-2 text-[13px] leading-relaxed text-[#b0abb5]">
            Live prediction market intelligence aggregated from external markets.
            {market.arcSettlement ? ' This item has been mirrored into an Arc V2 market with on-chain settlement commitments.' : ''}
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-[#b0abb5]">
            Close date: <span className="text-[#f1eef4]">{dateLabel(market.endDate)}</span>
            {' '}· Resolution source: <span className="text-[#f1eef4]">{market.resolutionSource ? market.resolutionSource.slice(0, 120) : 'Not reported by source API'}</span>
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5 font-mono text-xs">
            <div className="rounded-lg border border-[#403947] bg-[#131313] p-2.5">
              <span className="block text-[#b0abb5] font-sans">YES probability</span>
              <strong className="mt-1 block text-[#4fdbc8] tabular-nums">{yesProbability}</strong>
            </div>
            <div className="rounded-lg border border-[#403947] bg-[#131313] p-2.5">
              <span className="block text-[#b0abb5] font-sans">NO probability</span>
              <strong className="mt-1 block text-[#f3a6c8] tabular-nums">{noProbability}</strong>
            </div>
            <div className="rounded-lg border border-[#403947] bg-[#131313] p-2.5">
              <span className="block text-[#b0abb5] font-sans">Volume</span>
              <strong className="mt-1 block text-[#f1eef4] tabular-nums">{money(market.volume)}</strong>
            </div>
            <div className="rounded-lg border border-[#403947] bg-[#131313] p-2.5">
              <span className="block text-[#b0abb5] font-sans">Liquidity</span>
              <strong className="mt-1 block text-[#f1eef4] tabular-nums">{money(market.liquidity)}</strong>
            </div>
            <div className="rounded-lg border border-[#ddb7ff]/25 bg-[#ddb7ff]/10 p-2.5">
              <span className="block text-[#b0abb5] font-sans">AI call</span>
              <strong className={`mt-1 block tabular-nums ${suggestedSideClass}`}>{suggestedSide}</strong>
            </div>
          </div>
        </div>

        <div className="w-full xl:w-[340px] shrink-0 rounded-2xl border border-[#403947] bg-[#131313]/95 p-4 space-y-3 shadow-inner">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[#ddb7ff]">
              <Bot size={16} />
              <span className="font-mono text-xs font-bold uppercase tracking-wider">AI Signal</span>
            </div>
            <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold ${riskClass(market.aiRiskLevel)}`}>
              {market.aiRiskLevel ?? 'HIGH'} RISK
            </span>
          </div>

          <div className="rounded-xl border border-[#ddb7ff]/20 bg-[#ddb7ff]/10 p-3">
            <span className="text-[#b0abb5] text-xs">AI suggested position</span>
            <div className="mt-1 flex items-end justify-between gap-3">
              <strong className={`font-display text-2xl tracking-tight ${suggestedSideClass}`}>{suggestedSide}</strong>
              <span className="font-mono text-xs text-[#f1eef4]">{market.aiConfidence ?? '—'}% confidence</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-[#403947] bg-[#1c1b1b] p-2.5">
              <span className="text-[#b0abb5]">AI confidence</span>
              <strong className="block text-[#f1eef4] font-mono tabular-nums">{market.aiConfidence ?? '—'}%</strong>
            </div>
            <div className="rounded-lg border border-[#403947] bg-[#1c1b1b] p-2.5">
              <span className="text-[#b0abb5]">Signal Edge</span>
              <strong className="block text-[#ddb7ff] font-mono tabular-nums">{edge}</strong>
            </div>
            <div className="rounded-lg border border-[#403947] bg-[#1c1b1b] p-2.5">
              <span className="text-[#b0abb5]">Position</span>
              <strong className={`block font-mono ${suggestedSideClass}`}>{suggestedSide}</strong>
            </div>
            <div className="rounded-lg border border-[#403947] bg-[#1c1b1b] p-2.5">
              <span className="text-[#b0abb5]">Simulated wager</span>
              <strong className="block text-[#f1eef4] font-mono tabular-nums">{money(market.aiSuggestedWager)}</strong>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-[#b0abb5]">{market.aiReason}</p>

          {market.arcSettlement && (
            <div className="rounded-lg border border-[#4fdbc8]/25 bg-[#4fdbc8]/10 p-2.5 text-xs leading-relaxed text-[#dffcf8]">
              <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4fdbc8]">Arc Settlement</div>
              <p className="mt-1">Status: <strong>{market.arcSettlement.status}</strong></p>
              <p className="break-all">Market: {market.arcSettlement.marketId}</p>
              {market.arcSettlement.sourceOutcome && <p>Source result: {market.arcSettlement.sourceOutcome}</p>}
            </div>
          )}

          {market.arcSettlement?.marketId ? (
            <Link href={`/market/${market.arcSettlement.marketId}`} className="flex min-h-[44px] items-center justify-center rounded-xl border border-[#4fdbc8]/40 bg-[#4fdbc8] px-3 text-sm font-bold text-[#131313] hover:bg-[#a7fff3]">
              Trade on Arc V2
            </Link>
          ) : (
            <button type="button" onClick={() => setSimulatedAction(`Promote first, then trade: ${promotionCommand}`)} className="flex min-h-[44px] w-full items-center justify-center rounded-xl border border-[#ddb7ff]/40 bg-[#ddb7ff]/10 px-3 text-sm font-bold text-[#ddb7ff] hover:bg-[#ddb7ff] hover:text-[#240b35]">
              Promote to Arc V2
            </button>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button type="button" onClick={() => {
              setExpanded((value) => !value);
              setSimulatedAction('Analysis expanded. Settlement status is shown when this external item is mirrored into Arc V2.');
            }} className="min-h-[38px] rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-xs font-semibold text-[#f1eef4] hover:bg-white/[0.08]">
              Analyze
            </button>
            <button type="button" onClick={() => setSimulatedAction(`AI recommends ${suggestedSide} with a ${money(market.aiSuggestedWager)} reference wager and ${market.aiConfidence ?? '—'}% confidence.`)} className="min-h-[38px] rounded-lg border border-[#ddb7ff]/40 bg-[#ddb7ff]/10 px-3 text-xs font-semibold text-[#ddb7ff] hover:bg-[#ddb7ff] hover:text-[#240b35]">
              <span className="inline-flex items-center gap-1"><Check size={12} /> Follow AI</span>
            </button>
            <button type="button" onClick={() => setSimulatedAction(`Fade view: take the opposite side of the AI ${suggestedSide} call as a watchlist scenario.`)} className="min-h-[38px] rounded-lg border border-[#f3a6c8]/40 bg-[#f3a6c8]/10 px-3 text-xs font-semibold text-[#f3a6c8] hover:bg-[#f3a6c8] hover:text-[#240b35]">
              <span className="inline-flex items-center gap-1"><X size={12} /> Fade AI</span>
            </button>
            <button type="button" onClick={() => setSimulatedAction(market.arcSettlement?.marketId ? `Open Trade on Arc V2 to place ${suggestedSide}.` : `Promote first, then trade on Arc V2: ${promotionCommand}`)} className="min-h-[38px] rounded-lg border border-[#4fdbc8]/30 bg-[#4fdbc8]/10 px-3 text-xs font-semibold text-[#4fdbc8] hover:bg-[#4fdbc8]/15">
              <span className="inline-flex items-center gap-1"><PlayCircle size={12} /> Preview Position</span>
            </button>
          </div>

          {simulatedAction && (
            <div className="rounded-lg border border-[#ddb7ff]/25 bg-[#ddb7ff]/10 p-2.5 text-xs leading-relaxed text-[#ead7ff]">
              {simulatedAction}
            </div>
          )}
        </div>
      </div>
      </div>

      {expanded && (
        <div className="mx-5 mb-5 grid gap-3 border-t border-white/[0.06] pt-4 md:grid-cols-3 text-xs">
          <div className="rounded-xl border border-[#403947] bg-[#131313] p-3">
            <div className="mb-1 flex items-center gap-1.5 text-[#ddb7ff] font-mono font-bold uppercase tracking-wider"><BarChart3 size={13} /> Source</div>
            <p className="text-[#b0abb5]">Original market: <a href={market.sourceUrl} target="_blank" rel="noreferrer" className="text-[#ddb7ff] underline">{sourceLabel(market.source)}</a></p>
            <p className="mt-1 text-[#b0abb5]">Close date: <span className="text-[#f1eef4]">{dateLabel(market.endDate)}</span></p>
          </div>
          <div className="rounded-xl border border-[#403947] bg-[#131313] p-3">
            <div className="mb-1 flex items-center gap-1.5 text-[#ddb7ff] font-mono font-bold uppercase tracking-wider"><ShieldAlert size={13} /> Resolution</div>
            <p className="line-clamp-4 text-[#b0abb5]">{market.resolutionSource || 'Resolution source was not reported by the external API.'}</p>
          </div>
          <div className="rounded-xl border border-[#403947] bg-[#131313] p-3">
            <div className="mb-1 flex items-center gap-1.5 text-[#ddb7ff] font-mono font-bold uppercase tracking-wider"><LineChart size={13} /> Evidence Context</div>
            {market.contextSources?.length ? (
              <ul className="space-y-1 text-[#b0abb5]">
                {market.contextSources.map((source) => (
                  <li key={`${market.id}-${source.provider}`}>
                    <a href={source.url} target="_blank" rel="noreferrer" className="text-[#ddb7ff] underline">{source.label}</a>{' '}
                    <span className="uppercase text-[10px]">{source.status}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[#b0abb5]">No extra context attached for this market yet.</p>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

