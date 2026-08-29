'use client';

import { ShieldCheck, Sparkles } from 'lucide-react';

interface MarketProbabilityChartProps {
  followPercent: number;
  fadePercent: number;
  aiConfidence: number;
  aiPrediction: string;
  openedAt?: number;
  resolutionTime: number;
  marketId: string;
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
}

export function MarketProbabilityChart({
  followPercent,
  fadePercent,
  aiConfidence,
  aiPrediction,
  resolutionTime,
  marketId,
}: MarketProbabilityChartProps) {
  const follow = clampPercent(followPercent);
  const fade = clampPercent(fadePercent);
  const confidence = clampPercent(aiConfidence);

  return (
    <section className="space-y-5 rounded-2xl border border-white/[0.08] bg-[#141414] p-5 lg:p-6">
      <div className="flex flex-col gap-3 border-b border-white/[0.06] pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#ddb7ff]" />
            <h3 className="font-display text-base font-bold tracking-tight text-white">
              Current on-chain pool snapshot
            </h3>
          </div>
          <p className="mt-1 text-xs text-[#94a3b8]">
            Live Follow/Fade shares calculated from the contract pools
          </p>
        </div>
        <span className="rounded-full border border-emerald-400/25 bg-emerald-400/5 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-emerald-300">
          ARC verified
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between font-mono text-xs">
          <span className="text-[#4fdbc8]">Follow {follow.toFixed(1)}%</span>
          <span className="text-[#ffb4ab]">Fade {fade.toFixed(1)}%</span>
        </div>
        <div
          className="flex h-4 overflow-hidden rounded-full bg-white/[0.06]"
          aria-label={`Current on-chain pool split: Follow ${follow.toFixed(1)}%, Fade ${fade.toFixed(1)}%`}
        >
          <div className="h-full bg-[#4fdbc8]" style={{ width: `${follow}%` }} />
          <div className="h-full bg-[#ffb4ab]" style={{ width: `${fade}%` }} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
          <div className="flex items-center gap-2 text-xs text-[#94a3b8]">
            <Sparkles size={14} className="text-[#ddb7ff]" />
            Model signal
          </div>
          <p className="mt-2 font-mono text-lg font-bold text-white">
            {aiPrediction || 'Unavailable'} · {confidence.toFixed(0)}%
          </p>
          <p className="mt-1 text-[10px] text-[#64748b]">
            AI conviction is model output, not an on-chain pool value
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
          <p className="text-xs text-[#94a3b8]">Resolution deadline</p>
          <p className="mt-2 font-mono text-sm font-bold text-white">
            {new Date(resolutionTime * 1000).toUTCString()}
          </p>
          <p className="mt-1 break-all font-mono text-[10px] text-[#64748b]">{marketId}</p>
        </div>
      </div>

      <p className="text-[10px] leading-relaxed text-[#64748b]">
        Historical pool changes are not shown because ArcSignal does not currently have a complete indexed event history. No synthetic history is generated.
      </p>
    </section>
  );
}