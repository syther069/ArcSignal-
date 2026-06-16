'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import { Stake, Market } from '@/types';

type FeedFilter = 'ALL' | 'FOOTBALL' | 'CRYPTO' | 'FOLLOW' | 'FADE';

interface FeedClientProps {
  initialStakes: Stake[];
}

export default function FeedClient({ initialStakes }: FeedClientProps) {
  const [filter, setFilter] = useState<FeedFilter>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Filter stakes
  const filteredStakes = useMemo(() => {
    return initialStakes.filter((stake) => {
      // We expect the join to have attached the market data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const market = (stake as any).market as Market | undefined;
      
      if (filter === 'ALL') return true;
      if (filter === 'FOOTBALL') return market?.category === 'football';
      if (filter === 'CRYPTO') return market?.category === 'crypto';
      if (filter === 'FOLLOW') return stake.side === 0;
      if (filter === 'FADE') return stake.side === 1;
      
      return true;
    });
  }, [initialStakes, filter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredStakes.length / itemsPerPage));
  const currentStakes = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStakes.slice(start, start + itemsPerPage);
  }, [filteredStakes, currentPage]);

  const handleFilterChange = (newFilter: FeedFilter) => {
    setFilter(newFilter);
    setCurrentPage(1); // Reset to first page on filter change
  };

  return (
    <div className="flex min-h-screen bg-[#101416]">
      <Sidebar />

      <main className="flex-1 lg:ml-[264px] pt-24 px-8 pb-16 overflow-y-auto min-h-screen">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6">
          <div>
            <h1 className="text-[32px] font-black tracking-tight text-[#38bdf8] mb-1 italic">
              LIVE ACTIVITY FEED
            </h1>
            <p className="font-mono text-sm text-slate-400">
              Real-time platform execution log and oracle verification stream.
            </p>
          </div>
          
          <div className="flex gap-3">
            <div className="bg-white/5 border border-white/10 px-4 py-2 flex items-center gap-3 rounded-md">
              <div className="w-2 h-2 rounded-full bg-[#38bdf8] animate-pulse"></div>
              <span className="font-mono text-xs font-bold tracking-widest text-[#38bdf8]">LIVE FEED</span>
            </div>
            <div className="bg-white/5 border border-white/10 px-4 py-2 flex items-center gap-2 rounded-md">
              <span className="font-mono text-xs text-slate-400 tracking-widest">
                EVENTS: <span className="font-bold text-white">{filteredStakes.length}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mb-6 flex overflow-x-auto custom-scrollbar pb-2">
          <div className="flex bg-[#0f1f38] p-1 rounded-md border border-white/10">
            {(['ALL', 'FOOTBALL', 'CRYPTO', 'FOLLOW', 'FADE'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => handleFilterChange(tab)}
                className={`px-5 py-2 text-[10px] font-bold font-mono tracking-widest rounded transition-all whitespace-nowrap ${
                  filter === tab
                    ? 'bg-[#38bdf8]/20 border border-[#38bdf8]/40 text-[#38bdf8]'
                    : 'bg-transparent border border-transparent text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Activity Log Table */}
        <div className="bg-white/[0.02] border border-white/10 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-[#0a1628]/50">
                  <th className="p-4 font-mono text-[10px] text-slate-400 uppercase tracking-widest whitespace-nowrap">Time</th>
                  <th className="p-4 font-mono text-[10px] text-slate-400 uppercase tracking-widest whitespace-nowrap">Event Type</th>
                  <th className="p-4 font-mono text-[10px] text-slate-400 uppercase tracking-widest">Description</th>
                  <th className="p-4 font-mono text-[10px] text-slate-400 uppercase tracking-widest whitespace-nowrap">AI Pick & Conf</th>
                  <th className="p-4 font-mono text-[10px] text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">Volume (USDC)</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {currentStakes.length > 0 ? (
                  currentStakes.map((stake) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const market = (stake as any).market as Market | undefined;
                    const timeString = new Date(stake.createdAt).toLocaleTimeString([], { hour12: false });
                    const isFollow = stake.side === 0;
                    
                    return (
                      <tr 
                        key={stake.id} 
                        className="border-b border-white/5 hover:border-[#38bdf8]/30 transition-all duration-100 group hover:bg-[#38bdf8]/5"
                      >
                        <td className="p-4 text-slate-500 whitespace-nowrap">
                          {timeString}
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 text-[10px] font-bold tracking-widest border rounded ${
                            isFollow 
                              ? 'bg-[#34d399]/10 text-[#34d399] border-[#34d399]/20' 
                              : 'bg-[#f87171]/10 text-[#f87171] border-[#f87171]/20'
                          }`}>
                            {isFollow ? 'FOLLOW' : 'FADE'}
                          </span>
                        </td>
                        <td className="p-4 text-slate-300 min-w-[250px]">
                          User <span className="text-[#38bdf8] font-bold">{stake.walletAddress.substring(0, 6)}...{stake.walletAddress.slice(-4)}</span> staked on{' '}
                          {market ? (
                            <Link href={`/market/${market.id}`} className="text-white hover:text-[#38bdf8] transition-colors hover:underline">
                              {market.title}
                            </Link>
                          ) : (
                            <span className="italic text-slate-500">Unknown Market</span>
                          )}
                        </td>
                        <td className="p-4 whitespace-nowrap">
                           {market ? (
                             <div className="flex flex-col gap-1">
                               <span className="text-white">{market.agentPick}</span>
                               <span className="text-[#34d399] text-[10px]">{market.confidence}% CONF</span>
                             </div>
                           ) : (
                             <span className="text-slate-500">—</span>
                           )}
                        </td>
                        <td className="p-4 text-right font-bold text-white whitespace-nowrap">
                          ${stake.amountUsdc.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-500 font-mono">
                      No activity found matching these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-white/10 bg-[#0a1628]/30 flex items-center justify-between">
              <span className="font-mono text-xs text-slate-500">
                Showing page {currentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-white/5 border border-white/10 rounded font-mono text-xs text-white hover:bg-white/10 disabled:opacity-30 transition-all"
                >
                  PREV
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
                    // Simple logic to show a few pages around current
                    let pageNum = currentPage;
                    if (currentPage <= 3) pageNum = idx + 1;
                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + idx;
                    else pageNum = currentPage - 2 + idx;
                    
                    if (pageNum < 1 || pageNum > totalPages) return null;
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 flex items-center justify-center rounded border font-mono text-xs transition-all ${
                          currentPage === pageNum
                            ? 'bg-[#38bdf8]/20 border-[#38bdf8]/50 text-[#38bdf8]'
                            : 'bg-transparent border-transparent text-slate-400 hover:bg-white/5'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 bg-white/5 border border-white/10 rounded font-mono text-xs text-white hover:bg-white/10 disabled:opacity-30 transition-all"
                >
                  NEXT
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Terminal Effect Component at bottom */}
        <div className="mt-8 bg-[#0a1628] border border-white/10 p-4 font-mono text-xs rounded-md shadow-[0_0_15px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-2 mb-3 text-slate-500 border-b border-white/5 pb-2">
            <span className="material-symbols-outlined text-[14px]">terminal</span>
            <span className="tracking-widest uppercase text-[9px] font-bold">OPERATOR TERMINAL</span>
          </div>
          <div className="flex gap-2 text-[#38bdf8]">
            <span className="opacity-50">ARCSIGNAL_OS:~$</span>
            <span>tail -f activity_stream.log --filter="live_stakes"</span>
            <span className="inline-block w-2 h-3 bg-[#38bdf8] animate-pulse"></span>
          </div>
        </div>
      </main>
    </div>
  );
}
