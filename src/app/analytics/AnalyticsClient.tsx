'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWatchContractEvent } from 'wagmi';
import { ARCSIGNAL_ABI, ARCSIGNAL_ADDRESS } from '@/lib/contracts';
import Sidebar from '@/components/layout/Sidebar';
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
    aiAccuracy?: number;
    resolvedCount?: number;
    followPercent?: number;
    fadePercent?: number;
  };
  resolvedMarkets?: any[];
  markets?: any[];
}

const StatCardCustom = ({ title, value, subtext, icon, emptyMsg }: any) => (
  <div className="bg-surface-charcoal border border-border-subtle p-6 relative overflow-hidden flex flex-col h-full rounded">
    <div className="absolute top-4 right-4 opacity-5 text-[64px] material-symbols-outlined pointer-events-none">
      {icon}
    </div>
    <div className="text-text-muted font-headline-md mb-4">{title}</div>
    {value === null || value === undefined || value === 0 || value === '0 USDC' ? (
      <div className="text-text-muted font-code-sm mt-auto">{emptyMsg}</div>
    ) : (
      <div className="mt-auto">
        <div className="text-primary font-code-sm text-3xl mb-1">{value}</div>
        {subtext && <div className="text-text-muted font-label-caps">{subtext}</div>}
      </div>
    )}
  </div>
);

