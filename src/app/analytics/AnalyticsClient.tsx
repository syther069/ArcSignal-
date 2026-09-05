'use client';

import { tradingDesign, useTradingMotion } from '@/components/layout/TradingDesign';

import React, { useMemo, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';

interface AnalyticsClientProps {
  agentWinRates: { category: string; rate: number }[];
  volumeData: { date: string; volume: number }[];
  ratioData: { name: string; value: number; color: string }[];
  topMarketsData: { name: string; volume: number }[];
  stats: {
    totalVolume: number;
    avgConfidence: number;
    activeMarkets: number;
    totalStakes: number;
    
    totalStakedUsdc?: number;
    pendingCount?: number;
    totalMarkets?: number;
    aiAccuracy?: number | null;
    resolvedCount?: number;
    followPercent?: number;
    fadePercent?: number;
    cancelledCount?: number;
    averageLiquidity?: number;
    dataAsOf?: string;
    dataSource?: string;
  };
  resolvedMarkets?: any[];
  markets?: any[];
}

const StatCardCustom = React.memo(function StatCardCustom({ title, value, subtext, icon, emptyMsg, accent }: any) {
  const accentColor = accent?.color || '#ddb7ff';
  const accentBg = accent?.bg || 'rgba(221,183,255,0.08)';
  return (
    <div
      className="bg-surface-charcoal border border-border-subtle relative overflow-hidden flex flex-col h-full rounded"
      style={{ borderTop: `2px solid ${accentColor}` }}
    >
      {/* Top accent bar is via borderTop above */}
      <div className="p-5 flex flex-col h-full">
        {/* Header row */}
        <div className="flex items-start justify-between mb-auto">
          <span className="stat-card-title">{title}</span>
          <span
            className="material-symbols-outlined stat-card-icon"
            style={{ color: accentColor, background: accentBg }}
          >
            {icon}
          </span>
        </div>
        {/* Value */}
        <div className="mt-4">
          {value === null || value === undefined || value === '0 USDC' ? (
            <div className="stat-card-empty">{emptyMsg}</div>
          ) : (
            <>
              <div className="stat-card-value" style={{ color: accentColor }}>{value}</div>
              {subtext && <div className="stat-card-subtext">{subtext}</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export default function AnalyticsClient({
  agentWinRates,
  volumeData,
  ratioData,
  topMarketsData,
  stats,
  resolvedMarkets,
  markets
}: AnalyticsClientProps) {
  const animateCharts = useTradingMotion();
  const [range, setRange] = useState<'7d' | '30d' | 'all'>('all');

  const {
    totalStakedUsdc,
    pendingCount,
    totalMarkets,
    aiAccuracy,
    resolvedCount,
    followPercent,
    fadePercent,
  } = useMemo(() => {
    const totalStakedUsdcVal = stats.totalStakedUsdc ?? stats.totalVolume ?? 0;
    const pendingCountVal = stats.pendingCount ?? stats.activeMarkets ?? 0;
    const totalMarketsVal = stats.totalMarkets ?? stats.activeMarkets ?? 0;
    const aiAccuracyVal = stats.aiAccuracy ?? (agentWinRates.length > 0 ? agentWinRates[0].rate : null);
    const resolvedCountVal = stats.resolvedCount ?? 0;
    
    const followVal = ratioData[0]?.value || 0;
    const fadeVal = ratioData[1]?.value || 0;
    const totalRatio = followVal + fadeVal;
    const followPercentVal = stats.followPercent ?? (totalRatio > 0 ? Math.round((followVal / totalRatio) * 100) : 0);
    const fadePercentVal = stats.fadePercent ?? (totalRatio > 0 ? Math.round((fadeVal / totalRatio) * 100) : 0);

    return {
      totalStakedUsdc: totalStakedUsdcVal,
      pendingCount: pendingCountVal,
      totalMarkets: totalMarketsVal,
      aiAccuracy: aiAccuracyVal,
      resolvedCount: resolvedCountVal,
      followPercent: followPercentVal,
      fadePercent: fadePercentVal,
    };
  }, [stats, agentWinRates, ratioData]);

  const rangeStart = useMemo(() => {
    if (range === 'all') return 0;
    const days = range === '7d' ? 7 : 30;
    return Math.floor(Date.now() / 1000) - days * 86_400;
  }, [range]);

  const filteredMarkets = useMemo(
    () => (markets ?? []).filter((market) => rangeStart === 0 || Number(market.resolutionTime ?? 0) >= rangeStart),
    [markets, rangeStart]
  );
  const filteredResolvedMarkets = useMemo(
    () => (resolvedMarkets ?? []).filter((market) => rangeStart === 0 || Number(market.resolutionTime ?? 0) >= rangeStart),
    [resolvedMarkets, rangeStart]
  );
  const rangeStats = useMemo(() => {
    const totalVolume = filteredMarkets.reduce((sum, market) => sum + Number(market.followPool ?? 0) + Number(market.fadePool ?? 0), 0);
    const validResolved = filteredResolvedMarkets.filter((market) => market.outcome === 'FOLLOW' || market.outcome === 'FADE');
    const correct = validResolved.filter((market) => market.outcome === 'FOLLOW').length;
    return {
      totalVolume,
      activeMarkets: filteredMarkets.filter((market) => !market.resolved).length,
      resolvedMarkets: filteredResolvedMarkets.length,
      cancelledMarkets: filteredResolvedMarkets.filter((market) => market.outcome === 'PENDING' || market.outcome === 'CANCELLED').length,
      averageLiquidity: filteredMarkets.length ? totalVolume / filteredMarkets.length : 0,
      accuracy: validResolved.length ? Math.round((correct / validResolved.length) * 100) : null,
    };
  }, [filteredMarkets, filteredResolvedMarkets]);

  const topMarketsByVolume = useMemo(() => {
    if (!filteredMarkets) return [];
    return [...filteredMarkets].sort((a, b) => (Number(b.followPool) + Number(b.fadePool)) - (Number(a.followPool) + Number(a.fadePool)));
  }, [filteredMarkets]);

  return (
    <div data-trading-analytics className={`${tradingDesign} flex min-h-screen bg-[#131313]`}>
      <style dangerouslySetInnerHTML={{ __html: `
        .{
          background-image: linear-gradient(to right, #403947 1px, transparent 1px),
                            linear-gradient(to bottom, #403947 1px, transparent 1px);
          background-size: 24px 24px;
        }
        [data-trading-analytics] .bg-surface-charcoal { background-color: #1c1b1b; }
        [data-trading-analytics] .border-border-subtle { border-color: #403947; }
        [data-trading-analytics] .text-primary { color: #ddb7ff; }
        [data-trading-analytics] .text-tertiary { color: #4fdbc8; }
        [data-trading-analytics] .text-error { color: #ffb4ab; }
        [data-trading-analytics] .text-text-muted { color: #b0abb5; }
        [data-trading-analytics] .font-code-sm { font-family: var(--font-jetbrains-mono), monospace; font-size: 0.875rem; }
        [data-trading-analytics] .font-label-caps { font-family: var(--font-inter), sans-serif; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
        [data-trading-analytics] .font-headline-md { font-family: var(--font-hanken), sans-serif; font-size: 1.125rem; font-weight: 600; }
        [data-trading-analytics] .font-headline-lg { font-family: var(--font-hanken), sans-serif; font-size: 1.5rem; font-weight: 600; }

        /* Stat card system */
        [data-trading-analytics] .stat-card-title {
          font-family: var(--font-inter), sans-serif;
          font-size: 13px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #b0abb5;
        }
        [data-trading-analytics] .stat-card-icon {
          font-size: 16px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 20;
          flex-shrink: 0;
          line-height: 1.3;
          padding: 0;
          text-align: center;
        }
        [data-trading-analytics] .stat-card-value {
          font-family: var(--font-jetbrains-mono), monospace;
          font-size: 28px;
          font-weight: 600;
          letter-spacing: -0.02em;
          line-height: 1.3;
        }
        [data-trading-analytics] .stat-card-subtext {
          font-family: var(--font-inter), sans-serif;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #b0abb5;
          margin-top: 6px;
        }
        [data-trading-analytics] .stat-card-empty {
          font-family: var(--font-jetbrains-mono), monospace;
          font-size: 1.5rem;
          font-weight: 600;
          color: #b0abb5;
          letter-spacing: -0.02em;
        }
      `}} />
      
      <Sidebar />

      <main className="flex-1 lg:ml-[264px] pt-24 pb-28 min-w-0 min-h-screen">
        <div className="max-w-[1440px] mx-auto w-full px-4 lg:px-8">

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-[#f1eef4]">Analytics</h1>
            <p className="mt-1 text-xs text-text-muted">Metrics are based on indexed on-chain activity.</p>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-border-subtle bg-surface-charcoal p-1" aria-label="Analytics time range">
            {([['7d', '7D'], ['30d', '30D'], ['all', 'All time']] as const).map(([value, label]) => (
              <button key={value} onClick={() => setRange(value)} aria-pressed={range === value} className={`min-h-[40px] rounded-full px-4 text-xs font-medium transition-colors ${range === value ? 'bg-[#ddb7ff] text-[#131313]' : 'text-text-muted hover:text-[#f1eef4]'}`}>{label}</button>
            ))}
          </div>
        </div>
        
        {/* Section 1: Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-4 mb-8 min-h-[160px]">
          <StatCardCustom
            title="Total Volume Staked"
            value={rangeStats.totalVolume ? `${rangeStats.totalVolume.toFixed(2)} USDC` : null}
            emptyMsg="—"
            icon="monitoring"
            accent={{ color: '#ddb7ff', bg: 'rgba(221,183,255,0.09)' }}
          />
          <StatCardCustom
            title="Active Markets"
            value={rangeStats.activeMarkets}
            subtext={`of ${filteredMarkets.length} in range`}
            icon="query_stats"
            emptyMsg="—"
            accent={{ color: '#4fdbc8', bg: 'rgba(79,219,200,0.09)' }}
          />
          <StatCardCustom
            title="AI Win Rate"
            value={rangeStats.accuracy !== null ? `${rangeStats.accuracy}%` : null}
            emptyMsg="—"
            icon="psychology"
            accent={{ color: '#f2c66d', bg: 'rgba(242,198,109,0.09)' }}
          />
          <StatCardCustom
            title="Markets Resolved"
            value={rangeStats.resolvedMarkets}
            emptyMsg="—"
            icon="done_all"
            accent={{ color: '#4fdbc8', bg: 'rgba(79,219,200,0.09)' }}
          />
          <StatCardCustom
            title="Cancelled"
            value={rangeStats.cancelledMarkets}
            emptyMsg="0"
            icon="block"
            accent={{ color: '#f2c66d', bg: 'rgba(242,198,109,0.09)' }}
          />
          <StatCardCustom
            title="Avg Liquidity"
            value={`${rangeStats.averageLiquidity.toFixed(2)} USDC`}
            emptyMsg="0 USDC"
            icon="waterfall_chart"
            accent={{ color: '#ddb7ff', bg: 'rgba(221,183,255,0.09)' }}
          />
        </div>

        {/* Section 2: Bento Grid top */}
        <div className="grid grid-cols-12 gap-6 mb-6">
          <div className="col-span-12 lg:col-span-8 bg-surface-charcoal border border-border-subtle p-5 sm:p-6 rounded-xl relative overflow-hidden min-h-[360px] flex flex-col">
            <h3 className="font-headline-lg text-primary mb-6">AI Performance Accuracy</h3>
            <div className="h-[280px] min-w-0 w-full">
              {filteredResolvedMarkets.length === 0 ? (
                <div className="h-full flex items-center justify-center text-text-muted font-code-sm">
                  No resolved markets in this range
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={filteredResolvedMarkets} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="resolutionDate" stroke="#b0abb5" tick={{ fontSize: 12 }} label={{ value: 'Resolution date', position: 'insideBottom', offset: -4, fill: '#b0abb5', fontSize: 10 }} />
                    <YAxis domain={[0, 100]} stroke="#b0abb5" tick={{ fontSize: 12 }} unit="%" />
                    <Tooltip contentStyle={{ backgroundColor: '#1c1b1b', borderColor: '#403947' }} formatter={(value, name) => [`${value ?? '—'}%`, name === 'cryptoAccuracy' ? 'Crypto accuracy' : 'Football accuracy']} />
                    <Line isAnimationActive={animateCharts} animationDuration={250} animationEasing="ease-out" type="monotone" dataKey="cryptoAccuracy" stroke="#ddb7ff" strokeWidth={2} dot={false} />
                    <Line isAnimationActive={animateCharts} animationDuration={250} animationEasing="ease-out" type="monotone" dataKey="footballAccuracy" stroke="#4fdbc8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4 bg-surface-charcoal border border-border-subtle p-5 sm:p-6 rounded-xl flex flex-col items-center min-h-[360px]">
            <h3 className="font-headline-lg text-primary w-full text-left mb-auto">Follow vs Fade</h3>
            {(stats.totalStakes === 0 && !totalStakedUsdc) ? (
              <div className="flex-1 flex items-center justify-center text-text-muted font-code-sm">
                No positions placed yet
              </div>
            ) : (
              <>
                <div className="relative w-48 h-48 my-auto">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <path
                      className="text-[#f3a6c8]"
                      strokeDasharray={`${fadePercent}, 100`}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="text-primary"
                      strokeDasharray={`${followPercent}, 100`}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeDashoffset={-fadePercent}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-code-sm text-3xl text-primary">{followPercent > fadePercent ? followPercent : fadePercent}%</span>
                  </div>
                </div>
                <div className="flex gap-6 w-full justify-center mt-auto font-label-caps">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-primary"></div> FOLLOW {followPercent}%</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#f3a6c8]"></div> FADE {fadePercent}%</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Section 3: Bento Grid bottom */}
        <div className="grid grid-cols-12 gap-6 mb-6">
          <div className="col-span-12 lg:col-span-8 bg-surface-charcoal border border-border-subtle p-5 sm:p-6 rounded-xl min-h-[320px] flex flex-col">
            <h3 className="font-headline-lg text-primary mb-6">Top Markets by Volume</h3>
            <div className="h-[280px] min-w-0 w-full">
              {(filteredMarkets.length === 0 || filteredMarkets.every(m => (Number(m.followPool) + Number(m.fadePool)) === 0)) ? (
                <div className="h-full flex items-center justify-center text-text-muted font-code-sm">
                  No stakes placed yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topMarketsByVolume} layout="vertical" margin={{ left: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey={(m) => m.title?.length > 40 ? m.title.substring(0, 40) + '...' : m.title} width={180} tick={{ fill: '#f1eef4', fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1c1b1b', borderColor: '#403947' }} formatter={(val) => `${val} USDC`} />
                    <Bar isAnimationActive={animateCharts} animationDuration={250} animationEasing="ease-out" dataKey={(m) => m.followPool + m.fadePool} fill="#ddb7ff" radius={[0, 4, 4, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4 bg-surface-charcoal border border-border-subtle p-5 sm:p-6 rounded-xl min-h-[320px] flex flex-col">
            <h3 className="font-headline-lg text-primary mb-6">Recent Resolved</h3>
            <div className="flex flex-col gap-4 flex-1">
              {filteredResolvedMarkets.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-text-muted font-code-sm">
                  No resolved markets yet
                </div>
              ) : (
                filteredResolvedMarkets.slice(0, 5).map((rm, i) => (
                  <div key={i} className="flex justify-between items-center border-b border-border-subtle pb-3 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="font-code-sm text-text-muted">#{i + 1}</span>
                      <Link href={`/market/${rm.marketId}`} className="text-sm truncate w-[140px] hover:text-primary transition-colors" title={rm.title}>{rm.title?.length > 40 ? rm.title.substring(0, 40) + '...' : rm.title}</Link>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-label-caps px-2 py-1 rounded ${rm.outcome === 'FOLLOW' ? 'bg-[#ddb7ff]/10 text-primary' : 'bg-[#4fdbc8]/10 text-tertiary'}`}>
                        {rm.outcome}
                      </span>
                      {rm.aiCorrect ? <span className="text-tertiary material-symbols-outlined text-sm">check_circle</span> : <span className="text-error material-symbols-outlined text-sm">cancel</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Section 4: Market Activity */}
        <div className="col-span-12 bg-surface-charcoal border border-border-subtle p-5 sm:p-6 rounded-xl mt-6">
          <h3 className="font-headline-lg text-primary mb-6">Market Activity</h3>
          {(filteredMarkets.length === 0) ? (
            <div className="w-full py-12 flex items-center justify-center text-text-muted font-code-sm">
              No market activity found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-border-subtle text-text-muted font-label-caps">
                    <th className="py-3 font-normal">Market Title</th>
                    <th className="py-3 font-normal">Category</th>
                    <th className="py-3 font-normal">AI Signal</th>
                    <th className="py-3 font-normal">Total Staked</th>
                    <th className="py-3 font-normal">Outcome</th>
                    <th className="py-3 font-normal">Resolution Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMarkets.map((m, i) => (
                    <tr key={i} className="border-b border-border-subtle/50 last:border-0 text-sm hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 font-medium pr-4"><Link href={`/market/${m.marketId}`} className="hover:text-primary transition-colors">{m.title}</Link></td>
                      <td className="py-4"><span className="bg-[#403947] text-text-muted px-2 py-1 rounded text-xs uppercase tracking-wider">{m.category}</span></td>
                      <td className="py-4 font-code-sm text-primary">{m.aiSignal || 'PENDING'}</td>
                      <td className="py-4 font-code-sm">{(m.followPool + m.fadePool).toLocaleString()} USDC</td>
                      <td className="py-4"><span className="font-label-caps px-2 py-1 bg-[#403947] rounded">{m.outcome || 'PENDING'}</span></td>
                      <td className="py-4 font-code-sm text-text-muted">{m.resolutionDate || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-2 border border-border-subtle bg-surface-charcoal px-4 py-3 text-[13px] font-label-caps text-text-muted md:flex-row md:items-center md:justify-between">
          <span>DATA SOURCE: {stats.dataSource ?? 'ON-CHAIN INDEX'}</span>
          <span>{stats.dataAsOf ? `UPDATED ${new Date(stats.dataAsOf).toLocaleString()}` : 'LIVE DATA'}</span>
        </div>

        {/* Footer */}
        <footer className="mt-12 flex justify-between items-center py-6 border-t border-border-subtle text-xs font-label-caps text-text-muted">
          <div className="flex items-center gap-2">
            NETWORK: ARC TESTNET
            <div className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></div>
            SYNCHRONIZED
          </div>
          <div className="flex gap-4">
            <Link href="/docs" className="hover:text-primary transition-colors">DOCS</Link>
            <Link href="/privacy" className="hover:text-primary transition-colors">PRIVACY</Link>
            <Link href="/terms" className="hover:text-primary transition-colors">TERMS</Link>
          </div>
        </footer>

        </div>
      </main>
    </div>
  );
}
