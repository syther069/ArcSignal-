'use client';

import React, { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { ASK_DISCLAIMER, ASK_MAX_CHARS, ASK_SUGGESTIONS } from '@/lib/ask-grok-shared';

type Answer = { question: string; answer: string; citations: { url: string; kind: 'x' | 'web' }[] };

function safeUrl(value: string): string | undefined {
  try { const url = new URL(value); return url.protocol === 'https:' || url.protocol === 'http:' ? value : undefined; } catch { return undefined; }
}

/** Ask Grok about this market. Answers use live X and web posts, with links. */
export default function AskGrok({ marketId }: { marketId: string }) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/markets/${encodeURIComponent(marketId)}/ask`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: q }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? 'Grok could not answer right now.');
      setAnswers((prev) => [{ question: q, answer: body.answer, citations: body.citations ?? [] }, ...prev].slice(0, 5));
      setInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Grok could not answer right now.');
    } finally {
      setBusy(false);
    }
  }

  return <section aria-labelledby="ask-grok-title" className="rounded-2xl border border-[#403947] bg-[#1c1b1b] p-5 space-y-3 text-[#f1eef4]">
    <div>
      <h2 id="ask-grok-title" className="text-lg font-semibold">Ask Grok about this market</h2>
      <p className="text-sm text-[#b0abb5]">Answers use live posts on X and the web, with links.</p>
    </div>
    <div className="flex flex-wrap gap-2">
      {ASK_SUGGESTIONS.map((s) => <button key={s} type="button" disabled={busy} onClick={() => void ask(s)}
        className="rounded-full border border-[#403947] px-3 py-1.5 text-xs text-[#b0abb5] hover:border-[#ddb7ff]/50 hover:text-[#f1eef4] disabled:opacity-50">{s}</button>)}
    </div>
    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void ask(input); }}>
      <label htmlFor="ask-grok-input" className="sr-only">Your question</label>
      <input id="ask-grok-input" value={input} onChange={(e) => setInput(e.target.value)} maxLength={ASK_MAX_CHARS} placeholder="Ask anything about this market…"
        className="min-w-0 flex-1 rounded-xl border border-[#403947] bg-[#252229] px-3 py-2 text-sm outline-none focus:border-[#ddb7ff]" />
      <button type="submit" disabled={busy || input.trim().length < 3} aria-label="Ask Grok"
        className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#ddb7ff] px-3 text-sm font-bold text-[#131313] disabled:opacity-45">
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Ask
      </button>
    </form>
    {busy ? <p role="status" className="text-sm text-[#b0abb5]">Grok is searching X and the web…</p> : null}
    {error ? <p role="alert" className="text-sm text-[#ffb4ab]">{error}</p> : null}
    {answers.map((a, i) => <article key={`${i}-${a.question}`} className="rounded-xl border border-[#403947] p-3 text-sm">
      <p className="text-xs text-[#b0abb5]">You asked: {a.question}</p>
      <p className="mt-1 whitespace-pre-wrap">{a.answer}</p>
      {a.citations.length ? <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {a.citations.map((c, j) => safeUrl(c.url) ? <li key={c.url}><a href={safeUrl(c.url)} target="_blank" rel="noreferrer nofollow" className="text-[#ddb7ff] underline">[{j + 1}] {c.kind === 'x' ? 'Post on X' : new URL(c.url).hostname.replace(/^www\./, '')}</a></li> : null)}
      </ul> : null}
    </article>)}
    <p className="text-xs text-[#b0abb5]">{ASK_DISCLAIMER} Your questions are not saved.</p>
  </section>;
}
