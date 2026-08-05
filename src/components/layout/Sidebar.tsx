'use client';

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
    <aside className="fixed left-0 top-16 h-[calc(100vh-64px)] w-[240px] bg-[#0c0f17] border-r border-slate-800/80 hidden lg:flex flex-col justify-between py-5 z-40">
      {/* Top Section */}
      <div>
        {/* Brand Header */}
        <div className="px-5 mb-6 flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center shrink-0 overflow-hidden rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <Image src="/logo.png" alt="ArcSignal Logo" width={32} height={32} className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-100 leading-none">
              ArcSignal
            </p>
            <p className="text-[10px] font-mono text-slate-400 mt-1 leading-none">
              Web3 Predictions
            </p>
          </div>
        </div>

        {/* Section Label */}
        <div className="px-5 mb-2">
          <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
            NAVIGATION
          </p>
        </div>

        {/* Navigation list */}
        <nav className="flex flex-col gap-1 px-3">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (pathname.startsWith(item.href) && item.href !== '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-500/10 text-indigo-400 border-l-2 border-indigo-500 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Section */}
      <div className="px-4 space-y-4">
        <Link
          href="/guide"
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 px-3 rounded-lg text-xs font-semibold transition-colors shadow-sm"
        >
          <BookOpen className="w-4 h-4" />
          ArcSignal Guide
        </Link>

        <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
          <Link
            href="/support"
            className="flex items-center gap-2 text-slate-400 hover:text-slate-200 text-xs transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Support</span>
          </Link>
          <div className="flex items-center justify-between text-slate-400 pt-1 text-[10px] font-mono">
            <span>v.4.2.1-stable</span>
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </div>
      </div>
    </aside>
  );
}

