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
  Plus,
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
        <button className="w-full flex items-center justify-center gap-2 bg-[#ddb7ff] hover:bg-[#ddb7ff]/90 text-[#0f172a] py-3 px-4 rounded-lg text-sm font-[family-name:var(--font-inter)] font-semibold transition-colors mb-5 shadow-lg shadow-[#ddb7ff]/10">
          <Plus className="w-4 h-4" />
          Create Market
        </button>

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
          <div className="flex items-center justify-between text-[#94a3b8]/60">
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px]">
              v.4.2.1-stable
            </span>
            <div className="w-2 h-2 rounded-full bg-[#4fdbc8] animate-pulse-dot" />
          </div>
        </div>
      </div>
    </aside>
  );
}
