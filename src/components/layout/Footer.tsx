import React from 'react';
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
      { label: 'Documentation', href: '/docs' },
      { label: 'Smart Contracts', href: '/docs' },
      { label: 'Protocol Guide', href: '/guide' },
      { label: 'System Status', href: '/status' },
      { label: 'Bug Bounty', href: 'https://github.com/syther069/ArcSignal-' },
    ],
  },
  {
    title: 'COMMUNITY',
    links: [
      { label: 'GitHub', href: 'https://github.com/syther069/ArcSignal-' },
      { label: 'X', href: 'https://x.com/ArcSignal_' },
      { label: 'Support', href: '/support' },
    ],
  },
];

export default function Footer() {
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
              Experimental AI-generated prediction markets on Arc Testnet. Follow or fade each recorded prediction with testnet USDC.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#fbbf24]"></span>
              <Link href="/status" className="text-[10px] font-mono text-[#fbbf24] uppercase tracking-wider hover:text-white">
                Check system status
              </Link>
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
                      target={link.href.startsWith('https://') ? '_blank' : undefined}
                      rel={link.href.startsWith('https://') ? 'noopener noreferrer' : undefined}
                      aria-label={link.href.startsWith('https://') ? `${link.label} (opens in a new tab)` : link.label}
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
          <span className="text-[10px] text-slate-600 font-mono">Experimental ARC Testnet software</span>
          <div className="flex items-center gap-6">
            <span className="text-[10px] text-slate-600 font-mono">
              Chain ID: 5042002
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
