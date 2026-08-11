import React from 'react';

export interface PoolBarProps {
  followPool: number;
  fadePool: number;
  className?: string;
}

export function PoolBar({ followPool, fadePool, className = '' }: PoolBarProps) {
  const total = followPool + fadePool;
  
  // If no pools yet, default to a 50/50 visual split
  const followPercent = total === 0 ? 50 : (followPool / total) * 100;
  const fadePercent = total === 0 ? 50 : (fadePool / total) * 100;

  const formatUSDC = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div className={`w-full flex flex-col gap-2 ${className}`}>
      <div className="flex justify-between items-center text-[11px] font-[family-name:var(--font-jetbrains-mono)] uppercase tracking-[0.08em] text-gray-400">
        <span className="text-[#4fdbc8]">Follow Pool {formatUSDC(followPool)} USDC</span>
        <span className="text-[#f87171]">Fade Pool {formatUSDC(fadePool)} USDC</span>
      </div>
      
      <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-[#262626]">
        <div 
          className="h-full bg-[#4fdbc8] transition-all duration-500 ease-out rounded-l-full"
          style={{ width: `${followPercent}%` }}
        />
        <div 
          className="h-full bg-[#f87171] transition-all duration-500 ease-out rounded-r-full"
          style={{ width: `${fadePercent}%` }}
        />
      </div>
    </div>
  );
}
