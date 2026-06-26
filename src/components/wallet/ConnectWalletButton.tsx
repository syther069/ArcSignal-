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
        className="flex items-center gap-2 h-[38px] px-[16px] rounded-lg bg-transparent border border-[#06b6d4] text-[#06b6d4] text-[13px] uppercase tracking-wider font-bold opacity-70 cursor-not-allowed"
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
          className="flex items-center gap-2 h-[38px] px-[16px] rounded-lg bg-[#141414] border border-[#1f1f1f] hover:border-zinc-700 transition-colors"
        >
          <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
          <span className="text-zinc-300 text-[13px] font-medium font-mono">
            {shortAddress}
          </span>
          <ChevronDown size={14} className="text-zinc-500" />
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 top-[46px] w-[260px] bg-[#141414] border border-[#1f1f1f] rounded-lg shadow-xl overflow-hidden z-50 flex flex-col">
            {/* Full address (copyable) */}
            <button
              onClick={handleCopyAddress}
              className="flex items-center justify-between p-3 border-b border-[#1f1f1f] hover:bg-white/5 transition-colors group w-full text-left"
            >
              <span className="text-zinc-400 text-xs font-mono truncate flex-1 mr-2">
                {address}
              </span>
              {showCopied
                ? <Check size={14} className="text-green-500 shrink-0" />
                : <Copy size={14} className="text-zinc-600 group-hover:text-zinc-300 shrink-0 transition-colors" />
              }
            </button>

            {/* Network */}
            <div className="p-3 border-b border-[#1f1f1f]">
              <span className="text-zinc-500 text-[10px] uppercase tracking-wider block mb-1">Network</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                <span className="text-white text-sm font-medium">Arc Testnet</span>
              </div>
            </div>

            {/* Balance */}
            {balance && (
              <div className="p-3 border-b border-[#1f1f1f]">
                <span className="text-zinc-500 text-[10px] uppercase tracking-wider block mb-1">Balance</span>
                <div className="text-white text-sm font-medium">
                  {Number(balance.formatted).toFixed(4)} {balance.symbol}
                </div>
              </div>
            )}

            {/* Disconnect */}
            <button 
              onClick={() => {
                disconnect();
                setIsDropdownOpen(false);
              }}
              className="flex items-center gap-2 p-3 w-full text-left text-red-500 hover:bg-red-500/10 transition-colors"
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
        className="flex items-center gap-2 h-[38px] px-[16px] rounded-lg bg-transparent border border-[#06b6d4] text-[#06b6d4] text-[13px] uppercase tracking-wider font-bold hover:bg-[#06b6d4] hover:text-white transition-colors group"
      >
        <Wallet size={16} className="group-hover:text-white transition-colors" />
        Connect Wallet
      </button>

      <WalletModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}
