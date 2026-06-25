'use client';

import { useState } from 'react';
import { formatUnits } from 'viem';
import { useReadContract } from 'wagmi';
import { ARCSIGNAL_ABI, ARCSIGNAL_ADDRESS } from '@/lib/contracts';
import type { Market } from '@/lib/types';
import { CountdownTimer } from './CountdownTimer';

export interface MarketCardProps {
  market: Market;
  onFollow: () => void;
  onFade: () => void;
}

function toPoolDisplay(value: bigint) {
  return Number(formatUnits(value, 6)).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

export function MarketCard({ market, onFollow, onFade }: MarketCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { data } = useReadContract({
    address: ARCSIGNAL_ADDRESS,
    abi: ARCSIGNAL_ABI,
    functionName: 'getMarket',
    args: [BigInt(market.id)],
    query: {
      enabled: /^0x[a-fA-F0-9]{40}$/.test(ARCSIGNAL_ADDRESS),
    },
  });

  const liveFollowPool = data?.followPool ?? market.followPool;
  const liveFadePool = data?.fadePool ?? market.fadePool;
  const totalPool = liveFollowPool + liveFadePool;
  const followShare = totalPool > 0n
    ? Number((liveFollowPool * 10_000n) / totalPool) / 100
    : 0;

  return (
    <article className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-5 transition-colors duration-150 hover:bg-[#1a1a1a]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <span className="text-xs text-zinc-500 uppercase tracking-wider">
            {market.category} / {market.subType}
          </span>
          <h3 className="mt-2 text-base font-medium text-white">{market.question}</h3>
        </div>
        <span className="rounded-full border border-[#1f1f1f] px-2 py-0.5 text-xs text-zinc-400">
          {market.outcome}
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between text-xs text-zinc-500 uppercase tracking-wider">
            <span>AI probability</span>
            <span>{market.analysis.probability}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-[#22c55e]"
              style={{ width: `${market.analysis.probability}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-[#1f1f1f] bg-[#111111] p-3">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Follow pool</p>
            <p className="mt-1 font-mono text-lg font-semibold text-white">
              {toPoolDisplay(liveFollowPool)} USDC
            </p>
          </div>
          <div className="rounded-lg border border-[#1f1f1f] bg-[#111111] p-3">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Fade pool</p>
            <p className="mt-1 font-mono text-lg font-semibold text-white">
              {toPoolDisplay(liveFadePool)} USDC
            </p>
          </div>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-[#ef4444]">
          <div className="h-full bg-[#22c55e]" style={{ width: `${followShare}%` }} />
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-500">
          <CountdownTimer resolutionTime={market.resolutionTime} />
          <span>Confidence {market.analysis.confidence}%</span>
        </div>
      </div>

      {expanded && (
        <div className="mt-5 space-y-4 border-t border-[#1f1f1f] pt-5 text-sm text-zinc-300">
          <p>{market.analysis.summary}</p>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs text-[#22c55e] uppercase tracking-wider">Bull case</p>
              <p className="mt-1">{market.analysis.bullCase}</p>
            </div>
            <div>
              <p className="text-xs text-[#ef4444] uppercase tracking-wider">Bear case</p>
              <p className="mt-1">{market.analysis.bearCase}</p>
            </div>
          </div>
          <ul className="space-y-2 text-xs text-zinc-400">
            {market.analysis.keyFactors.map((factor) => (
              <li key={factor}>{factor}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 grid grid-cols-3 gap-3">
        <button
          onClick={() => setExpanded((value) => !value)}
          className="rounded-lg border border-[#1f1f1f] px-3 py-2 text-xs font-semibold text-zinc-300 transition-colors duration-150 hover:bg-[#111111] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          Analysis
        </button>
        <button
          onClick={onFollow}
          disabled={market.resolved}
          className="rounded-lg bg-[#22c55e] px-3 py-2 text-xs font-semibold text-black transition-colors duration-150 hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          Follow AI
        </button>
        <button
          onClick={onFade}
          disabled={market.resolved}
          className="rounded-lg bg-[#ef4444] px-3 py-2 text-xs font-semibold text-white transition-colors duration-150 hover:bg-[#dc2626] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          Fade AI
        </button>
      </div>
    </article>
  );
}
