'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  BarChart2, 
  Activity, 
  Wallet, 
  Lock, 
  Scale, 
  HelpCircle, 
  Settings, 
  Plus 
} from 'lucide-react';
import ConnectWalletButton from '../wallet/ConnectWalletButton';

export default function Sidebar() {
  const pathname = usePathname();

  const mainNav = [
    { name: 'Markets', href: '/markets', icon: BarChart2 },
    { name: 'Activity', href: '/activity', icon: Activity },
    { name: 'Portfolio', href: '/portfolio', icon: Wallet },
    { name: 'Vaults', href: '/vaults', icon: Lock },
    { name: 'Governance', href: '/governance', icon: Scale },
    { name: 'Support', href: '/support', icon: HelpCircle },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-[240px] bg-[#0d0d0d] border-r border-[#1f1f1f] flex flex-col z-40 hidden lg:flex">
      {/* Top Section */}
      <div className="p-4 flex flex-col gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 px-2 mt-2">
          <span className="text-white font-bold text-lg tracking-wider">ARCSIGNAL</span>
          <span className="text-amber-500 text-[10px] font-bold px-2 py-0.5 bg-amber-500/10 rounded-full">
            ARC TESTNET
          </span>
        </div>
        
        {/* Network Status Pill */}
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-lg p-[12px] flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] shrink-0"></div>
          <div className="flex flex-col">
            <span className="text-white text-xs font-semibold">Arc Testnet</span>
            <span className="text-zinc-400 text-[10px]">Node Active 21ms</span>
          </div>
        </div>
      </div>

      {/* Navigation Items (middle section) */}
      <nav className="flex-1 py-2 flex flex-col">
        {mainNav.map((item) => {
          const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/');
          const Icon = item.icon;
          
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`flex items-center gap-[12px] h-[44px] px-[16px] group transition-colors ${
                isActive 
                  ? 'border-l-2 border-[#06b6d4] text-[#06b6d4]' 
                  : 'text-zinc-400 hover:bg-[#141414] hover:text-white border-l-2 border-transparent'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-[#06b6d4]' : 'text-zinc-400 group-hover:text-white transition-colors'} />
              <span className="text-[13px] uppercase tracking-widest font-medium">
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="mt-auto pb-4 flex flex-col gap-4">
        {/* Wallet Connect Area */}
        <div className="px-4">
          <ConnectWalletButton />
        </div>

        {/* NEW PREDICTION Button */}
        <div className="px-4">
          <button className="w-full h-[44px] bg-[#06b6d4] hover:bg-[#0891b2] text-white rounded-lg flex items-center justify-center gap-2 transition-colors">
            <Plus size={16} />
            <span className="text-[13px] font-bold uppercase tracking-wider">
              NEW PREDICTION
            </span>
          </button>
        </div>

        {/* Settings Nav Item */}
        <div className="flex flex-col pt-2 border-t border-[#1f1f1f]">
          <Link 
            href="/settings"
            className={`flex items-center gap-[12px] h-[44px] px-[16px] group transition-colors ${
              pathname === '/settings' || (pathname.startsWith('/settings') && pathname !== '/')
                ? 'border-l-2 border-[#06b6d4] text-[#06b6d4]' 
                : 'text-zinc-400 hover:bg-[#141414] hover:text-white border-l-2 border-transparent'
            }`}
          >
            <Settings size={18} className={pathname.startsWith('/settings') && pathname !== '/' ? 'text-[#06b6d4]' : 'text-zinc-400 group-hover:text-white transition-colors'} />
            <span className="text-[13px] uppercase tracking-widest font-medium">
              Settings
            </span>
          </Link>
        </div>
      </div>
    </aside>
  );
}

