'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAccount, useBalance } from 'wagmi';
import { USDC_ADDRESS } from '@/lib/usdc';
import ConnectWalletButton from '../wallet/ConnectWalletButton';

export default function Navbar() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const { data: usdcBalance } = useBalance({
    address,
    token: USDC_ADDRESS,
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Dashboard', href: '/' },
    { name: 'Markets', href: '/markets' },
    { name: 'Feed', href: '/feed' },
    { name: 'Leaderboard', href: '/leaderboard' },
    { name: 'Analytics', href: '/analytics' },
    { name: 'Profile', href: '/profile' },
  ];

  return (
    <nav className="fixed top-0 w-full z-50 bg-[rgba(2,8,23,0.9)] backdrop-blur border-b border-[rgba(255,255,255,0.06)]">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left: Logo & Badge */}
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-black text-white tracking-tighter italic">
              ARCSIGNAL
            </Link>
            <div className="hidden sm:flex px-2 py-0.5 bg-[#fbbf24]/10 border border-[#fbbf24]/30 rounded">
              <span className="text-[#fbbf24] text-[10px] font-[family-name:var(--font-jetbrains-mono)] font-bold tracking-widest">
                ARC TESTNET
              </span>
            </div>
          </div>

          {/* Center: Desktop Nav Links */}
          <div className="hidden md:flex space-x-8">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`text-[11px] font-[family-name:var(--font-jetbrains-mono)] font-bold tracking-[0.08em] uppercase transition-colors ${
                    isActive
                      ? 'text-[#38bdf8] border-b-2 border-[#38bdf8] pb-1 -mb-1'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* Right: Balance & Connect */}
          <div className="hidden md:flex items-center gap-4">
            {isConnected && (
              <div className="px-3 py-1.5 bg-[#0f1f38] border border-white/10 rounded">
                <span className="text-[11px] font-[family-name:var(--font-jetbrains-mono)] font-bold text-white">
                  {usdcBalance ? Number(usdcBalance.formatted).toFixed(2) : '0.00'} USDC
                </span>
              </div>
            )}
            <ConnectWalletButton />
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-400 hover:text-white focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#020817] border-b border-white/5 pb-4">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-[11px] font-[family-name:var(--font-jetbrains-mono)] font-bold tracking-widest uppercase ${
                    isActive
                      ? 'text-[#38bdf8] bg-[#38bdf8]/10'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>
          <div className="px-5 pt-4 border-t border-white/5 flex flex-col gap-4">
            {isConnected && (
              <div className="px-3 py-2 bg-[#0f1f38] border border-white/10 rounded inline-block text-center">
                <span className="text-[11px] font-[family-name:var(--font-jetbrains-mono)] font-bold text-white">
                  {usdcBalance ? Number(usdcBalance.formatted).toFixed(2) : '0.00'} USDC
                </span>
              </div>
            )}
            <div className="w-full flex justify-center">
              <ConnectWalletButton />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
