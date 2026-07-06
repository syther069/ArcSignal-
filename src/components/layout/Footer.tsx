'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

const footerLinks = [
  {
    title: 'PROTOCOL',
    links: [
      { label: 'Markets', href: '/markets' },
      { label: 'Leaderboard', href: '/leaderboard' },
      { label: 'Analytics', href: '/analytics' },
    ],
  },
  {
    title: 'RESOURCES',
    links: [
      { label: 'Documentation', href: '#' },
      { label: 'Smart Contracts', href: '#' },
      { label: 'API Reference', href: '#' },
      { label: 'Bug Bounty', href: '#' },
    ],
  },
  {
    title: 'COMMUNITY',
    links: [
      { label: 'Discord', href: '#' },
      { label: 'Twitter / X', href: '#' },
      { label: 'Telegram', href: '#' },
      { label: 'GitHub', href: 'https://github.com/syther069/ArcSignal-' },
    ],
  },
];

export default function Footer() {
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [blockNumber, setBlockNumber] = useState<string | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
    setBlockNumber(Math.floor(Date.now() / 12000).toLocaleString());
  }, []);

  return (
    <footer className="w-full border-t border-white/5 bg-[#060e1e]">
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-xl font-black tracking-tighter text-white italic">
                ARCSIGNAL
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest bg-[#fbbf24]/10 border border-[#fbbf24]/30 text-[#fbbf24] px-1.5 py-0.5 rounded font-mono">
                TESTNET
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed max-w-[220px]">
              AI-powered prediction markets on ARC Network. Follow or fade autonomous agents with real USDC stakes.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">
                Network Online
              </span>
            </div>
          </div>

          {/* Link columns */}
          {footerLinks.map((col) => (
            <div key={col.title}>
              <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-4 font-mono">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-xs text-slate-500 hover:text-[#38bdf8] transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-[10px] text-slate-600 font-mono" suppressHydrationWarning>
          </span>
          <div className="flex items-center gap-6">
            <span className="text-[10px] text-slate-600 font-mono">
              Chain ID: 5042002
            </span>
            <span className="text-[10px] text-slate-600 font-mono" suppressHydrationWarning>
              Block: {blockNumber ?? ''}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
