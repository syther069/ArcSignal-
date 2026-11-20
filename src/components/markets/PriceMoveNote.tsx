'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { moveHeadline, type PriceMoveNote as Note } from '@/lib/price-moves-shared';

type NoteWithAnchor = Note & { anchor: { txHash: string; blockNumber: number } | null };

function safeUrl(value: string): string | undefined {
  try { const url = new URL(value); return url.protocol === 'https:' || url.protocol === 'http:' ? value : undefined; } catch { return undefined; }
}

/** "Why did the price move?" — Grok's likely cause for a big recent move, with its sources. */
export function PriceMoveCard({ note }: { note: NoteWithAnchor }) {
  const up = note.toP > note.fromP;
  return <div role="note" aria-label="Why the price moved" className={`rounded-xl border p-3 text-sm ${up ? 'border-[#4FDBC8]/30 bg-[#4FDBC8]/5' : 'border-[#F3A6C8]/30 bg-[#F3A6C8]/5'}`}>
    <p className={`font-mono text-xs font-bold ${up ? 'text-[#4FDBC8]' : 'text-[#F3A6C8]'}`}>{moveHeadline(note.fromP, note.toP, note.windowMinutes)}</p>
    <p className="mt-1 text-[#F1EEF4]"><span className="text-[#B0ABB5]">Likely why (Grok): </span>{note.note}</p>
    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
      {note.citations.map((c, i) => safeUrl(c.url) ? <a key={c.url} href={safeUrl(c.url)} target="_blank" rel="noreferrer nofollow" className="text-[#DDB7FF] underline">{c.kind === 'x' ? `Post ${i + 1} on X` : `Source ${i + 1}`}</a> : null)}
      {note.anchor ? <Link href={`/transaction/${note.anchor.txHash}`} className="text-[#B0ABB5] underline">Timestamped on Arc</Link> : null}
    </div>
  </div>;
}

export default function PriceMoveNote({ marketId }: { marketId: string }) {
  const { data } = useQuery({
    queryKey: ['price-move', marketId],
    queryFn: async () => {
      const response = await fetch(`/api/markets/${encodeURIComponent(marketId)}/moves`);
      if (!response.ok) return null;
      return (await response.json() as { note: NoteWithAnchor | null }).note;
    },
    staleTime: 60_000, refetchInterval: 120_000, retry: 0,
  });
  return data ? <PriceMoveCard note={data} /> : null;
}
