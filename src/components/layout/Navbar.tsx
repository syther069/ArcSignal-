'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAccount, useReadContract } from 'wagmi';
import { USDC_ADDRESS, USDC_ABI } from '@/lib/usdc';
import { formatUnits } from 'viem';
import ConnectWalletButton from '../wallet/ConnectWalletButton';
import Logo from '../ui/Logo';
import { Search, Layout, Bell, Settings, Menu, X } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const { data: usdcRaw } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
  const usdcBalance =
    usdcRaw != null
      ? Number(formatUnits(usdcRaw as bigint, 6)).toFixed(2)
      : '0.00';

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Markets',   href: '/markets' },
    { name: 'Portfolio', href: '/portfolio' },
    { name: 'Analytics', href: '/analytics' },
    { name: 'Docs',      href: '/docs' },
  ];

  return (
    <header className="fixed top-0 w-full z-50 bg-[#131313] border-b border-[#1e293b] shadow-2xl shadow-black/40">
      <div className="flex justify-between items-center h-16 px-6 max-w-[1440px] mx-auto w-full">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="w-8 h-8 text-[#ddb7ff]" />
            <span className="font-[family-name:var(--font-hanken)] text-xl font-bold tracking-tight text-[#e5e2e1]">
              ArcSignal
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => {
              const isActive =
                pathname === link.href ||
                (pathname.startsWith(link.href) && link.href !== '/');
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`text-sm font-medium transition-colors py-5 border-b-2 ${
                    isActive
                      ? 'text-[#ddb7ff] border-[#ddb7ff]'
                      : 'text-[#94a3b8] hover:text-[#e5e2e1] border-transparent'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Search, Icons, Wallet */}
        <div className="hidden lg:flex items-center gap-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] w-4 h-4" />
            <input
              type="text"
              placeholder="Search markets..."
              className="w-64 bg-[#0f172a] border border-[#1e293b] rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-[#ddb7ff]/50 text-[#e5e2e1] placeholder:text-[#94a3b8] transition-colors"
            />
          </div>

          <div className="flex items-center gap-4 text-[#94a3b8]">
            <button className="hover:text-[#e5e2e1] transition-colors">
              <Layout className="w-5 h-5" />
            </button>
            <button className="hover:text-[#e5e2e1] transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <button className="hover:text-[#e5e2e1] transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            {isConnected && (
              <div className="hidden xl:block bg-[#0f172a] px-3 py-1.5 rounded-lg border border-[#1e293b] text-sm font-[family-name:var(--font-jetbrains-mono)] text-[#e5e2e1]">
                {usdcBalance} USDC
              </div>
            )}
            <div className="opacity-90 hover:opacity-100 transition-opacity">
              <ConnectWalletButton />
            </div>
          </div>
        </div>

        {/* Mobile toggle */}
        <button
          className="lg:hidden text-[#94a3b8] hover:text-[#e5e2e1] transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-16 left-0 w-full bg-[#0f172a] border-b border-[#1e293b] p-4 shadow-2xl">
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] w-4 h-4" />
            <input
              type="text"
              placeholder="Search markets..."
              className="w-full bg-[#131313] border border-[#1e293b] rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none text-[#e5e2e1] placeholder:text-[#94a3b8]"
            />
          </div>
          <nav className="flex flex-col gap-1 mb-6">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`p-3 rounded-lg text-sm font-medium font-[family-name:var(--font-jetbrains-mono)] uppercase tracking-wider ${
                  pathname === link.href ||
                  (pathname.startsWith(link.href) && link.href !== '/')
                    ? 'bg-[#ddb7ff]/10 text-[#ddb7ff]'
                    : 'text-[#94a3b8]'
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
