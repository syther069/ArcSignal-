'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, BarChart3, Bot, Check, LineChart, PlayCircle, ShieldAlert, X } from 'lucide-react';
import type { ArcSignalLiveMarket } from '@/lib/markets/liveMarketTypes';

type ExternalPositionSide = 'FOLLOW' | 'FADE';

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

export function ExternalLiveMarketCard({ market, onTrade }: { market: ArcSignalLiveMarket; onTrade?: (side: ExternalPositionSide) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [simulatedAction, setSimulatedAction] = useState<string | null>(null);
  const yesProbability = percent(market.marketProbability);
  const noProbability = percent(1 - market.marketProbability);
  const yesPercentNumber = Math.max(0, Math.min(100, Number.isFinite(market.marketProbability) ? market.marketProbability * 100 : 50));
  const noPercentNumber = 100 - yesPercentNumber;
  const edge = market.signalEdge === undefined ? '—' : `${market.signalEdge.toFixed(1)} pts`;
  const suggestedSide: ExternalPositionSide = market.aiSuggestedSide === 'NO' ? 'FADE' : 'FOLLOW';
  const suggestedSideClass = suggestedSide === 'FOLLOW' ? 'text-[#4fdbc8]' : 'text-[#f3a6c8]';
  const suggestedSideBg = suggestedSide === 'FOLLOW' ? 'from-[#4fdbc8]/18 to-[#ddb7ff]/10' : 'from-[#f3a6c8]/18 to-[#ddb7ff]/10';
  const promotionCommand = `npm run promote:live id=${market.id}`;

  return (
    <article className="group relative overflow-hidden rounded-xl border border-[#403947]/80 bg-[#171419] shadow-[0_18px_48px_rgba(0,0,0,0.28)] transition-colors duration-150 hover:border-[#ddb7ff]/45 motion-reduce:transition-none">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#ddb7ff] via-[#4fdbc8] to-[#f3a6c8]" />

      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 p-4 sm:p-5 lg:p-6">
          <div className="mb-3 flex flex-wrap items-center gap-2 font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-[0.08em]">
            <span className="rounded-md border border-[#ddb7ff]/25 bg-[#ddb7ff]/10 px-2 py-1 font-semibold text-[#ddb7ff]">
              {market.category}
            </span>
            <span className="rounded-md border border-[#c0c1ff]/20 bg-[#c0c1ff]/10 px-2 py-1 font-semibold text-[#c0c1ff]">
              {sourceLabel(market.source)}
            </span>
            <span className="rounded-md border border-[#f2c66d]/25 bg-[#f2c66d]/10 px-2 py-1 font-semibold text-[#f2c66d]">
              {market.arcSettlement ? 'Arc V2 settlement enabled' : 'External market signal - not Arc-native settlement yet'}
            </span>
          </div>

          <a href={market.sourceUrl} target="_blank" rel="noreferrer" className="group/link inline-flex max-w-full items-start gap-2 rounded-md text-[#f1eef4] font-[family-name:var(--font-hanken)] text-lg font-semibold leading-snug transition-colors duration-150 hover:text-[#ddb7ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ddb7ff] sm:text-xl motion-reduce:transition-none">
            <span>{market.question}</span>
            <ArrowUpRight size={15} className="mt-1 shrink-0 text-[#ddb7ff]" />
          </a>

          <p className="mt-2 max-w-4xl text-sm leading-6 text-[#b0abb5]">
            Live prediction market intelligence aggregated from external markets.
            {market.arcSettlement ? ' This item has been mirrored into an Arc V2 market with on-chain settlement commitments.' : ''}
          </p>

          <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px]">
            <div className="rounded-lg border border-[#403947]/80 bg-[#121112] p-3">
              <div className="flex items-center justify-between gap-3 font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-semibold uppercase tracking-[0.08em]">
                <span className="text-[#4fdbc8]">Yes {yesProbability}</span>
                <span className="text-[#f3a6c8]">No {noProbability}</span>
              </div>
              <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-[#2a232d]">
                <div className="bg-[#4fdbc8]" style={{ width: `${yesPercentNumber}%` }} />
                <div className="bg-[#f3a6c8]" style={{ width: `${noPercentNumber}%` }} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div>
                  <span className="block text-[11px] text-[#918995]">Volume</span>
                  <strong className="mt-0.5 block font-[family-name:var(--font-jetbrains-mono)] text-sm text-[#f1eef4] tabular-nums">{money(market.volume)}</strong>
                </div>
                <div>
                  <span className="block text-[11px] text-[#918995]">Liquidity</span>
                  <strong className="mt-0.5 block font-[family-name:var(--font-jetbrains-mono)] text-sm text-[#f1eef4] tabular-nums">{money(market.liquidity)}</strong>
                </div>
                <div>
                  <span className="block text-[11px] text-[#918995]">Close date</span>
                  <strong className="mt-0.5 block font-[family-name:var(--font-jetbrains-mono)] text-sm text-[#f1eef4]">{dateLabel(market.endDate)}</strong>
                </div>
                <div>
                  <span className="block text-[11px] text-[#918995]">AI call</span>
                  <strong className={`mt-0.5 block font-[family-name:var(--font-jetbrains-mono)] text-sm tabular-nums ${suggestedSideClass}`}>{suggestedSide}</strong>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[#403947]/80 bg-[#121112] p-3 text-xs leading-relaxed">
              <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-semibold uppercase tracking-[0.08em] text-[#918995]">Resolution source</span>
              <p className="mt-1 line-clamp-3 text-[#d7d0dc]">
                {market.resolutionSource ? market.resolutionSource.slice(0, 140) : 'Not reported by source API'}
              </p>
            </div>
          </div>

          {expanded && (
            <div className="mt-4 grid gap-3 border-t border-[#403947]/70 pt-4 md:grid-cols-3 text-xs">
              <div className="rounded-lg border border-[#403947]/80 bg-[#121112] p-3">
                <div className="mb-1 flex items-center gap-1.5 text-[#ddb7ff] font-[family-name:var(--font-jetbrains-mono)] font-semibold uppercase tracking-[0.08em]"><BarChart3 size={13} /> Source</div>
                <p className="text-[#b0abb5]">Original market: <a href={market.sourceUrl} target="_blank" rel="noreferrer" className="text-[#ddb7ff] underline underline-offset-2">{sourceLabel(market.source)}</a></p>
                <p className="mt-1 text-[#b0abb5]">Close date: <span className="text-[#f1eef4]">{dateLabel(market.endDate)}</span></p>
              </div>
              <div className="rounded-lg border border-[#403947]/80 bg-[#121112] p-3">
                <div className="mb-1 flex items-center gap-1.5 text-[#ddb7ff] font-[family-name:var(--font-jetbrains-mono)] font-semibold uppercase tracking-[0.08em]"><ShieldAlert size={13} /> Resolution</div>
                <p className="line-clamp-4 text-[#b0abb5]">{market.resolutionSource || 'Resolution source was not reported by the external API.'}</p>
              </div>
              <div className="rounded-lg border border-[#403947]/80 bg-[#121112] p-3">
                <div className="mb-1 flex items-center gap-1.5 text-[#ddb7ff] font-[family-name:var(--font-jetbrains-mono)] font-semibold uppercase tracking-[0.08em]"><LineChart size={13} /> Evidence Context</div>
                {market.contextSources?.length ? (
                  <ul className="space-y-1 text-[#b0abb5]">
                    {market.contextSources.map((source) => (
                      <li key={`${market.id}-${source.provider}`}>
                        <a href={source.url} target="_blank" rel="noreferrer" className="text-[#ddb7ff] underline underline-offset-2">{source.label}</a>{' '}
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
        </div>

        <aside className="border-t border-[#403947]/80 bg-[#121112] p-4 sm:p-5 lg:border-l lg:border-t-0">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[#ddb7ff]">
                <Bot size={16} />
                <span className="font-[family-name:var(--font-jetbrains-mono)] text-xs font-semibold uppercase tracking-[0.08em]">AI Signal</span>
              </div>
              <span className={`rounded-full border px-2 py-0.5 font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-semibold uppercase tracking-[0.04em] ${riskClass(market.aiRiskLevel)}`}>
                {market.aiRiskLevel ?? 'HIGH'} Risk
              </span>
            </div>

            <div className={`rounded-lg border border-[#ddb7ff]/25 bg-gradient-to-br ${suggestedSideBg} p-3`}>
              <span className="text-xs text-[#b0abb5]">Suggested position</span>
              <div className="mt-1 flex items-end justify-between gap-3">
                <strong className={`font-[family-name:var(--font-hanken)] text-3xl font-bold tracking-tight ${suggestedSideClass}`}>{suggestedSide}</strong>
                <span className="font-[family-name:var(--font-jetbrains-mono)] text-xs text-[#f1eef4] tabular-nums">{market.aiConfidence ?? '—'}% confidence</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-[#403947]/80 bg-[#171419] p-2.5">
                <span className="text-[#b0abb5]">Signal edge</span>
                <strong className="block font-[family-name:var(--font-jetbrains-mono)] text-[#ddb7ff] tabular-nums">{edge}</strong>
              </div>
              <div className="rounded-lg border border-[#403947]/80 bg-[#171419] p-2.5">
                <span className="text-[#b0abb5]">Wager model</span>
                <strong className="block font-[family-name:var(--font-jetbrains-mono)] text-[#f1eef4] tabular-nums">{money(market.aiSuggestedWager)}</strong>
              </div>
            </div>

            <p className="text-xs leading-5 text-[#b0abb5]">{market.aiReason}</p>

            {market.arcSettlement && (
              <div className="rounded-lg border border-[#4fdbc8]/25 bg-[#4fdbc8]/10 p-3 text-xs leading-relaxed text-[#dffcf8]">
                <div className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-semibold uppercase tracking-[0.08em] text-[#4fdbc8]">Arc Settlement</div>
                <p className="mt-1">Status: <strong>{market.arcSettlement.status}</strong></p>
                <p className="break-all">Market: {market.arcSettlement.marketId}</p>
                {market.arcSettlement.sourceOutcome && <p>Source result: {market.arcSettlement.sourceOutcome}</p>}
              </div>
            )}

            {market.arcSettlement?.marketId && !onTrade ? (
              <Link href={`/market/${market.arcSettlement.marketId}`} className="flex min-h-[44px] items-center justify-center rounded-lg border border-[#4fdbc8]/40 bg-[#4fdbc8] px-3 text-sm font-bold text-[#121112] transition-colors duration-150 hover:bg-[#a7fff3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ddb7ff] motion-reduce:transition-none">
                Place Position
              </Link>
            ) : (
              <button type="button" onClick={() => {
                if (market.arcSettlement?.marketId && onTrade) {
                  onTrade(suggestedSide);
                  return;
                }
                setSimulatedAction(`Promote first, then trade: ${promotionCommand}`);
              }} className="flex min-h-[44px] w-full items-center justify-center rounded-lg border border-[#ddb7ff]/40 bg-[#ddb7ff]/10 px-3 text-sm font-bold text-[#ddb7ff] transition-colors duration-150 hover:bg-[#ddb7ff] hover:text-[#240b35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ddb7ff] motion-reduce:transition-none">
                {market.arcSettlement?.marketId ? 'Place Position' : 'Promote to Arc V2'}
              </button>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={() => {
                setExpanded((value) => !value);
                setSimulatedAction('Analysis expanded. Settlement status is shown when this external item is mirrored into Arc V2.');
              }} className="min-h-[38px] rounded-lg border border-[#403947]/80 bg-[#171419] px-3 text-xs font-semibold text-[#f1eef4] transition-colors duration-150 hover:bg-[#211c24] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ddb7ff] motion-reduce:transition-none">
                Analyze
              </button>
              <button type="button" onClick={() => {
                if (onTrade) {
                  onTrade('FOLLOW');
                  return;
                }
                setSimulatedAction(`Promote first, then place a FOLLOW position on Arc V2: ${promotionCommand}`);
              }} className="min-h-[38px] rounded-lg border border-[#ddb7ff]/40 bg-[#ddb7ff]/10 px-3 text-xs font-semibold text-[#ddb7ff] transition-colors duration-150 hover:bg-[#ddb7ff] hover:text-[#240b35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ddb7ff] motion-reduce:transition-none">
                <span className="inline-flex items-center gap-1"><Check size={12} /> Follow AI</span>
              </button>
              <button type="button" onClick={() => {
                if (onTrade) {
                  onTrade('FADE');
                  return;
                }
                setSimulatedAction(`Promote first, then place a FADE position on Arc V2: ${promotionCommand}`);
              }} className="min-h-[38px] rounded-lg border border-[#f3a6c8]/40 bg-[#f3a6c8]/10 px-3 text-xs font-semibold text-[#f3a6c8] transition-colors duration-150 hover:bg-[#f3a6c8] hover:text-[#240b35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ddb7ff] motion-reduce:transition-none">
                <span className="inline-flex items-center gap-1"><X size={12} /> Fade AI</span>
              </button>
              <button type="button" onClick={() => {
                if (market.arcSettlement?.marketId && onTrade) {
                  onTrade(suggestedSide);
                  return;
                }
                setSimulatedAction(market.arcSettlement?.marketId ? `Use Place Position to place ${suggestedSide}.` : `Promote first, then trade on Arc V2: ${promotionCommand}`);
              }} className="min-h-[38px] rounded-lg border border-[#4fdbc8]/30 bg-[#4fdbc8]/10 px-3 text-xs font-semibold text-[#4fdbc8] transition-colors duration-150 hover:bg-[#4fdbc8]/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ddb7ff] motion-reduce:transition-none">
                <span className="inline-flex items-center gap-1"><PlayCircle size={12} /> Preview Position</span>
              </button>
            </div>

            {simulatedAction && (
              <div className="rounded-lg border border-[#ddb7ff]/25 bg-[#ddb7ff]/10 p-2.5 text-xs leading-relaxed text-[#ead7ff]">
                {simulatedAction}
              </div>
            )}
          </div>
        </aside>
      </div>
    </article>
  );
}

