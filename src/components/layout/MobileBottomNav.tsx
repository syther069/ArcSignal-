'use client';

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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#0f172a] border-t border-[#1e293b] flex items-center justify-around px-2 py-2 safe-area-inset-bottom">
      {mobileNavItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (pathname.startsWith(item.href) && item.href !== '/');
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-lg transition-colors ${
              isActive
                ? 'text-[#ddb7ff]'
                : 'text-[#94a3b8] hover:text-[#e5e2e1]'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-mono uppercase tracking-wider">
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
