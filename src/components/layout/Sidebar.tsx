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
  HelpCircle
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Markets', icon: LineChart, href: '/markets' },
    { name: 'Portfolio', icon: Wallet, href: '/portfolio' },
    { name: 'Analytics', icon: BarChart2, href: '/analytics' },
    { name: 'Leaderboard', icon: Trophy, href: '/leaderboard' },
    { name: 'Docs', icon: FileText, href: '/docs' },
  ];

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-64px)] w-[264px] bg-background border-r border-white/10 hidden lg:flex flex-col justify-between py-6 z-40">
      <div className="px-4">
        <div className="mb-6 px-4">
          <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-widest mb-1">
            Navigation
          </p>
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/');
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-surface-container-highest text-primary border-l-2 border-primary'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface border-l-2 border-transparent'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="px-6 mb-6">
        <button className="w-full flex items-center justify-center gap-2 bg-surface-container-highest hover:bg-surface-bright text-on-surface py-3 px-4 rounded-lg text-sm font-semibold transition-colors border border-white/5 shadow-sm mb-8">
          <Plus className="w-4 h-4" />
          Create Market
        </button>

        <div className="flex flex-col gap-4">
          <Link href="/support" className="flex items-center gap-3 text-on-surface-variant hover:text-on-surface transition-colors text-sm">
            <HelpCircle className="w-4 h-4" />
            Support
          </Link>
          <div className="flex items-center justify-between text-on-surface-variant text-xs">
            <span>v.4.2.1-stable</span>
            <div className="w-2 h-2 rounded-full bg-tertiary"></div>
          </div>
        </div>
      </div>
    </aside>
  );
}
