'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const mainNav = [
    { name: 'Markets', href: '/markets', icon: 'analytics' },
    { name: 'Activity', href: '/activity', icon: 'query_stats' },
    { name: 'Portfolio', href: '/portfolio', icon: 'account_balance' },
    { name: 'Vaults', href: '/vaults', icon: 'lock' },
    { name: 'Governance', href: '/governance', icon: 'gavel' },
    { name: 'Support', href: '/support', icon: 'help_outline' },
  ];

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-64px)] w-[264px] bg-[#0a1628] border-r border-[rgba(255,255,255,0.06)] flex flex-col p-4 z-40 hidden lg:flex">
      {/* Top: ARC TESTNET Status */}
      <div className="p-3 bg-[#0f1f38] rounded-[6px] border border-white/5 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#34d399] animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)] shrink-0"></div>
          <div>
            <p className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-bold text-[#fbbf24] tracking-widest uppercase leading-tight">ARC TESTNET</p>
            <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] text-gray-400 mt-1 uppercase tracking-wider">Node Active (21ms)</p>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 space-y-1">
        {mainNav.map((item) => {
          const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/');
          
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`flex items-center gap-3 p-3 transition-all group ${
                isActive 
                  ? 'bg-[#38bdf8]/10 text-[#38bdf8] border-l-2 border-[#38bdf8]' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5 border-l-2 border-transparent'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              <span className="font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-bold tracking-[0.1em] uppercase">
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Area */}
      <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
        {/* NEW PREDICTION Button */}
        <button className="w-full bg-[#38bdf8] text-[#020817] p-3 font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-bold tracking-[0.1em] uppercase rounded-[4px] hover:shadow-[0_0_15px_rgba(56,189,248,0.4)] transition-all flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          NEW PREDICTION
        </button>

        {/* Settings & Docs */}
        <div className="space-y-1">
          <Link href="/settings" className="flex items-center gap-3 p-3 text-gray-400 hover:text-white hover:bg-white/5 transition-all rounded-[4px]">
            <span className="material-symbols-outlined text-[20px]">settings</span>
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-bold tracking-[0.1em] uppercase">Settings</span>
          </Link>
          <Link href="/docs" className="flex items-center gap-3 p-3 text-gray-400 hover:text-white hover:bg-white/5 transition-all rounded-[4px]">
            <span className="material-symbols-outlined text-[20px]">description</span>
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-bold tracking-[0.1em] uppercase">Docs</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
