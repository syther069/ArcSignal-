'use client';

import React from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { StatCard } from '@/components/ui/StatCard';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
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
  };
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0a1628] border border-white/10 p-3 shadow-xl rounded font-mono text-xs">
        <p className="text-slate-400 mb-1">{label}</p>
        <p className="text-[#38bdf8] font-bold">
          {payload[0].name === 'volume' || payload[0].name === 'value' 
            ? `$${payload[0].value.toLocaleString()}` 
            : `${payload[0].value}%`}
        </p>
      </div>
    );
  }
  return null;
};

export default function AnalyticsClient({
  agentWinRates,
  volumeData,
  ratioData,
  topMarketsData,
  stats
}: AnalyticsClientProps) {

  return (
    <div className="flex min-h-screen bg-[#101416]">
      <Sidebar />

      <main className="flex-1 lg:ml-[264px] pt-24 px-8 pb-16 overflow-y-auto min-h-screen">
        {/* Header Section */}
        <div className="mb-12">
          <h1 className="text-[32px] font-black tracking-tight text-[#38bdf8] mb-1 italic flex items-center gap-3">
            <span className="material-symbols-outlined text-[32px]">query_stats</span>
            NETWORK ANALYTICS
          </h1>
          <p className="font-mono text-sm text-slate-400">
            Platform-wide metrics, agent performance, and liquidity flows.
          </p>
        </div>

        {/* Stat Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="TOTAL VOLUME"
            value={`$${(stats.totalVolume / 1000).toFixed(1)}K`}
            change="+14.2%"
            changePositive={true}
          />
          <StatCard
            label="TOTAL STAKES"
            value={stats.totalStakes.toLocaleString()}
            change="+82 today"
            changePositive={true}
          />
          <StatCard
            label="ACTIVE MARKETS"
            value={stats.activeMarkets.toString()}
            change="Stable"
            changePositive={true}
          />
          <StatCard
            label="AVG AGENT CONFIDENCE"
            value={`${stats.avgConfidence}%`}
            change="+1.2%"
            changePositive={true}
          />
        </div>

        {/* Charts 2x2 Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          
          {/* Chart 1: Staking Volume Over Time */}
          <div className="glass-card p-6 bg-[#0f1f38] border-white/5">
            <h3 className="font-mono text-sm font-bold text-slate-300 mb-6 tracking-widest uppercase">
              Staking Volume (7D)
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={volumeData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }} />
                  <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }} tickFormatter={(val) => `$${val/1000}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="volume" stroke="#38bdf8" strokeWidth={3} dot={{ r: 4, fill: '#0f1f38', stroke: '#38bdf8', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#38bdf8' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Follow vs Fade Ratio */}
          <div className="glass-card p-6 bg-[#0f1f38] border-white/5">
            <h3 className="font-mono text-sm font-bold text-slate-300 mb-6 tracking-widest uppercase">
              Global Pool Ratio
            </h3>
            <div className="h-[300px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ratioData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {ratioData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontFamily: 'monospace', fontSize: '12px', color: '#94a3b8' }} />
                </PieChart>
              </ResponsiveContainer>
              {/* Center Text overlay */}
              <div className="absolute flex flex-col items-center justify-center pointer-events-none mb-8">
                 <span className="text-white font-bold text-xl">{Math.round((ratioData[0].value / (ratioData[0].value + ratioData[1].value)) * 100)}%</span>
                 <span className="font-mono text-[10px] text-[#34d399] tracking-widest">FOLLOW</span>
              </div>
            </div>
          </div>

          {/* Chart 3: Agent Win Rate by Category */}
          <div className="glass-card p-6 bg-[#0f1f38] border-white/5">
            <h3 className="font-mono text-sm font-bold text-slate-300 mb-6 tracking-widest uppercase">
              Agent Win Rate by Sector
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agentWinRates} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="category" stroke="rgba(255,255,255,0.2)" tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }} />
                  <YAxis stroke="rgba(255,255,255,0.2)" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }} tickFormatter={(val) => `${val}%`} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} content={<CustomTooltip />} />
                  <Bar dataKey="rate" fill="#818cf8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: Top Markets by Volume (Horizontal Bar) */}
          <div className="glass-card p-6 bg-[#0f1f38] border-white/5">
            <h3 className="font-mono text-sm font-bold text-slate-300 mb-6 tracking-widest uppercase">
              Top Markets by Volume
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topMarketsData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" stroke="rgba(255,255,255,0.2)" tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }} tickFormatter={(val) => `$${val/1000}k`} />
                  <YAxis type="category" dataKey="name" stroke="none" tick={{ fill: '#e2e8f0', fontSize: 11, fontWeight: 'bold' }} width={120} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} content={<CustomTooltip />} />
                  <Bar dataKey="volume" fill="#38bdf8" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
