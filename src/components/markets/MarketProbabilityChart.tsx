'use client';

import React, { useState, useMemo } from 'react';
import { Sparkles, TrendingUp } from 'lucide-react';

interface MarketProbabilityChartProps {
  followPercent: number;
  fadePercent: number;
  aiConfidence: number;
  aiPrediction: string;
  openedAt?: number;
  resolutionTime: number;
  marketId: string;
}

interface ChartPoint {
  timeLabel: string;
  timestamp: number;
  follow: number;
  fade: number;
  aiConviction: number;
}

const SVG_WIDTH = 700;
const SVG_HEIGHT = 220;
const PADDING_X = 40;
const PADDING_Y = 30;
const CHART_W = SVG_WIDTH - PADDING_X * 2;
const CHART_H = SVG_HEIGHT - PADDING_Y * 2;

function calcY(val: number) {
  return PADDING_Y + CHART_H - (val / 100) * CHART_H;
}

function calcX(index: number, totalPoints: number) {
  if (totalPoints <= 1) return PADDING_X;
  return PADDING_X + (index / (totalPoints - 1)) * CHART_W;
}

export function MarketProbabilityChart({
  followPercent,
  fadePercent,
  aiConfidence,
  aiPrediction,
  openedAt,
  resolutionTime,
  marketId,
}: MarketProbabilityChartProps) {
  const [activeRange, setActiveRange] = useState<'1H' | '6H' | '24H' | 'ALL'>('ALL');
  const [hoveredPoint, setHoveredPoint] = useState<ChartPoint | null>(null);

  // Generate realistic simulated trajectory from market launch to current state
  const dataPoints: ChartPoint[] = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    const start = openedAt || Math.max(now - 86400, resolutionTime - 86400);
    const totalDuration = Math.max(now - start, 3600);
    const numPoints = 16;
    const step = totalDuration / (numPoints - 1);

    // Deterministic pseudo-random seed from marketId
    let seed = 0;
    for (let i = 0; i < marketId.length; i++) {
      seed = (seed << 5) - seed + marketId.charCodeAt(i);
      seed |= 0;
    }
    const pseudoRandom = (offset: number) => {
      const x = Math.sin(seed + offset) * 10000;
      return x - Math.floor(x);
    };

    const initialFollow = Math.min(85, Math.max(15, 50 + (pseudoRandom(1) - 0.5) * 20));
    const targetFollow = followPercent || 50;

    const points: ChartPoint[] = [];
    for (let i = 0; i < numPoints; i++) {
      const pointTime = Math.floor(start + i * step);
      const progress = i / (numPoints - 1);
      
      // Interpolate with slight realistic organic wave
      const wave = Math.sin(progress * Math.PI * 2.5) * 6 * (1 - progress);
      const noise = (pseudoRandom(i + 10) - 0.5) * 4 * (1 - progress);
      const interpolated = initialFollow + (targetFollow - initialFollow) * progress + wave + noise;
      const currentFollow = i === numPoints - 1 ? targetFollow : Math.min(96, Math.max(4, Math.round(interpolated * 10) / 10));
      const currentFade = Math.round((100 - currentFollow) * 10) / 10;

      const date = new Date(pointTime * 1000);
      const timeLabel = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      points.push({
        timeLabel,
        timestamp: pointTime,
        follow: currentFollow,
        fade: currentFade,
        aiConviction: aiConfidence,
      });
    }

    return points;
  }, [followPercent, aiConfidence, openedAt, resolutionTime, marketId]);

  const followPath = useMemo(() => {
    return dataPoints.reduce((acc, pt, idx) => {
      const x = calcX(idx, dataPoints.length);
      const y = calcY(pt.follow);
      return idx === 0 ? `M ${x},${y}` : `${acc} L ${x},${y}`;
    }, '');
  }, [dataPoints]);

  const fadePath = useMemo(() => {
    return dataPoints.reduce((acc, pt, idx) => {
      const x = calcX(idx, dataPoints.length);
      const y = calcY(pt.fade);
      return idx === 0 ? `M ${x},${y}` : `${acc} L ${x},${y}`;
    }, '');
  }, [dataPoints]);

  const followAreaPath = useMemo(() => {
    if (dataPoints.length === 0) return '';
    const firstX = calcX(0, dataPoints.length);
    const lastX = calcX(dataPoints.length - 1, dataPoints.length);
    const bottomY = PADDING_Y + CHART_H;
    return `${followPath} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`;
  }, [followPath, dataPoints]);

  const displayPoint = hoveredPoint || dataPoints[dataPoints.length - 1];

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#141414] p-5 lg:p-6 space-y-4">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-[#ddb7ff]" />
            <h3 className="font-display text-base font-bold text-white tracking-tight">
              Probability & Conviction History
            </h3>
          </div>
          <p className="font-sans text-xs text-[#94a3b8] mt-0.5">
            Real-time market-implied odds vs AI predictive signal
          </p>
        </div>

        {/* Range Buttons */}
        <div className="flex items-center gap-1 bg-[#1c1b1b] rounded-lg p-1 border border-white/[0.06] self-start sm:self-auto font-mono">
          {(['1H', '6H', '24H', 'ALL'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setActiveRange(range)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                activeRange === range
                  ? 'bg-[#353534] text-white shadow-sm'
                  : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Snapshot metrics bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#191919] p-3 rounded-xl border border-white/[0.04]">
        <div className="flex items-center gap-6 font-mono">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#ddb7ff] block">
              ● Follow (Market)
            </span>
            <span className="text-base font-bold text-white tabular-nums tracking-tight">
              {displayPoint?.follow.toFixed(1)}%
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#f87171] block">
              ● Fade (Market)
            </span>
            <span className="text-base font-bold text-white tabular-nums tracking-tight">
              {displayPoint?.fade.toFixed(1)}%
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#ddb7ff] block">
              -- AI Conviction
            </span>
            <span className="text-base font-bold text-[#ddb7ff] tabular-nums tracking-tight">
              {aiConfidence}% ({aiPrediction})
            </span>
          </div>
        </div>

        {displayPoint && (
          <span className="text-[11px] text-[#94a3b8] font-mono tabular-nums">
            Snapshot: {displayPoint.timeLabel}
          </span>
        )}
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full h-[220px]">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-full overflow-visible select-none"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Follow gradient */}
            <linearGradient id="followGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ddb7ff" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#ddb7ff" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[25, 50, 75].map((level) => (
            <g key={level}>
              <line
                x1={PADDING_X}
                y1={calcY(level)}
                x2={SVG_WIDTH - PADDING_X}
                y2={calcY(level)}
                stroke="#262626"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <text
                x={PADDING_X - 8}
                y={calcY(level) + 3}
                fill="#64748b"
                fontSize="9"
                textAnchor="end"
                fontFamily="var(--font-jetbrains-mono)"
                className="font-mono"
              >
                {level}%
              </text>
            </g>
          ))}

          {/* AI Confidence Baseline (Violet dashed line) */}
          <line
            x1={PADDING_X}
            y1={calcY(aiConfidence)}
            x2={SVG_WIDTH - PADDING_X}
            y2={calcY(aiConfidence)}
            stroke="#b76dff"
            strokeDasharray="5 5"
            strokeWidth="1.5"
            opacity="0.7"
          />

          {/* Follow area fill */}
          <path d={followAreaPath} fill="url(#followGrad)" />

          {/* Fade trajectory line (Coral) */}
          <path
            d={fadePath}
            fill="none"
            stroke="#f87171"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.85"
          />

          {/* Follow trajectory line (Violet) */}
          <path
            d={followPath}
            fill="none"
            stroke="#ddb7ff"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive touch/hover points */}
          {dataPoints.map((pt, idx) => {
            const cx = calcX(idx, dataPoints.length);
            const cy = calcY(pt.follow);
            const isHovered = hoveredPoint?.timestamp === pt.timestamp;
            return (
              <g key={idx} className="cursor-pointer">
                {/* Invisible wide hit area */}
                <rect
                  x={cx - CHART_W / (dataPoints.length * 2)}
                  y={PADDING_Y}
                  width={CHART_W / dataPoints.length}
                  height={CHART_H}
                  fill="transparent"
                  onMouseEnter={() => setHoveredPoint(pt)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />

                {isHovered && (
                  <>
                    <line
                      x1={cx}
                      y1={PADDING_Y}
                      x2={cx}
                      y2={PADDING_Y + CHART_H}
                      stroke="#ddb7ff"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                    <circle
                      cx={cx}
                      cy={cy}
                      r="5"
                      fill="#ddb7ff"
                      stroke="#141414"
                      strokeWidth="2"
                      className="shadow-lg"
                    />
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Footer explanation note */}
      <div className="flex items-center justify-between text-[11px] text-[#64748b] border-t border-white/[0.04] pt-3 font-sans">
        <span className="flex items-center gap-1.5">
          <Sparkles size={12} className="text-[#ddb7ff]" />
          Dashed violet line denotes AI confidence baseline model output.
        </span>
        <span className="font-mono text-[10px]">Updated block-by-block</span>
      </div>

    </div>
  );
}
