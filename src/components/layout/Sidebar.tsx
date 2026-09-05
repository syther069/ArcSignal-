'use client';

import { tradingDesign } from '@/components/layout/TradingDesign';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
    { name: 'Markets', icon: LineChart, href: '/markets' },
    { name: 'Portfolio', icon: Wallet, href: '/portfolio' },
    { name: 'Analytics', icon: BarChart2, href: '/analytics' },
    { name: 'Leaderboard', icon: Trophy, href: '/leaderboard' },
    { name: 'Profile', icon: User, href: '/profile' },
    { name: 'Docs', icon: FileText, href: '/docs' },
  ];

  return (
    <aside className={`${tradingDesign} fixed left-0 top-16 h-[calc(100dvh-64px)] overflow-y-auto w-[264px] bg-[#1c1b1b] border-r border-[#403947] hidden lg:flex flex-col justify-between py-6 z-40 shadow-[4px_0_24px_rgba(0,0,0,0.2)]`}>
      {/* Logo area */}
      <div>
        <div className="px-6 mb-7 flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center shrink-0 overflow-hidden rounded-lg">
            <Image src="/logo.webp" alt="ArcSignal Logo" width={40} height={40} className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="font-[family-name:var(--font-hanken)] text-sm font-bold text-[#f1eef4] leading-none">
              ArcSignal
            </p>
            <p className="text-[13px] text-[#b0abb5] mt-0.5 leading-none">
              Decentralized Predictions
            </p>
          </div>
        </div>

        {/* Nav label */}
        <div className="px-6 mb-3">
          <p className="text-xs font-[family-name:var(--font-inter)] font-semibold text-[#b0abb5]/60 uppercase tracking-wider">
            Overview
          </p>
        </div>

        {/* Nav items */}
        <nav className="flex flex-col gap-1 px-4">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (pathname.startsWith(item.href) && item.href !== '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-[140ms] ${isActive
                    ? 'bg-[#ddb7ff]/10 text-[#ddb7ff]'
                    : 'text-[#b0abb5] hover:bg-[#1c1b1b]/50 hover:text-[#f1eef4]'
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
        <Link href="/guide" className="w-full flex items-center justify-center gap-2 bg-[#ddb7ff] hover:bg-[#ddb7ff]/90 text-[#240b35] py-3 px-4 rounded-lg text-sm font-[family-name:var(--font-inter)] font-semibold transition-colors mb-5 shadow-lg shadow-[#ddb7ff]/10">
          <BookOpen className="w-4 h-4" />
          ArcSignal Guide
        </Link>

        <div className="flex flex-col gap-3">
          <Link
            href="/support"
            className="flex items-center gap-2.5 text-[#b0abb5] hover:text-[#f1eef4] transition-colors text-sm"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="font-[family-name:var(--font-inter)] font-medium">
              Support
            </span>
          </Link>
          <div className="flex items-center justify-between text-[#b0abb5]/60 pt-2 border-t border-[#403947]">
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-[13px]">
              v.4.2.1-stable
            </span>
            <div className="flex items-center gap-3">
              <a href="https://github.com/syther069/ArcSignal-" target="_blank" rel="noreferrer" aria-label="ArcSignal source code" className="hover:text-[#ddb7ff] transition-colors text-[#b0abb5]/60">
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
