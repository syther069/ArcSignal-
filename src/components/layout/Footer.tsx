import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, Activity } from 'lucide-react';
import Logo from '@/components/ui/Logo';

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
    <footer className="relative isolate w-full overflow-hidden rounded-t-2xl border-t border-[#403947] bg-[#171419] font-[family-name:var(--font-inter)] text-[#f1eef4]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ddb7ff]/60 to-transparent" />
      <div className="max-w-7xl mx-auto px-6 py-10 sm:px-8 sm:py-12 lg:px-12">
        <div className="grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 space-y-5 sm:col-span-3 lg:col-span-1">
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/" aria-label="ArcSignal home" className="flex min-h-11 items-center gap-2.5 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ddb7ff]">
                <Logo width={30} height={30} />
                <span className="text-xl font-bold tracking-tight font-[family-name:var(--font-hanken)]">ArcSignal</span>
              </Link>
              <span className="text-[10px] font-semibold uppercase tracking-widest bg-[#ddb7ff]/10 border border-[#ddb7ff]/20 text-[#ddb7ff] px-2 py-1 rounded-md">
                TESTNET
              </span>
            </div>
            <p className="max-w-sm text-sm leading-6 text-[#b0abb5]">
              Experimental AI-generated prediction markets on Arc Testnet. Follow or fade each recorded prediction with testnet USDC.
            </p>
            <div>
              <Link href="/status" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#403947] bg-[#ddb7ff]/5 px-3 text-xs font-medium text-[#ddb7ff] transition-colors duration-150 hover:border-[#ddb7ff]/50 hover:bg-[#ddb7ff]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ddb7ff] motion-reduce:transition-none">
                <Activity size={14} aria-hidden="true" />
                Check system status
              </Link>
            </div>
          </div>

          {/* Link columns */}
          {footerLinks.map((col) => (
            <nav key={col.title} aria-label={`Footer ${col.title.toLowerCase()}`}>
              <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ddb7ff]">
                {col.title}
              </h2>
              <ul>
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      target={link.href.startsWith('https://') ? '_blank' : undefined}
                      rel={link.href.startsWith('https://') ? 'noopener noreferrer' : undefined}
                      aria-label={link.href.startsWith('https://') ? `${link.label} (opens in a new tab)` : link.label}
                      className="group inline-flex min-h-11 items-center gap-2 rounded-md text-sm text-[#b0abb5] transition-colors duration-150 hover:text-[#ddb7ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ddb7ff] motion-reduce:transition-none"
                    >
                      {link.label}
                      {link.href.startsWith('https://') && <ArrowUpRight size={13} aria-hidden="true" className="shrink-0 text-[#b0abb5] group-hover:text-[#ddb7ff]" />}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-9 flex flex-col items-start justify-between gap-3 border-t border-[#403947]/70 pt-5 text-xs text-[#b0abb5] sm:mt-10 sm:flex-row sm:items-center">
          <span>Experimental Arc Testnet software</span>
          <div className="flex items-center gap-6">
            <span className="font-[family-name:var(--font-jetbrains-mono)] tabular-nums">
              Chain ID: 5042002
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
