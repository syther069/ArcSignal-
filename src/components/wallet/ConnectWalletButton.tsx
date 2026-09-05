'use client';

import { tradingDesign } from '@/components/layout/TradingDesign';

import React, { useState, useRef, useEffect } from 'react';
import { Wallet, ChevronDown, LogOut, AlertTriangle, Loader2, Copy, Check, ShieldCheck } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { arcTestnet } from '@/lib/contracts';
import WalletModal from './WalletModal';
import { useFundUSDCModalLoader } from '@/hooks/useFundUSDCModalLoader';

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
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);
  const { FundUSDCModal, loadFundUSDCModal } = useFundUSDCModalLoader();
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
    return <div className="h-[42px] w-[148px] rounded-full bg-white/5 border border-white/10 animate-pulse" />;
  }

  // STATE 2: Connecting
  if (connectStatus === 'pending') {
    return (
      <button 
        disabled
        className={`${tradingDesign} flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-[#ddb7ff]/30 bg-[#1c1b1b] px-4 py-1.5 text-sm font-semibold text-[#ddb7ff] opacity-80 pointer-events-none transition-all duration-[140ms] shadow-[0_0_15px_rgba(183,109,255,0.15)]`}
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
        onClick={() => switchChain({ chainId: arcTestnet.id })}
        className={`${tradingDesign} flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-[#f2c66d]/40 bg-[#f2c66d]/10 px-4 py-1.5 text-sm font-semibold text-[#f2c66d] transition-all duration-[140ms] hover:bg-[#f2c66d]/20 hover:border-[#f2c66d]/60 shadow-[0_0_15px_rgba(245,158,11,0.1)]`}
      >
        <AlertTriangle size={16} className="text-[#f2c66d]" />
        Wrong Network
      </button>
    );
  }

  // STATE 3: Connected — show dropdown trigger
  if (isConnected && shortAddress) {
    return (
      <>
      <div className={`${tradingDesign} relative`} ref={dropdownRef}>
        <button 
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`${tradingDesign} group flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-[#403947] bg-[#1c1b1b] hover:bg-[#252229] hover:border-[#ddb7ff]/40 px-3 py-1.5 text-[#f1eef4] transition-all duration-[140ms] focus:outline-none focus:ring-2 focus:ring-[#ddb7ff]/50 focus:ring-offset-2 focus:ring-offset-[#131313] shadow-lg`}
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#4fdbc8]/15 border border-[#4fdbc8]/30 text-[#4fdbc8]">
            <ShieldCheck size={14} />
          </span>
          <span className="pr-1 text-sm font-mono font-bold text-[#f1eef4] group-hover:text-[#f1eef4] transition-colors">
            {shortAddress}
          </span>
          <ChevronDown size={15} className={`text-[#b0abb5] transition-transform duration-[140ms] ${isDropdownOpen ? 'rotate-180 text-[#f1eef4]' : 'group-hover:text-[#f1eef4]'}`} />
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 top-[50px] z-50 flex w-[280px] flex-col overflow-hidden rounded-[20px] border border-[#403947] bg-[#252229]/95 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(183,109,255,0.1)] text-[#f1eef4] animate-in fade-in zoom-in-95 duration-[140ms]">
            {/* Full address (copyable) */}
            <button
              onClick={handleCopyAddress}
              className="group flex w-full items-center justify-between border-b border-white/[0.08] p-4 text-left transition-colors hover:bg-white/[0.04]"
            >
              <div className="flex flex-col min-w-0 mr-2">
                <span className="text-[13px] font-mono uppercase tracking-wider text-[#b0abb5]">Connected Account</span>
                <span className="truncate font-mono text-xs text-[#f1eef4] group-hover:text-[#f1eef4] transition-colors mt-0.5">
                  {address}
                </span>
              </div>
              {showCopied
                ? <Check size={15} className="shrink-0 text-[#4fdbc8]" />
                : <Copy size={15} className="shrink-0 text-[#b0abb5] transition-colors group-hover:text-[#f1eef4]" />
              }
            </button>

            {/* Network */}
            <div className="border-b border-white/[0.08] p-4 flex items-center justify-between">
              <div>
                <span className="mb-1 block font-mono text-[13px] uppercase tracking-wider text-[#b0abb5]">Network</span>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4fdbc8] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4fdbc8]"></span>
                  </span>
                  <span className="text-sm font-semibold text-[#f1eef4]">Arc Testnet</span>
                </div>
              </div>
              <span className="rounded-full bg-white/[0.05] border border-white/[0.08] px-2 py-0.5 font-mono text-[13px] text-[#b0abb5]">5042002</span>
            </div>

            {/* Balance */}
            {balance && (
              <div className="border-b border-white/[0.08] p-4">
                <span className="mb-1 block font-mono text-[13px] uppercase tracking-wider text-[#b0abb5]">Native Balance</span>
                <div className="flex items-center justify-between text-sm font-semibold text-[#f1eef4]">
                  <span className="font-mono">{Number(balance.formatted).toFixed(4)} {balance.symbol}</span>
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      void loadFundUSDCModal().then(() => setIsFundModalOpen(true));
                    }}
                    className="rounded-full bg-[#ddb7ff]/15 hover:bg-[#ddb7ff]/25 border border-[#ddb7ff]/30 px-2.5 py-1 text-[13px] font-mono font-bold uppercase tracking-wider text-[#ddb7ff] transition-all"
                  >
                    Get USDC
                  </button>
                </div>
              </div>
            )}

            {/* Disconnect */}
            <button 
              onClick={() => {
                disconnect();
                setIsDropdownOpen(false);
              }}
              className="flex w-full items-center gap-2.5 p-4 text-left text-[#ffb4ab] transition-colors hover:bg-[#ffb4ab]/10 hover:text-[#ffb4ab]"
            >
              <LogOut size={16} />
              <span className="text-sm font-semibold">Disconnect</span>
            </button>
          </div>
        )}
      </div>
      {isFundModalOpen && FundUSDCModal && <FundUSDCModal
        isOpen={isFundModalOpen}
        onClose={() => setIsFundModalOpen(false)}
      />}
      </>
    );
  }

  // STATE 1: Not connected
  return (
    <>
      <button 
        onClick={() => setIsModalOpen(true)}
        className={`${tradingDesign} group relative flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-white/[0.12] bg-[#ddb7ff] px-4 py-2.5 text-[#240b35] transition-all duration-[140ms] hover:bg-[#ddb7ff]/90 hover:border-[#ddb7ff]/50 hover:shadow-[0_0_20px_rgba(183,109,255,0.2)] focus:outline-none focus:ring-2 focus:ring-[#ddb7ff]/50 focus:ring-offset-2 focus:ring-offset-[#131313] disabled:pointer-events-none disabled:opacity-50`}
      >
        <span className="text-sm font-semibold tracking-tight text-[#240b35] transition-colors">
          Connect wallet
        </span>
        <Wallet size={15} className="text-[#240b35] transition-transform duration-[140ms]" />
      </button>

      <WalletModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}
