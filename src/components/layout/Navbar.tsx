'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAccount, useReadContract } from 'wagmi';
import { USDC_ADDRESS, USDC_ABI } from '@/lib/usdc';
import { formatUnits } from 'viem';
import ConnectWalletButton from '../wallet/ConnectWalletButton';
import Logo from '../ui/Logo';
import { Bell, Menu, X, Plus } from 'lucide-react';
import { useUnclaimedWinnings } from '@/hooks/useUnclaimedWinnings';
import { USDC_ADDRESS, USDC_ABI } from '@/lib/usdc';
import toast from 'react-hot-toast';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const unclaimedCount = useUnclaimedWinnings();
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

  const prevBalanceRef = useRef<number | null>(null);
  useEffect(() => {
    const currentBal = parseFloat(usdcBalance);
    if (prevBalanceRef.current !== null && currentBal > prevBalanceRef.current) {
      const diff = currentBal - prevBalanceRef.current;
      if (diff > 0.01) {
        toast.success(`Received ${diff.toFixed(2)} USDC!`);
      }
    }
    prevBalanceRef.current = currentBal;
  }, [usdcBalance]);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Markets',   href: '/markets' },
    { name: 'Portfolio', href: '/portfolio' },
    { name: 'Analytics', href: '/analytics' },
    { name: 'Profile',   href: '/profile' },
    { name: 'Docs',      href: '/docs' },
  ];

  ];

  return (
    <header className="fixed top-0 w-full z-50 bg-[#131313] border-b border-[#1e293b] shadow-2xl shadow-black/40">
      <div className="flex justify-between items-center h-16 px-6 lg:px-8 w-full">
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

        {/* Right: Icons, Wallet */}
        <div className="hidden lg:flex items-center gap-6">

          <div className="flex items-center gap-4 text-[#94a3b8]">
            <Link href="/portfolio" className="relative hover:text-[#e5e2e1] transition-colors">
              <Bell className="w-5 h-5" />
              {unclaimedCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ffb4ab] opacity-60"></span>
                  <span className="relative flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#ffb4ab] text-[#131313] font-bold" style={{ fontSize: '8px' }}>
                    {unclaimedCount > 9 ? '9+' : unclaimedCount}
                  </span>
                </span>
              )}
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {isConnected && (
              <div className="hidden xl:flex items-center gap-2 bg-[#1c1b1b] px-3 py-1.5 rounded-lg border border-[#3a3939]">
                <span className="text-sm font-[family-name:var(--font-jetbrains-mono)] text-[#e5e2e1]">
                  {usdcBalance} USDC
                </span>
                <a 
                  href="https://faucet.circle.com/" 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-5 h-5 rounded-md bg-[#ddb7ff]/10 hover:bg-[#ddb7ff]/20 text-[#ddb7ff] flex items-center justify-center transition-colors border border-[#ddb7ff]/20"
                  title="Get Testnet USDC"
                >
                  <Plus className="w-3.5 h-3.5" />
                </a>
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
