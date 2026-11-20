'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { Buzz, MarketDraft } from '@/lib/trend-drafts-shared';

type Draft = MarketDraft & { expired: boolean };

const KEY = 'arcsignal.opsSecret';
const readSecret = () => { try { return sessionStorage.getItem(KEY) ?? ''; } catch { return ''; } };
const saveSecret = (v: string) => { try { sessionStorage.setItem(KEY, v); } catch { /* private mode */ } };

const STATUS_STYLE: Record<MarketDraft['status'], string> = {
  draft: 'text-[#f2c66d]', approved: 'text-[#4fdbc8]', rejected: 'text-[#b0abb5]', published: 'text-[#ddb7ff]', failed: 'text-[#ffb4ab]',
};
const BUZZ_STYLE: Record<Buzz, string> = {
  quiet: 'border-white/10 text-[#b0abb5]', active: 'border-[#4fdbc8]/40 text-[#4fdbc8]', surging: 'border-[#f3a6c8]/50 text-[#f3a6c8]',
};
const BUZZ_LABEL: Record<Buzz, string> = { quiet: 'Quiet', active: 'Active', surging: 'Surging' };

/** How far the live price has moved since the draft, as a signed percent. */
export function priceDrift(reference: number, live: number | undefined): number | null {
  if (!live || !reference) return null;
  return Math.round(((live - reference) / reference) * 1000) / 10;
}

