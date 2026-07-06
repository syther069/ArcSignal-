'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Wallet, ChevronDown, LogOut, AlertTriangle, Loader2, Copy, Check } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import WalletModal from './WalletModal';

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
    return <div className="h-[38px] w-[140px] bg-zinc-900 rounded-lg animate-pulse" />;
  }

  // STATE 2: Connecting
  if (connectStatus === 'pending') {
    return (
      <button 
        disabled
        className="flex items-center gap-2 h-[38px] px-[16px] rounded-lg bg-transparent border border-[#ddb7ff] text-[#ddb7ff] text-[13px] uppercase tracking-wider font-bold opacity-70 cursor-not-allowed"
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
        className="flex items-center gap-2 h-[38px] px-[16px] rounded-lg bg-transparent border border-amber-500 text-amber-500 text-[13px] uppercase tracking-wider font-bold hover:bg-amber-500/10 transition-colors"
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
          className="flex items-center gap-2 h-[38px] px-[16px] rounded-lg bg-[#1c1b1b] border border-[#3a3939] hover:border-[#ddb7ff]/50 transition-colors"
        >
          <div className="w-2 h-2 rounded-full bg-[#4fdbc8] shrink-0" />
          <span className="text-[#e5e2e1] text-[13px] font-medium font-mono">
            {shortAddress}
          </span>
          <ChevronDown size={14} className="text-[#94a3b8]" />
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 top-[46px] w-[260px] bg-[#1c1b1b] border border-[#3a3939] rounded-lg shadow-xl overflow-hidden z-50 flex flex-col">
            {/* Full address (copyable) */}
            <button
              onClick={handleCopyAddress}
              className="flex items-center justify-between p-3 border-b border-[#3a3939] hover:bg-white/5 transition-colors group w-full text-left"
            >
              <span className="text-[#94a3b8] text-xs font-mono truncate flex-1 mr-2">
                {address}
              </span>
              {showCopied
                ? <Check size={14} className="text-[#4fdbc8] shrink-0" />
                : <Copy size={14} className="text-[#94a3b8] group-hover:text-[#e5e2e1] shrink-0 transition-colors" />
              }
            </button>

            {/* Network */}
            <div className="p-3 border-b border-[#3a3939]">
              <span className="text-[#94a3b8] text-[10px] uppercase tracking-wider block mb-1">Network</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#4fdbc8] shrink-0" />
                <span className="text-[#e5e2e1] text-sm font-medium">Arc Testnet</span>
              </div>
            </div>

            {/* Balance */}
            {balance && (
              <div className="p-3 border-b border-[#3a3939]">
                <span className="text-[#94a3b8] text-[10px] uppercase tracking-wider block mb-1">Balance</span>
                <div className="text-[#e5e2e1] text-sm font-medium flex items-center justify-between">
                  <span>{Number(balance.formatted).toFixed(4)} {balance.symbol}</span>
                  <a href="https://faucet.circle.com/" target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-[#ddb7ff] bg-[#ddb7ff]/10 hover:bg-[#ddb7ff]/20 px-2 py-1 rounded transition-colors uppercase font-bold tracking-wider">
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
              className="flex items-center gap-2 p-3 w-full text-left text-[#ffb4ab] hover:bg-[#ffb4ab]/10 transition-colors"
            >
              <LogOut size={16} />
              <span className="text-sm font-medium">Disconnect</span>
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
        className="flex items-center gap-2 h-[38px] px-[16px] rounded-lg bg-[#ddb7ff] text-[#0f172a] text-[13px] font-semibold hover:bg-[#ddb7ff]/90 transition-colors shadow-lg shadow-[#ddb7ff]/10"
      >
        <Wallet size={16} className="text-[#0f172a]" />
        Connect Wallet
      </button>

      <WalletModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}
