'use client';

import React from 'react';
import { Share2 } from 'lucide-react';

/**
 * Builds the prefilled X post. Plain facts only: the question, the AI's pick, and the market price.
 * Nothing is posted on the user's behalf; X's own compose window opens and they decide.
 */
export function buildShareText(input: { question: string; aiPick: string | null; aiConfidence: number | null; marketYes: number | null }): string {
  const parts = [input.question];
  const facts: string[] = [];
  if (input.aiPick) facts.push(`ArcSignal AI picks ${input.aiPick}${input.aiConfidence !== null ? ` (${Math.round(input.aiConfidence)}% confidence)` : ''}`);
  if (input.marketYes !== null) facts.push(`market prices ${Math.round(input.marketYes * 100)}% YES`);
  if (facts.length) parts.push(`${facts.join(', ')}.`);
  parts.push('Follow or fade the AI on Arc:');
  return parts.join('\n\n').slice(0, 250);
}

export function shareUrl(text: string, url: string): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}

export default function ShareOnX(props: { marketId: string; question: string; aiPick: string | null; aiConfidence: number | null; marketYes: number | null }) {
  const onShare = () => {
    const pageUrl = `${window.location.origin}/market/${encodeURIComponent(props.marketId)}`;
    window.open(shareUrl(buildShareText(props), pageUrl), '_blank', 'noopener,noreferrer');
  };
  return <button type="button" onClick={onShare}
    className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-[#403947] bg-[#1c1b1b] px-4 text-sm font-semibold text-[#f1eef4] hover:border-[#ddb7ff]/50">
    <Share2 size={15} /> Share on X
  </button>;
}