export default function DraftReview() {
  const [secret, setSecret] = useState('');
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const call = useCallback(async (path: string, init?: RequestInit) => {
    const response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}`, ...(init?.headers ?? {}) } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`);
    return body;
  }, [secret]);

  const load = useCallback(async () => {
    if (!secret) return;
    try {
      const body = await call('/api/ops/drafts');
      setDrafts(body.drafts);
      setPrices(body.prices ?? {});
      setMessage(null);
    } catch (e) { setDrafts(null); setMessage(e instanceof Error ? e.message : 'Failed'); }
  }, [call, secret]);

  useEffect(() => { setSecret(readSecret()); }, []);
  useEffect(() => { void load(); }, [load]);

  async function act(fn: () => Promise<string>) {
    setBusy(true);
    try { setMessage(await fn()); await load(); } catch (e) { setMessage(e instanceof Error ? e.message : 'Failed'); } finally { setBusy(false); }
  }

  const expiredCount = drafts?.filter((d) => d.expired).length ?? 0;

  return <div className="space-y-4">
    <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); saveSecret(secret); void load(); }}>
      <label htmlFor="ops-secret" className="sr-only">Operator secret</label>
      <input id="ops-secret" type="password" autoComplete="off" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Operator secret"
        className="min-w-0 flex-1 rounded-xl border border-[#403947] bg-[#252229] px-3 py-2 text-sm outline-none focus:border-[#ddb7ff]" />
      <button type="submit" className="rounded-xl border border-[#ddb7ff]/40 px-4 py-2 text-sm font-bold text-[#ddb7ff]">Load</button>
      <button type="button" disabled={busy || !secret} onClick={() => void act(async () => {
        const r = await call('/api/ops/drafts', { method: 'POST', body: JSON.stringify({ action: 'generate' }) });
        return `Grok drafted ${r.created} new idea(s).${r.rejected?.length ? ` Skipped: ${r.rejected.join('; ')}` : ''}`;
      })} className="rounded-xl bg-[#ddb7ff] px-4 py-2 text-sm font-bold text-[#131313] disabled:opacity-45">{busy ? 'Working…' : 'Ask Grok for ideas'}</button>
      {expiredCount ? <button type="button" disabled={busy} onClick={() => void act(async () => {
        const r = await call('/api/ops/drafts', { method: 'POST', body: JSON.stringify({ action: 'reject-expired' }) });
        return `Rejected ${r.rejected} expired draft(s).`;
      })} className="rounded-xl border border-[#403947] px-4 py-2 text-sm text-[#b0abb5] disabled:opacity-45">Reject {expiredCount} expired</button> : null}
    </form>
    {message ? <p role="status" className="text-sm text-[#b0abb5]">{message}</p> : null}
    {drafts && drafts.length === 0 ? <p className="text-sm text-[#b0abb5]">No drafts yet.</p> : null}
    {drafts?.map((d) => {
      const drift = priceDrift(d.referencePrice, prices[d.symbol]);
      const waiting = d.status === 'draft' && !d.expired;
      return <article key={d.id} className={`rounded-xl border bg-[#1c1b1b] p-4 text-sm ${d.expired ? 'border-[#403947] opacity-60' : 'border-[#403947]'}`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Will {d.symbol} be at or above ${d.threshold.toLocaleString('en-US')} in {d.horizonHours}h?</h2>
          <span className={`font-mono text-xs uppercase ${STATUS_STYLE[d.status]}`}>{d.expired ? 'expired' : d.status}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          {d.buzz ? <span className={`rounded-full border px-2 py-0.5 ${BUZZ_STYLE[d.buzz]}`}>{BUZZ_LABEL[d.buzz]} on X</span> : null}
          {d.lean !== null ? <span className="text-[#f1eef4]">X leans {Math.round(d.lean * 100)}% YES at this level</span> : null}
          {d.postCount !== null ? <span className="text-[#b0abb5]">~{d.postCount} posts</span> : null}
          {d.score !== null ? <span className="text-[#b0abb5]">score {d.score}</span> : null}
        </div>
        <p className="mt-2 text-[#b0abb5]">Why X is debating it: {d.reason}</p>
        <p className="mt-1 text-xs text-[#b0abb5]">
          Price when drafted ${d.referencePrice.toLocaleString('en-US', { maximumFractionDigits: 4 })}
          {prices[d.symbol] ? ` · now $${prices[d.symbol].toLocaleString('en-US', { maximumFractionDigits: 4 })}` : ''}
          {drift !== null ? <span className={Math.abs(drift) > 3 ? ' text-[#ffb4ab]' : ''}> ({drift > 0 ? '+' : ''}{drift}%{Math.abs(drift) > 3 ? ', moved a lot since drafting' : ''})</span> : null}
          {' '}· Settles on CoinGecko · {new Date(d.createdAt).toLocaleString()}
        </p>
        {d.citations.length ? <p className="mt-1 flex flex-wrap gap-3 text-xs">{d.citations.map((c, i) => <a key={c.url} href={c.url} target="_blank" rel="noreferrer nofollow" className="text-[#ddb7ff] underline">Post {i + 1}</a>)}</p> : null}
        {d.lastError ? <p className="mt-1 text-xs text-[#ffb4ab]">{d.lastError}</p> : null}
        {d.expired ? <p className="mt-1 text-xs text-[#b0abb5]">Older than 12 hours, so it can no longer be approved. Prices move; ask Grok for fresh ideas.</p> : null}
        {d.publishedMarketId ? <a href={`/market/${d.publishedMarketId}`} className="mt-1 inline-block text-xs text-[#ddb7ff] underline">View published market</a> : null}
        {d.status === 'draft' ? <div className="mt-3 flex gap-2">
          <button type="button" disabled={busy || !waiting} onClick={() => void act(async () => { await call(`/api/ops/drafts/${d.id}`, { method: 'POST', body: JSON.stringify({ decision: 'approved' }) }); return 'Approved. The next market job will publish it.'; })}
            className="rounded-lg bg-[#4fdbc8] px-3 py-1.5 text-xs font-bold text-[#131313] disabled:opacity-40">Approve</button>
          <button type="button" disabled={busy} onClick={() => void act(async () => { await call(`/api/ops/drafts/${d.id}`, { method: 'POST', body: JSON.stringify({ decision: 'rejected' }) }); return 'Rejected.'; })}
            className="rounded-lg border border-[#403947] px-3 py-1.5 text-xs font-bold text-[#b0abb5] disabled:opacity-45">Reject</button>
        </div> : null}
      </article>;
    })}
  </div>;
}
