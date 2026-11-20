import React from 'react';
import type { TrendInfo } from '@/lib/trend-drafts-shared';

const BUZZ: Record<string, string> = { quiet: 'quiet', active: 'active', surging: 'surging' };

/** Small "Trending on X" chip for market cards. */
export function TrendingChip({ trend }: { trend: TrendInfo | null | undefined }) {
  if (!trend) return null;
  return <span title={trend.reason} className="inline-flex items-center rounded border border-[#f3a6c8]/40 bg-[#f3a6c8]/10 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-[#f3a6c8]">
    Trending on X
  </span>;
}

/** Market page panel: why this market exists, with the X posts behind it. */
export default function TrendingBadge({ trend }: { trend: TrendInfo | null | undefined }) {
  if (!trend) return null;
  return <div role="note" aria-label="Trending on X" className="rounded-xl border border-[#f3a6c8]/30 bg-[#f3a6c8]/5 p-3 text-sm">
    <p className="font-mono text-xs font-bold uppercase tracking-wide text-[#f3a6c8]">
      Trending on X{trend.buzz ? ` · ${BUZZ[trend.buzz]}` : ''}{trend.lean !== null ? ` · X leaned ${Math.round(trend.lean * 100)}% YES when drafted` : ''}
    </p>
    <p className="mt-1 text-[#f1eef4]">{trend.reason}</p>
    {trend.posts.length ? <p className="mt-1 flex flex-wrap gap-3 text-xs">
      {trend.posts.map((url, i) => <a key={url} href={url} target="_blank" rel="noreferrer nofollow" className="text-[#ddb7ff] underline">Post {i + 1} on X</a>)}
    </p> : null}
    <p className="mt-1 text-xs text-[#b0abb5]">Drafted by Grok from X, approved by the ArcSignal operator. It settles on CoinGecko like any price market.</p>
  </div>;
}
