'use client';

import React, { useEffect, useState } from 'react';
import { fetchTickerPrices, TickerPrice } from '@/lib/coingecko';
import { fetchLiveMatches, LiveMatch } from '@/lib/apifootball';

export default function LiveTicker() {
  const [prices, setPrices] = useState<TickerPrice[]>([]);
  const [matches, setMatches] = useState<LiveMatch[]>([]);

  useEffect(() => {
    async function updateData() {
      try {
        const [tickerPrices, liveMatches] = await Promise.all([
          fetchTickerPrices(),
          fetchLiveMatches(),
        ]);
        setPrices(tickerPrices);
        setMatches(liveMatches);
      } catch (err) {
        console.error('Error fetching ticker or matches', err);
      }
    }

    updateData();
    const interval = setInterval(updateData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Format currency helpers
  const formatPrice = (val: number) => {
    if (val >= 1000) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(val);
  };

  const tickerItems = (
    <>
      {prices.map((p) => {
        const isPositive = p.change >= 0;
        return (
          <div key={`price-${p.symbol}`} className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-mono">{p.symbol}</span>
            <span className="text-[12px] font-semibold text-slate-100 font-mono">{formatPrice(p.price)}</span>
            <span className={`text-[11px] font-medium font-mono ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isPositive ? '+' : ''}{p.change.toFixed(2)}%
            </span>
          </div>
        );
      })}

      {matches.map((m, idx) => (
        <div key={`match-${idx}`} className="flex items-center gap-2">
          <span className="text-[9px] font-bold bg-rose-500/10 border border-rose-500/30 text-rose-400 px-1 rounded uppercase tracking-wider font-mono">LIVE</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            {m.homeTeam} VS {m.awayTeam}
          </span>
          <span className="text-[12px] font-bold text-slate-100 font-mono">
            {m.homeScore} - {m.awayScore}
          </span>
          <span className="text-[11px] text-cyan-400 animate-pulse font-mono">({m.minute}')</span>
        </div>
      ))}
    </>
  );

  return (
    <div className="fixed top-16 left-0 w-full h-8 bg-[#0a1628] border-b border-white/5 z-40 overflow-hidden flex items-center">
      <div className="animate-marquee whitespace-nowrap flex items-center gap-12 px-6">
        {/* Render twice for infinite seamless scroll */}
        <div className="flex items-center gap-12">
          {tickerItems}
        </div>
        <div className="flex items-center gap-12" aria-hidden="true">
          {tickerItems}
        </div>
      </div>
    </div>
  );
}
