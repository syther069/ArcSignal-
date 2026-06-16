import React from 'react';
import { Market } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { GlassCard } from '@/components/ui/GlassCard';
import { ConfidenceBar } from '@/components/ui/ConfidenceBar';
import { CountdownTimer } from './CountdownTimer';
import { PoolBar } from './PoolBar';

export interface MarketCardProps {
  market: Market;
  onFollow: () => void;
  onFade: () => void;
}

export function MarketCard({ market, onFollow, onFade }: MarketCardProps) {
  // Glow color depending on category
  const glowColor =
    market.category === 'football'
      ? 'rgba(56,189,248,0.05)'
      : 'rgba(129,140,248,0.05)';

  return (
    <GlassCard
      className="scanline relative p-5 flex flex-col group transition-all duration-300 w-full h-full"
      glow={true}
      glowColor={glowColor}
    >
      {/* Top bar */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={market.category} label={market.category} />
          {market.league && (
            <span className="text-[11px] uppercase text-gray-400 font-[family-name:var(--font-jetbrains-mono)] tracking-wider">
              {market.league}
            </span>
          )}
          {market.subType && !market.league && (
            <span className="text-[11px] uppercase text-gray-400 font-[family-name:var(--font-jetbrains-mono)] tracking-wider">
              {market.subType}
            </span>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge
            variant={market.resolved ? 'resolved' : 'live'}
            label={market.resolved ? 'RESOLVED' : 'LIVE'}
          />
          {!market.resolved && (
            <CountdownTimer resolutionTime={market.resolutionTime} />
          )}
        </div>
      </div>

      {/* Title / Teams row */}
      {market.category === 'football' ? (
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white mb-4 leading-tight">{market.title}</h3>
          <div className="flex items-center justify-center gap-4 text-sm font-bold text-white font-[family-name:var(--font-jetbrains-mono)] uppercase">
            <span className="flex-1 text-right truncate">{market.homeTeam}</span>
            <span className="text-[#38bdf8] bg-[#38bdf8]/10 border border-[#38bdf8]/20 px-3 py-1 rounded text-lg shrink-0">
              {market.homeScore ?? '-'} : {market.awayScore ?? '-'}
            </span>
            <span className="flex-1 text-left truncate">{market.awayTeam}</span>
          </div>
        </div>
      ) : (
        <h3 className="text-lg font-bold text-white mb-6 leading-tight">
          {market.title}
        </h3>
      )}

      {/* AI agent panel */}
      <div className="bg-[#0a1628] border border-[rgba(255,255,255,0.06)] p-4 rounded-[6px] mb-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[9px] uppercase tracking-widest text-gray-400">
            AI AGENT {market.agentId}
          </span>
          <span className="text-[12px] uppercase tracking-widest font-bold text-white">
            PREDICTS <span className="text-[#38bdf8]">{market.agentPick}</span>
          </span>
        </div>
        <ConfidenceBar confidence={market.confidence} label="Confidence" />
        
        {market.keyFactors && market.keyFactors.length > 0 && (
          <div className="flex flex-col gap-1.5 border-t border-[rgba(255,255,255,0.06)] pt-3 mt-1">
            {market.keyFactors.slice(0, 3).map((factor, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-[#38bdf8] mt-1.5 flex-none shadow-[0_0_5px_rgba(56,189,248,0.5)]"></span>
                <span className="text-[10px] text-gray-400 leading-tight">
                  {factor}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PoolBar */}
      <div className="mb-6">
        <PoolBar followPool={market.followPool} fadePool={market.fadePool} />
      </div>

      {/* Action Buttons */}
      <div className="mt-auto grid grid-cols-2 gap-3">
        <button
          onClick={onFollow}
          className="bg-[#34d399] text-[#020817] p-3 font-[family-name:var(--font-jetbrains-mono)] text-[11px] uppercase tracking-widest font-bold rounded-[4px] hover:shadow-[0_0_15px_rgba(52,211,153,0.3)] transition-all"
        >
          FOLLOW AI
        </button>
        <button
          onClick={onFade}
          className="bg-transparent border border-[#f87171] text-[#f87171] p-3 font-[family-name:var(--font-jetbrains-mono)] text-[11px] uppercase tracking-widest font-bold rounded-[4px] hover:bg-[#f87171]/10 transition-all"
        >
          FADE AI
        </button>
      </div>
    </GlassCard>
  );
}
