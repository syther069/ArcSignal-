'use client';

import { tradingDesign } from '@/components/layout/TradingDesign';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LineChart, Wallet, BarChart2, User } from 'lucide-react';

const mobileNavItems = [
  { name: 'Markets',   icon: LineChart,  href: '/markets' },
  { name: 'Portfolio', icon: Wallet,     href: '/portfolio' },
  { name: 'Analytics', icon: BarChart2,  href: '/analytics' },
  { name: 'Profile',   icon: User,       href: '/profile' },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  if (pathname.startsWith('/docs')) return null;

  return (
    <nav className={`${tradingDesign} fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-[#1c1b1b] border-t border-[#403947] flex items-center justify-around px-2 pt-2 pb-[max(8px,env(safe-area-inset-bottom))]`}>
      {mobileNavItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (pathname.startsWith(item.href) && item.href !== '/');
        return (
          <Link
            key={item.name}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={`flex flex-col items-center gap-1 flex-1 min-w-0 px-2 py-1.5 rounded-lg transition-colors ${
              isActive
                ? 'text-[#ddb7ff]'
                : 'text-[#b0abb5] hover:text-[#f1eef4]'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[13px] font-medium">
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
