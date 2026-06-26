'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';

export default function NetworkSwitcher() {
  const { mounted, isWrongNetwork, switchChain } = useWallet();
  const [dismissed, setDismissed] = useState(false);

  if (!mounted || !isWrongNetwork || dismissed) {
    return null;
  }

  return (
    <div className="w-full bg-[#1a0a00] border-b border-amber-500 py-3 px-4 flex items-center justify-between z-40 relative">
      <div className="flex items-center gap-4 flex-1 justify-center">
        <span className="text-amber-500 font-medium text-sm">
          ⚠ You are on the wrong network. Switch to Arc Testnet to trade.
        </span>
        <button
          onClick={() => switchChain({ chainId: 5042002 })}
          className="bg-amber-500 hover:bg-amber-600 text-[#1a0a00] text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded transition-colors"
        >
          Switch Network
        </button>
      </div>
      <button 
        onClick={() => setDismissed(true)}
        className="text-amber-500/70 hover:text-amber-500 transition-colors shrink-0"
      >
        <X size={18} />
      </button>
    </div>
  );
}
