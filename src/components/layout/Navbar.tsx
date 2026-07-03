'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAccount, usePublicClient, useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import ConnectWalletButton from '../wallet/ConnectWalletButton';
import Logo from '../ui/Logo';
import { Search, Layout, Bell, Settings, Menu, X } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: balanceData } = useBalance({ address });
  const usdcBalance = balanceData ? Number(balanceData.formatted).toFixed(2) : '0.00';

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Markets', href: '/markets' },
    { name: 'Portfolio', href: '/portfolio' },
    { name: 'Analytics', href: '/analytics' },
    { name: 'Docs', href: '/docs' },
  ];

  return (
    <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-white/10 shadow-2xl shadow-black/40">
      <div className="flex justify-between items-center h-16 px-6 max-w-[1440px] mx-auto w-full">
        {/* Left Section: Logo & Nav Links */}
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="w-8 h-8 text-primary" />
            <span className="font-sans text-xl font-bold tracking-tight text-on-surface">
              ArcSignal
            </span>
          </Link>
          
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== '/');
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`font-sans text-sm transition-colors ${
                    isActive 
                      ? 'text-primary border-b-2 border-primary py-5' 
                      : 'text-on-surface-variant hover:text-on-surface py-5 border-b-2 border-transparent'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Section: Search, Icons, Wallet */}
        <div className="hidden lg:flex items-center gap-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search markets..." 
              className="w-64 bg-surface-container-high border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-primary/50 text-on-surface placeholder:text-on-surface-variant transition-colors"
            />
          </div>

          <div className="flex items-center gap-4 text-on-surface-variant">
            <button className="hover:text-on-surface transition-colors">
              <Layout className="w-5 h-5" />
            </button>
            <button className="hover:text-on-surface transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <button className="hover:text-on-surface transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            {isConnected && (
              <div className="hidden xl:block bg-surface-container-high px-3 py-1.5 rounded-lg border border-white/10 text-sm font-mono text-on-surface">
                {usdcBalance} USDC
              </div>
            )}
            {/* We will wrap the existing ConnectWalletButton inside a styled div or modify its global class if needed. 
                For now, ConnectWalletButton handles its own styling, but we'll place it here. */}
            <div className="opacity-90 hover:opacity-100 transition-opacity">
               <ConnectWalletButton />
            </div>
          </div>
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="lg:hidden text-on-surface-variant"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-16 left-0 w-full bg-surface-container border-b border-white/10 p-4 shadow-2xl">
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search markets..." 
              className="w-full bg-surface-container-high border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none text-on-surface"
            />
          </div>
          <nav className="flex flex-col gap-2 mb-6">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`p-3 rounded-lg text-sm font-medium ${
                  pathname === link.href || (pathname.startsWith(link.href) && link.href !== '/')
                    ? 'bg-primary/10 text-primary'
                    : 'text-on-surface-variant'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>
          <div className="flex justify-center w-full">
            <ConnectWalletButton />
          </div>
        </div>
      )}
    </header>
  );
}
