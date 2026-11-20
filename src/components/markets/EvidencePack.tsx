'use client';

import { useQuery } from '@tanstack/react-query';
import { EVIDENCE_NOTE, type EvidencePack as Pack } from '@/lib/evidence-shared';

function safeUrl(value: string): string | undefined {
  try { const url = new URL(value); return url.protocol === 'https:' || url.protocol === 'http:' ? value : undefined; } catch { return undefined; }
}
const host = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'source'; } };

/** "Evidence gathered by Grok (advisory)" — shown after close. Never decides the result. */
export function EvidencePackCard({ pack }: { pack: Pack }) {
  const label = pack.likelyResult === 'UNCLEAR' ? 'Evidence is unclear so far' : `Evidence points to ${pack.likelyResult}`;
  return <section aria-labelledby="evidence-title" className="rounded-2xl border border-[#403947] bg-[#1c1b1b] p-5 text-sm text-[#f1eef4]">
    <p className="text-xs uppercase tracking-wider text-[#b0abb5]">Evidence gathered by Grok (advisory)</p>
    <h2 id="evidence-title" className="mt-1 text-lg font-semibold">{label}</h2>
    <p className="mt-1">{pack.summary}</p>
    {pack.citations.length ? <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
      {pack.citations.map((c) => safeUrl(c.url) ? <li key={c.url}><a href={safeUrl(c.url)} target="_blank" rel="noreferrer nofollow" className="text-[#ddb7ff] underline">{c.kind === 'x' ? 'Post on X' : host(c.url)}</a></li> : null)}
    </ul> : null}
    <p className="mt-2 text-xs text-[#b0abb5]">{EVIDENCE_NOTE}</p>
  </section>;
}

export default function EvidencePack({ marketId }: { marketId: string }) {
  const { data } = useQuery({
    queryKey: ['evidence-pack', marketId],
    queryFn: async () => {
      const response = await fetch(`/api/markets/${encodeURIComponent(marketId)}/evidence`);
      return response.ok ? (await response.json() as { evidence: Pack | null }).evidence : null;
    },
    staleTime: 60_000, retry: 0,
  });
  return data ? <EvidencePackCard pack={data} /> : null;
}
