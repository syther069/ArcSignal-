'use client';

import React, { useEffect, useState } from 'react';
import { fetchTickerPrices, TickerPrice } from '@/lib/coingecko';
import type { LiveMatch } from '@/types';

export default function LiveTicker() {
  const [prices, setPrices] = useState<TickerPrice[]>([]);
  const [matches, setMatches] = useState<LiveMatch[]>([]);

  useEffect(() => {
    async function updateData() {
      try {
        const tickerPrices = await fetchTickerPrices();
        setPrices(tickerPrices);

        try {
          const res = await fetch('/api/football/live');
          if (res.ok) {
            const data = await res.json();
            setMatches(data.matches || []);
          }
        } catch (err) {
          console.warn('Skipping live matches due to error:', err instanceof Error ? err.message : String(err));
        }
      } catch (err) {
        console.error('Error fetching ticker or matches', err);
      }
    }

    updateData();
    const interval = setInterval(updateData, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (val: number) => {
    if (val >= 1000) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(val);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(val);
  };

  const tickerItems = (
    <>
      {prices.map((p) => {
        const isPositive = p.change >= 0;
        return (
          <div key={`price-${p.symbol}`} className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-[#94a3b8] tracking-wider uppercase font-[family-name:var(--font-jetbrains-mono)]">
              {p.symbol}
            </span>
            <span className="text-[12px] font-semibold text-[#e5e2e1] font-[family-name:var(--font-jetbrains-mono)]">
              {formatPrice(p.price)}
            </span>
            <span
              className={`text-[11px] font-medium font-[family-name:var(--font-jetbrains-mono)] ${
                isPositive ? 'text-[#4fdbc8]' : 'text-[#ffb4ab]'
              }`}
            >
              {isPositive ? '+' : ''}
              {p.change.toFixed(2)}%
            </span>
          </div>
        );
      })}

      {matches.map((m, idx) => (
        <div key={`match-${idx}`} className="flex items-center gap-2">
          <span className="text-[9px] font-bold bg-[#ffb4ab]/10 border border-[#ffb4ab]/30 text-[#ffb4ab] px-1 rounded uppercase tracking-wider font-[family-name:var(--font-jetbrains-mono)]">
            LIVE
          </span>
          <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider font-[family-name:var(--font-jetbrains-mono)]">
            {m.homeTeam} VS {m.awayTeam}
          </span>
          <span className="text-[12px] font-bold text-[#e5e2e1] font-[family-name:var(--font-jetbrains-mono)]">
            {m.homeScore} - {m.awayScore}
          </span>
          <span className="text-[11px] text-[#4fdbc8] animate-pulse font-[family-name:var(--font-jetbrains-mono)]">
            ({m.minute}')
          </span>
        </div>
      ))}
    </>
  );

  return (
    <div className="fixed top-16 left-0 w-full h-8 bg-[#0e0e0e] border-b border-[#1e293b] z-40 overflow-hidden flex items-center">
      {/* Pinned label */}
      <div className="shrink-0 flex items-center gap-2 px-4 border-r border-[#1e293b] h-full bg-[#0e0e0e] z-10">
        <div className="w-1.5 h-1.5 rounded-full bg-[#ddb7ff] animate-pulse-dot" />
        <span className="text-[10px] font-[family-name:var(--font-jetbrains-mono)] font-bold text-[#ddb7ff] uppercase tracking-widest whitespace-nowrap">
          Live Feeds
        </span>
      </div>

      {/* Scrolling ticker */}
      <div className="animate-marquee whitespace-nowrap flex items-center gap-12 px-6">
        <div className="flex items-center gap-12">{tickerItems}</div>
        <div className="flex items-center gap-12" aria-hidden="true">
          {tickerItems}
        </div>
      </div>
    </div>
  );
}
