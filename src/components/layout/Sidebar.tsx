'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LineChart,
  Wallet,
  BarChart2,
  Trophy,
  FileText,
  BookOpen,
  HelpCircle,
  Zap,
  User,
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Markets',     icon: LineChart,  href: '/markets' },
    { name: 'Portfolio',   icon: Wallet,     href: '/portfolio' },
    { name: 'Analytics',   icon: BarChart2,  href: '/analytics' },
    { name: 'Leaderboard', icon: Trophy,     href: '/leaderboard' },
    { name: 'Profile',     icon: User,       href: '/profile' },
    { name: 'Docs',        icon: FileText,   href: '/docs' },
  ];

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-64px)] w-[264px] bg-[#0f172a] hidden lg:flex flex-col justify-between py-6 z-40 shadow-[4px_0_24px_rgba(0,0,0,0.2)]">
      {/* Logo area */}
      <div>
        <div className="px-6 mb-7 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#ddb7ff]/15 border border-[#ddb7ff]/30 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-[#ddb7ff]" />
          </div>
          <div>
            <p className="font-[family-name:var(--font-hanken)] text-sm font-bold text-[#e5e2e1] leading-none">
              ArcSignal
            </p>
            <p className="text-[10px] text-[#94a3b8] mt-0.5 leading-none">
              Decentralized Predictions
            </p>
          </div>
        </div>

        {/* Nav label */}
        <div className="px-6 mb-3">
          <p className="text-xs font-[family-name:var(--font-inter)] font-semibold text-[#94a3b8]/60 uppercase tracking-wider">
            Overview
          </p>
        </div>

        {/* Nav items */}
        <nav className="flex flex-col gap-0.5 px-3">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (pathname.startsWith(item.href) && item.href !== '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
                  isActive
                    ? 'bg-[#ddb7ff]/10 text-[#ddb7ff]'
                    : 'text-[#94a3b8] hover:bg-[#1c1b1b]/50 hover:text-[#e5e2e1]'
                }`}
              >
                <item.icon className="w-[18px] h-[18px] shrink-0" />
                <span className="font-[family-name:var(--font-inter)] text-sm font-medium">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom section */}
      <div className="px-4">
        <Link href="/guide" className="w-full flex items-center justify-center gap-2 bg-[#ddb7ff] hover:bg-[#ddb7ff]/90 text-[#0f172a] py-3 px-4 rounded-lg text-sm font-[family-name:var(--font-inter)] font-semibold transition-colors mb-5 shadow-lg shadow-[#ddb7ff]/10">
          <BookOpen className="w-4 h-4" />
          ArcSignal Guide
        </Link>

        <div className="flex flex-col gap-3">
          <Link
            href="/support"
            className="flex items-center gap-2.5 text-[#94a3b8] hover:text-[#e5e2e1] transition-colors text-sm"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="font-[family-name:var(--font-inter)] font-medium">
              Support
            </span>
          </Link>
          <div className="flex items-center justify-between text-[#94a3b8]/60 pt-2 border-t border-[#1e293b]">
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px]">
              v.4.2.1-stable
            </span>
            <div className="flex items-center gap-3">
              <a href="https://twitter.com" target="_blank" rel="noreferrer" className="hover:text-[#ddb7ff] transition-colors text-[#94a3b8]/60">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
                </svg>
              </a>
              <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-[#ddb7ff] transition-colors text-[#94a3b8]/60">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                </svg>
              </a>
              <div className="w-2 h-2 rounded-full bg-[#4fdbc8] animate-pulse-dot ml-1" />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
