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
    return <div className="h-[42px] w-[160px] rounded-full bg-white/5 border border-white/10 animate-pulse" />;
  }

  // STATE 2: Connecting
  if (connectStatus === 'pending') {
    return (
      <button 
        disabled
        className="flex min-h-[42px] items-center justify-center gap-2 rounded-full border border-[#ddb7ff]/30 bg-[#1c1b1b] px-4 py-1.5 text-sm font-semibold text-[#ddb7ff] opacity-80 pointer-events-none transition-all duration-200 shadow-[0_0_15px_rgba(183,109,255,0.15)]"
      >
        <Loader2 size={16} className="animate-spin text-[#ddb7ff]" />
        Connecting...
      </button>
    );
  }

  // STATE 4: Wrong Network
  if (isWrongNetwork) {
    return (
      <button 
        onClick={() => switchChain({ chainId: 5042002 })}
        className="flex min-h-[42px] items-center justify-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-sm font-semibold text-amber-300 transition-all duration-200 hover:bg-amber-500/20 hover:border-amber-400/60 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
      >
        <AlertTriangle size={16} className="text-amber-400" />
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
          className="group flex min-h-[42px] items-center justify-center gap-2 rounded-full border border-[#3a3939] bg-[#1c1b1b] hover:bg-[#252424] hover:border-[#ddb7ff]/40 px-2.5 py-1.5 text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#ddb7ff]/50 focus:ring-offset-2 focus:ring-offset-[#131313] shadow-lg"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <ShieldCheck size={16} />
          </span>
          <span className="pr-1 text-sm font-mono font-bold text-[#e5e2e1] group-hover:text-white transition-colors">
            {shortAddress}
          </span>
          <ChevronDown size={15} className={`text-[#94a3b8] transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-white' : 'group-hover:text-white'}`} />
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 top-[50px] z-50 flex w-[280px] flex-col overflow-hidden rounded-[20px] border border-[#3a3939] bg-[#181818]/95 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(183,109,255,0.1)] text-[#e5e2e1] animate-in fade-in zoom-in-95 duration-150">
            {/* Full address (copyable) */}
            <button
              onClick={handleCopyAddress}
              className="group flex w-full items-center justify-between border-b border-white/[0.08] p-4 text-left transition-colors hover:bg-white/[0.04]"
            >
              <div className="flex flex-col min-w-0 mr-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#94a3b8]">Connected Account</span>
                <span className="truncate font-mono text-xs text-[#cbd5e1] group-hover:text-white transition-colors mt-0.5">
                  {address}
                </span>
              </div>
              {showCopied
                ? <Check size={15} className="shrink-0 text-emerald-400" />
                : <Copy size={15} className="shrink-0 text-[#94a3b8] transition-colors group-hover:text-white" />
              }
            </button>

            {/* Network */}
            <div className="border-b border-white/[0.08] p-4 flex items-center justify-between">
              <div>
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-[#94a3b8]">Network</span>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-sm font-semibold text-white">Arc Testnet</span>
                </div>
              </div>
              <span className="rounded-full bg-white/[0.05] border border-white/[0.08] px-2 py-0.5 font-mono text-[10px] text-[#94a3b8]">5042002</span>
            </div>

            {/* Balance */}
            {balance && (
              <div className="border-b border-white/[0.08] p-4">
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-[#94a3b8]">Native Balance</span>
                <div className="flex items-center justify-between text-sm font-semibold text-white">
                  <span className="font-mono">{Number(balance.formatted).toFixed(4)} {balance.symbol}</span>
                  <a 
                    href="https://faucet.circle.com/" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="rounded-full bg-[#ddb7ff]/15 hover:bg-[#ddb7ff]/25 border border-[#ddb7ff]/30 px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[#ddb7ff] transition-all"
                  >
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
              className="flex w-full items-center gap-2.5 p-4 text-left text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
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
        className="group relative flex min-h-[42px] items-center justify-center gap-2.5 rounded-full border border-white/[0.12] bg-[#1c1b1b] px-2.5 py-1.5 pr-4 text-white transition-all duration-200 hover:bg-[#252424] hover:border-[#ddb7ff]/50 hover:shadow-[0_0_20px_rgba(183,109,255,0.2)] focus:outline-none focus:ring-2 focus:ring-[#ddb7ff]/50 focus:ring-offset-2 focus:ring-offset-[#131313] disabled:pointer-events-none disabled:opacity-50"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ddb7ff]/15 border border-[#ddb7ff]/30 text-[#ddb7ff] group-hover:bg-[#ddb7ff] group-hover:text-[#131313] transition-all duration-200">
          <Logo className="h-4 w-4" />
        </span>
        <span className="text-sm font-bold tracking-tight text-white group-hover:text-[#ddb7ff] transition-colors">
          Connect wallet
        </span>
        <Wallet size={15} className="text-[#ddb7ff] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-white" />
      </button>

      <WalletModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}
