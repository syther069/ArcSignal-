'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAccount, useReadContract } from 'wagmi';
import { useDebounce } from '@/hooks/useDebounce';
import { USDC_ADDRESS, USDC_ABI } from '@/lib/usdc';
import { formatUnits } from 'viem';
import ConnectWalletButton from '../wallet/ConnectWalletButton';
import Logo from '../ui/Logo';
import { Search, Layout, Bell, Settings, Menu, X } from 'lucide-react';
import { useUnclaimedWinnings } from '@/hooks/useUnclaimedWinnings';
import { ARCSIGNAL_ABI, ARCSIGNAL_ADDRESS } from '@/lib/contracts';

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

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Markets',   href: '/markets' },
    { name: 'Portfolio', href: '/portfolio' },
    { name: 'Analytics', href: '/analytics' },
    { name: 'Profile',   href: '/profile' },
    { name: 'Docs',      href: '/docs' },
  ];

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500);

  const { data: searchAddressResult, isFetching: isSearching } = useReadContract({
    address: ARCSIGNAL_ADDRESS,
    abi: ARCSIGNAL_ABI,
    functionName: 'getAddressByUsername',
    args: debouncedSearch ? [debouncedSearch] : undefined,
    query: { enabled: debouncedSearch.length > 0 },
  });

  const searchAddress = searchAddressResult as string | undefined;
  const hasResult = searchAddress && searchAddress !== '0x0000000000000000000000000000000000000000';

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
              placeholder="Search user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 bg-[#0f172a] border border-[#1e293b] rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-[#ddb7ff]/50 text-[#e5e2e1] placeholder:text-[#94a3b8] transition-colors"
            />
            {debouncedSearch.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-[#0f172a] border border-[#1e293b] rounded-lg shadow-xl p-2 z-50">
                {isSearching ? (
                  <div className="text-xs text-[#94a3b8] p-2">Searching...</div>
                ) : hasResult ? (
                  <button
                    onClick={() => {
                      router.push(`/profile/${searchAddress}`);
                      setSearchQuery('');
                    }}
                    className="w-full text-left p-2 hover:bg-[#1e293b] rounded-md transition-colors flex items-center gap-2"
                  >
                    <div className="w-6 h-6 rounded-full bg-[#ddb7ff]/20 text-[#ddb7ff] flex items-center justify-center text-[10px] font-bold">
                      {searchAddress.slice(2,4).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm text-[#e5e2e1]">{debouncedSearch}</p>
                      <p className="text-xs text-[#94a3b8] font-[family-name:var(--font-jetbrains-mono)]">
                        {searchAddress.slice(0,6)}...{searchAddress.slice(-4)}
                      </p>
                    </div>
                  </button>
                ) : (
                  <div className="text-xs text-[#94a3b8] p-2">No user found</div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 text-[#94a3b8]">
            <button className="hover:text-[#e5e2e1] transition-colors">
              <Layout className="w-5 h-5" />
            </button>
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