export default function AnalyticsClient({
  agentWinRates,
  volumeData,
  ratioData,
  topMarketsData,
  stats,
  resolvedMarkets,
  markets
}: AnalyticsClientProps) {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 60000);
    return () => clearInterval(interval);
  }, [router]);

  useWatchContractEvent({
    address: ARCSIGNAL_ADDRESS,
    abi: ARCSIGNAL_ABI,
    eventName: 'Staked',
    onLogs() {
      router.refresh();
    },
  });

  const totalStakedUsdc = stats.totalStakedUsdc ?? stats.totalVolume ?? 0;
  const pendingCount = stats.pendingCount ?? stats.activeMarkets ?? 0;
  const totalMarkets = stats.totalMarkets ?? stats.activeMarkets ?? 0;
  const aiAccuracy = stats.aiAccuracy ?? (agentWinRates.length > 0 ? agentWinRates[0].rate : null);
  const resolvedCount = stats.resolvedCount ?? 0;
  
  const followVal = ratioData[0]?.value || 0;
  const fadeVal = ratioData[1]?.value || 0;
  const totalRatio = followVal + fadeVal;
  const followPercent = stats.followPercent ?? (totalRatio > 0 ? Math.round((followVal / totalRatio) * 100) : 0);
  const fadePercent = stats.fadePercent ?? (totalRatio > 0 ? Math.round((fadeVal / totalRatio) * 100) : 0);

  return (
    <div className="flex min-h-screen bg-[#131313]">
      <style dangerouslySetInnerHTML={{ __html: `
        .chart-grid {
          background-image: linear-gradient(to right, #1e293b 1px, transparent 1px),
                            linear-gradient(to bottom, #1e293b 1px, transparent 1px);
          background-size: 24px 24px;
        }
        .bg-surface-charcoal { background-color: #1c1b1b; }
        .border-border-subtle { border-color: #1e293b; }
        .text-primary { color: #ddb7ff; }
        .text-tertiary { color: #4fdbc8; }
        .text-error { color: #ffb4ab; }
        .text-text-muted { color: #94a3b8; }
        .font-code-sm { font-family: var(--font-jetbrains-mono), monospace; font-size: 0.875rem; }
        .font-label-caps { font-family: var(--font-inter), sans-serif; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
        .font-headline-md { font-family: var(--font-hanken), sans-serif; font-size: 1.125rem; font-weight: 700; }
        .font-headline-lg { font-family: var(--font-hanken), sans-serif; font-size: 1.5rem; font-weight: 700; }
      `}} />
      
      <Sidebar />

      <main className="flex-1 lg:ml-[264px] pt-24 pb-16 overflow-y-auto min-h-screen">\n        <div className="max-w-[1440px] mx-auto w-full px-4 lg:px-8">
        
        {/* Section 1: Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 h-[160px]">
          <StatCardCustom 
            title="Total Volume Staked" 
            value={totalStakedUsdc ? `${totalStakedUsdc} USDC` : null} 
            emptyMsg="No stakes yet" 
            icon="monitoring" 
          />
          <StatCardCustom 
            title="Active Markets" 
            value={pendingCount} 
            subtext={`of ${totalMarkets} total`} 
            icon="query_stats" 
            emptyMsg="0" 
          />
          <StatCardCustom 
            title="AI Win Rate" 
            value={aiAccuracy !== null ? `${aiAccuracy}%` : null} 
            emptyMsg="Pending first resolution" 
            icon="psychology" 
          />
          <StatCardCustom 
            title="Markets Resolved" 
            value={resolvedCount} 
            emptyMsg="0" 
            icon="done_all" 
          />
        </div>

        {/* Section 2: Bento Grid top */}
        <div className="grid grid-cols-12 gap-6 mb-6">
          <div className="col-span-12 lg:col-span-8 bg-surface-charcoal border border-border-subtle p-6 rounded relative overflow-hidden chart-grid min-h-[360px] flex flex-col">
            <h3 className="font-headline-lg text-primary mb-6">AI Performance Accuracy</h3>
            <div className="flex-1 w-full">
              {(!resolvedMarkets || resolvedMarkets.length === 0) ? (
                <div className="h-full flex items-center justify-center text-text-muted font-code-sm">
                  Resolving first markets — check back soon
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={resolvedMarkets} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="resolutionDate" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1c1b1b', borderColor: '#1e293b' }} />
                    <Line type="monotone" dataKey="cryptoAccuracy" stroke="#ddb7ff" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="footballAccuracy" stroke="#4fdbc8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4 bg-surface-charcoal border border-border-subtle p-6 rounded flex flex-col items-center min-h-[360px]">
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
                      className="text-tertiary"
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
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-tertiary"></div> FADE {fadePercent}%</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Section 3: Bento Grid bottom */}
        <div className="grid grid-cols-12 gap-6 mb-6">
          <div className="col-span-12 lg:col-span-8 bg-surface-charcoal border border-border-subtle p-6 rounded min-h-[320px] flex flex-col">
            <h3 className="font-headline-lg text-primary mb-6">Top Markets by Volume</h3>
            <div className="flex-1 w-full">
              {(!markets || markets.length === 0 || markets.every(m => (m.followPool + m.fadePool) === 0)) ? (
                <div className="h-full flex items-center justify-center text-text-muted font-code-sm">
                  No stakes placed yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[...markets].sort((a,b)=>(b.followPool+b.fadePool)-(a.followPool+a.fadePool))} layout="vertical" margin={{ left: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey={(m) => m.title?.length > 40 ? m.title.substring(0, 40) + '...' : m.title} width={180} tick={{ fill: '#e5e2e1', fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1c1b1b', borderColor: '#1e293b' }} formatter={(val) => `${val} USDC`} />
                    <Bar dataKey={(m) => m.followPool + m.fadePool} fill="#ddb7ff" radius={[0, 4, 4, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4 bg-surface-charcoal border border-border-subtle p-6 rounded min-h-[320px] flex flex-col">
            <h3 className="font-headline-lg text-primary mb-6">Recent Resolved</h3>
            <div className="flex flex-col gap-4 flex-1">
              {(!resolvedMarkets || resolvedMarkets.length === 0) ? (
                <div className="flex-1 flex items-center justify-center text-text-muted font-code-sm">
                  No resolved markets yet
                </div>
              ) : (
                resolvedMarkets.slice(0, 5).map((rm, i) => (
                  <div key={i} className="flex justify-between items-center border-b border-border-subtle pb-3 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="font-code-sm text-text-muted">#{i + 1}</span>
                      <span className="text-sm truncate w-[140px]" title={rm.title}>{rm.title?.length > 40 ? rm.title.substring(0, 40) + '...' : rm.title}</span>
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
        <div className="col-span-12 bg-surface-charcoal border border-border-subtle p-6 rounded mt-6">
          <h3 className="font-headline-lg text-primary mb-6">Market Activity</h3>
          {(!markets || markets.length === 0) ? (
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
                  {markets.map((m, i) => (
                    <tr key={i} className="border-b border-border-subtle/50 last:border-0 text-sm hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 font-medium pr-4">{m.title}</td>
                      <td className="py-4"><span className="bg-[#1e293b] text-text-muted px-2 py-1 rounded text-xs uppercase tracking-wider">{m.category}</span></td>
                      <td className="py-4 font-code-sm text-primary">{m.aiSignal || 'PENDING'}</td>
                      <td className="py-4 font-code-sm">{(m.followPool + m.fadePool).toLocaleString()} USDC</td>
                      <td className="py-4"><span className="font-label-caps px-2 py-1 bg-[#1e293b] rounded">{m.outcome || 'PENDING'}</span></td>
                      <td className="py-4 font-code-sm text-text-muted">{m.resolutionDate || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-12 flex justify-between items-center py-6 border-t border-border-subtle text-xs font-label-caps text-text-muted">
          <div className="flex items-center gap-2">
            NETWORK: ARC TESTNET
            <div className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></div>
            SYNCHRONIZED
          </div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-primary transition-colors">DOCS</a>
            <a href="#" className="hover:text-primary transition-colors">PRIVACY</a>
            <a href="#" className="hover:text-primary transition-colors">TERMS</a>
          </div>
        </footer>

        </div>
      </main>
    </div>
  );
}
