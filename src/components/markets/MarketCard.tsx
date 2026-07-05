'use client';

import React from 'react';
import { formatUnits } from 'viem';
import { useReadContract } from 'wagmi';
import { ARCSIGNAL_ABI, ARCSIGNAL_ADDRESS } from '@/lib/contracts';
import type { SerializableMarket } from '@/lib/markets';
import { CountdownTimer } from './CountdownTimer';
import {
  Brain,
  FileText,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export interface MarketCardProps {
  market: SerializableMarket;
  onFollow: () => void;
  onFade: () => void;
}

function toPoolDisplay(value: bigint) {
  return Number(formatUnits(value, 6)).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

function numberToUsdc(value: number) {
  return BigInt(Math.round(value * 1_000_000));
}

export function MarketCard({ market, onFollow, onFade }: MarketCardProps) {
  const { data } = useReadContract({
    address: ARCSIGNAL_ADDRESS,
    abi: ARCSIGNAL_ABI,
    functionName: 'getMarket',
    args: [market.marketId],
    query: {
      enabled:
        /^0x[a-fA-F0-9]{40}$/.test(ARCSIGNAL_ADDRESS) &&
        market.marketId.length > 0,
    },
  });

  const chainMarket = data as { followPool: bigint; fadePool: bigint } | undefined;
  const liveFollowPool = chainMarket?.followPool ?? numberToUsdc(Number(market.followPool));
  const liveFadePool   = chainMarket?.fadePool   ?? numberToUsdc(Number(market.fadePool));
  const totalPool      = liveFollowPool + liveFadePool;
  const followShare    = totalPool > 0n ? Number((liveFollowPool * 100n) / totalPool) : 0;
  const fadeShare      = totalPool > 0n ? Number((liveFadePool * 100n) / totalPool) : 0;

  const probability = market.analysis?.probability ?? market.analysis?.confidence ?? 50;
  const isResolved  = market.resolved;

  const categoryLabels: string[] = market.category === 'FOOTBALL'
    ? ['TACTICAL ANALYSIS', 'FORM & FITNESS', 'HISTORICAL DATA', 'ODDS MOVEMENT']
    : ['ON-CHAIN METRICS', 'ORDER BOOK FLOW', 'SENTIMENT ANALYSIS', 'MACRO FACTORS'];

  // For the prompt requirement: "If analysis is undefined show placeholder"
  const hasAnalysis = !!market.analysis;

  return (
    <article className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-5 md:p-8 flex flex-col gap-8 transition-all duration-150 hover:border-[#ddb7ff]/40">
      
      {/* Top section */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="bg-[#ddb7ff]/10 text-[#ddb7ff] border border-[#ddb7ff]/20 px-2 py-0.5 rounded text-[10px] font-[family-name:var(--font-jetbrains-mono)] font-bold uppercase tracking-wider">
              {market.category}
            </span>
            {!isResolved && (
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#4fdbc8] animate-pulse-dot" />
              </div>
            )}
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-[family-name:var(--font-jetbrains-mono)] font-bold uppercase tracking-wider border ${
              isResolved
                ? 'bg-[#94a3b8]/10 border-[#94a3b8]/20 text-[#94a3b8]'
                : 'bg-[#4fdbc8]/10 border-[#4fdbc8]/20 text-[#4fdbc8]'
            }`}
          >
            {market.outcome ?? (isResolved ? 'RESOLVED' : 'PENDING')}
          </span>
        </div>
        
        <h2 className="font-[family-name:var(--font-hanken)] text-2xl md:text-3xl font-semibold text-white leading-snug">
          {market.question}
        </h2>
        
        <div className="flex flex-wrap items-center gap-6 md:gap-10 pt-2">
          <div className="space-y-1">
            <p className="text-[10px] font-[family-name:var(--font-jetbrains-mono)] text-[#94a3b8] uppercase tracking-wider">AI PREDICTION</p>
            <p className="font-[family-name:var(--font-hanken)] text-xl text-[#4fdbc8] flex items-center gap-2 font-semibold">
              {market.analysis?.prediction?.toUpperCase() || 'YES'}
              <span className="text-[9px] font-[family-name:var(--font-jetbrains-mono)] bg-[#4fdbc8]/10 px-1.5 py-0.5 rounded border border-[#4fdbc8]/20 text-[#4fdbc8]">
                BULLISH
              </span>
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-[family-name:var(--font-jetbrains-mono)] text-[#94a3b8] uppercase tracking-wider">PROBABILITY</p>
            <p className="font-[family-name:var(--font-jetbrains-mono)] text-xl text-white font-semibold">{probability}%</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-[family-name:var(--font-jetbrains-mono)] text-[#94a3b8] uppercase tracking-wider">AI CONFIDENCE</p>
            <p className="font-[family-name:var(--font-jetbrains-mono)] text-xl text-[#ddb7ff] font-semibold">{market.analysis?.confidence ?? 50}%</p>
          </div>
        </div>
      </div>

      {/* AI Analysis section */}
      <div className="space-y-5 border-t border-[#1e293b] pt-6">
        {!hasAnalysis ? (
          <p className="text-sm text-[#94a3b8] italic">AI analysis loading...</p>
        ) : (
          <>
            {market.analysis?.summary && (
              <div className="bg-[#1c1b1b] border border-[#1e293b] p-5 rounded-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Brain className="w-16 h-16" />
                </div>
                <h3 className="text-[10px] font-[family-name:var(--font-jetbrains-mono)] text-[#ddb7ff] uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FileText size={14} /> SUMMARIZE
                </h3>
                <p className="text-sm text-[#94a3b8] leading-relaxed relative z-10">
                  {market.analysis.summary}
                </p>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="bg-[#1c1b1b] p-4 rounded-lg border border-[#1e293b]/50">
                <h3 className="text-[10px] font-[family-name:var(--font-jetbrains-mono)] text-[#4fdbc8] uppercase tracking-wider mb-3 flex items-center gap-2">
                  <TrendingUp size={14} /> BULL CASE
                </h3>
                <p className="text-xs text-[#94a3b8] leading-relaxed">
                  {market.analysis?.bullCase || 'No bull case provided.'}
                </p>
              </div>
              <div className="bg-[#1c1b1b] p-4 rounded-lg border border-[#1e293b]/50">
                <h3 className="text-[10px] font-[family-name:var(--font-jetbrains-mono)] text-[#ffb4ab] uppercase tracking-wider mb-3 flex items-center gap-2">
                  <TrendingDown size={14} /> BEAR CASE
                </h3>
                <p className="text-xs text-[#94a3b8] leading-relaxed">
                  {market.analysis?.bearCase || 'No bear case provided.'}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 pt-2">
              <div>
                <p className="text-[10px] font-[family-name:var(--font-jetbrains-mono)] text-[#ddb7ff] uppercase tracking-wider mb-3">KEY FACTORS</p>
                <ul className="space-y-2 text-xs">
                  {market.analysis?.keyFactors?.map((factor, i) => (
                    <li key={`factor-${i}`} className="flex items-start gap-2 text-[#94a3b8]">
                      <span className="text-[#4fdbc8] mt-0.5 shrink-0">●</span>
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[10px] font-[family-name:var(--font-jetbrains-mono)] text-[#ddb7ff] uppercase tracking-wider mb-3">RISK FACTORS</p>
                <ul className="space-y-2 text-xs">
                  {market.analysis?.riskFactors?.map((risk, i) => (
                    <li key={`risk-${i}`} className="flex items-start gap-2 text-[#94a3b8]">
                      <span className="text-[#ffb4ab] mt-0.5 shrink-0">●</span>
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="border-t border-[#1e293b]/50 pt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="w-full md:w-1/2">
                <div className="flex justify-between items-center mb-1.5">
                  <p className="text-[10px] font-[family-name:var(--font-jetbrains-mono)] text-[#94a3b8] uppercase tracking-wider">MODEL CONFIDENCE</p>
                  <span className="text-[10px] font-[family-name:var(--font-jetbrains-mono)] font-bold text-white">{market.analysis?.confidence ?? 50}%</span>
                </div>
                <div className="h-1.5 w-full bg-[#1e293b] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#ddb7ff] transition-all duration-1000" 
                    style={{ width: `${market.analysis?.confidence ?? 50}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 justify-start md:justify-end">
                {market.analysis?.sources?.map((source, i) => (
                  <span key={`source-${i}`} className="text-[9px] bg-[#1c1b1b] text-[#94a3b8] px-2 py-1 rounded border border-[#1e293b] font-[family-name:var(--font-jetbrains-mono)] uppercase">
                    {source.length > 20 ? source.substring(0, 20) + '...' : source}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Live Pool section */}
      <div className="bg-[#1c1b1b] border border-[#1e293b] p-5 rounded-lg space-y-5">
        <div className="flex justify-between items-center">
          <h3 className="text-[10px] font-[family-name:var(--font-jetbrains-mono)] text-[#94a3b8] uppercase tracking-wider">LIVE POOL</h3>
          <div className="flex gap-4 font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-semibold">
            <span className="text-[#4fdbc8]">FOLLOW {followShare.toFixed(0)}%</span>
            <span className="text-[#ffb4ab]">FADE {fadeShare.toFixed(0)}%</span>
          </div>
        </div>
        
        {totalPool === 0n ? (
          <div className="flex h-2 rounded-full overflow-hidden bg-[#1e293b] items-center justify-center">
            <span className="text-[8px] font-[family-name:var(--font-jetbrains-mono)] text-[#94a3b8]">NO LIQUIDITY</span>
          </div>
        ) : (
          <div className="flex h-2 rounded-full overflow-hidden">
            <div className="h-full bg-[#4fdbc8] transition-all duration-1000" style={{ width: `${followShare}%` }}></div>
            <div className="h-full bg-[#ffb4ab] transition-all duration-1000" style={{ width: `${fadeShare}%` }}></div>
          </div>
        )}
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div>
            <p className="text-[9px] font-[family-name:var(--font-jetbrains-mono)] text-[#94a3b8] uppercase tracking-wider mb-1">FOLLOW POOL</p>
            <p className="font-[family-name:var(--font-jetbrains-mono)] text-sm font-semibold text-white">{toPoolDisplay(liveFollowPool)} USDC</p>
          </div>
          <div>
            <p className="text-[9px] font-[family-name:var(--font-jetbrains-mono)] text-[#94a3b8] uppercase tracking-wider mb-1">FADE POOL</p>
            <p className="font-[family-name:var(--font-jetbrains-mono)] text-sm font-semibold text-white">{toPoolDisplay(liveFadePool)} USDC</p>
          </div>
          <div>
            <p className="text-[9px] font-[family-name:var(--font-jetbrains-mono)] text-[#94a3b8] uppercase tracking-wider mb-1">PARTICIPANTS</p>
            <p className="font-[family-name:var(--font-jetbrains-mono)] text-sm font-semibold text-white">{Math.floor(Number(totalPool) / 1000000)}</p>
          </div>
          <div>
            <p className="text-[9px] font-[family-name:var(--font-jetbrains-mono)] text-[#94a3b8] uppercase tracking-wider mb-1">RESOLUTION</p>
            <p className="font-[family-name:var(--font-jetbrains-mono)] text-sm font-semibold text-white"><CountdownTimer resolutionTime={market.resolutionTime} /></p>
          </div>
        </div>
      </div>

      {/* Execute Trade section */}
      <div className="space-y-4 pt-2">
        {!isResolved ? (
          <>
            <p className="text-[11px] text-[#94a3b8] text-center">
              AI predicts <span className="text-[#4fdbc8] font-bold">{market.analysis?.prediction?.toUpperCase() || 'YES'}</span>. Agree? FOLLOW. Disagree? FADE.
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={onFollow}
                className="group relative flex items-center justify-center gap-2 py-3 bg-transparent border border-[#4fdbc8] text-[#4fdbc8] font-bold text-[11px] font-[family-name:var(--font-jetbrains-mono)] tracking-wider uppercase rounded-lg overflow-hidden transition-all hover:bg-[#4fdbc8] hover:text-[#0f172a] active:scale-[0.98]"
              >
                <CheckCircle2 size={16} className="group-hover:scale-110 transition-transform" />
                FOLLOW AI
              </button>
              <button
                onClick={onFade}
                className="group relative flex items-center justify-center gap-2 py-3 bg-transparent border border-[#ffb4ab] text-[#ffb4ab] font-bold text-[11px] font-[family-name:var(--font-jetbrains-mono)] tracking-wider uppercase rounded-lg overflow-hidden transition-all hover:bg-[#ffb4ab] hover:text-[#0f172a] active:scale-[0.98]"
              >
                <XCircle size={16} className="group-hover:scale-110 transition-transform" />
                FADE AI
              </button>
            </div>
          </>
        ) : (
          <div className="bg-[#1e293b]/50 border border-[#1e293b] py-3 rounded-lg text-center">
            <p className="text-xs text-[#94a3b8] font-[family-name:var(--font-jetbrains-mono)] uppercase tracking-wider font-semibold">
              MARKET RESOLVED: {market.outcome}
            </p>
          </div>
        )}
      </div>

    </article>
  );
}
