'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Wallet, ChevronDown, LogOut, AlertTriangle, Loader2, Copy, Check, ShieldCheck } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import WalletModal from './WalletModal';
import Logo from '@/components/ui/Logo';

export default function ConnectWalletButton() {
  const { 
    mounted,
    address,
    isConnected, 
    isWrongNetwork, 
    shortAddress, 
    balance, 
    disconnect, 
    switchChain,
    connectStatus
  } = useWallet();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    });
  };

  // Skeleton while hydrating
  if (!mounted) {
    return <div className="h-[44px] w-[168px] rounded-full bg-white/10 animate-pulse" />;
  }

  // STATE 2: Connecting
  if (connectStatus === 'pending') {
    return (
      <button 
        disabled
        className="flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-[#E7E2F4] bg-[#F9F6FF] px-4 text-sm font-semibold text-[#4C1D95] opacity-70 pointer-events-none transition-all duration-200"
      >
        <Loader2 size={16} className="animate-spin" />
        Connecting...
      </button>
    );
  }

  // STATE 4: Wrong Network
  if (isWrongNetwork) {
    return (
      <button 
        onClick={() => switchChain({ chainId: 5042002 })}
        className="flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-amber-400/70 bg-amber-50 px-4 text-sm font-semibold text-amber-700 transition-all duration-200 hover:bg-amber-100"
      >
        <AlertTriangle size={16} />
        Wrong Network
      </button>
    );
  }

  // STATE 3: Connected — show dropdown trigger
  if (isConnected && shortAddress) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button 
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-white/70 bg-[#FBFAFC] px-2.5 py-1.5 text-[#111827] transition-all duration-200 hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#ddb7ff]/50 focus:ring-offset-2 focus:ring-offset-[#131313]"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ECF9F2] text-[#139B63]">
            <ShieldCheck size={17} />
          </span>
          <span className="pr-1 text-sm font-bold">
            {shortAddress}
          </span>
          <ChevronDown size={16} className="text-[#71717A]" />
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 top-[52px] z-50 flex w-[276px] flex-col overflow-hidden rounded-[18px] border border-[#E5E3EA] bg-[#FBFAFC] text-[#111827]">
            {/* Full address (copyable) */}
            <button
              onClick={handleCopyAddress}
              className="group flex w-full items-center justify-between border-b border-[#E5E3EA] p-4 text-left transition-colors hover:bg-white"
            >
              <span className="mr-2 flex-1 truncate font-[family-name:var(--font-jetbrains-mono)] text-xs text-[#6B7280]">
                {address}
              </span>
              {showCopied
                ? <Check size={14} className="shrink-0 text-[#139B63]" />
                : <Copy size={14} className="shrink-0 text-[#71717A] transition-colors group-hover:text-[#111827]" />
              }
            </button>

            {/* Network */}
            <div className="border-b border-[#E5E3EA] p-4">
              <span className="mb-1 block font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-wider text-[#71717A]">Network</span>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#139B63]" />
                <span className="text-sm font-semibold text-[#111827]">Arc Testnet</span>
              </div>
            </div>

            {/* Balance */}
            {balance && (
              <div className="border-b border-[#E5E3EA] p-4">
                <span className="mb-1 block font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-wider text-[#71717A]">Balance</span>
                <div className="flex items-center justify-between text-sm font-semibold text-[#111827]">
                  <span>{Number(balance.formatted).toFixed(4)} {balance.symbol}</span>
                  <a href="https://faucet.circle.com/" target="_blank" rel="noreferrer" className="rounded-full bg-[#F2EBFF] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#6D28D9] transition-colors hover:bg-[#E9D5FF]">
                    Get USDC
                  </a>
                </div>
              </div>
            )}

            {/* Disconnect */}
            <button 
              onClick={() => {
                disconnect();
                setIsDropdownOpen(false);
              }}
              className="flex w-full items-center gap-2 p-4 text-left text-[#B42318] transition-colors hover:bg-[#FFF1F0]"
            >
              <LogOut size={16} />
              <span className="text-sm font-semibold">Disconnect</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // STATE 1: Not connected
  return (
    <>
      <button 
        onClick={() => setIsModalOpen(true)}
        className="group flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-white/70 bg-[#FBFAFC] px-2.5 py-1.5 pr-4 text-[#111827] transition-all duration-200 hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#ddb7ff]/50 focus:ring-offset-2 focus:ring-offset-[#131313] disabled:pointer-events-none disabled:opacity-50"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,#F8F1FF,#E6FAF1)] text-[#111827]">
          <Logo className="h-5 w-5" />
        </span>
        <span className="text-sm font-extrabold">Connect wallet</span>
        <Wallet size={15} className="text-[#6D28D9] transition-transform group-hover:translate-x-0.5" />
      </button>

      <WalletModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}
