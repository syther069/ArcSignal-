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
        <span>Follow Pool {formatUSDC(followPool)} USDC</span>
        <span>Fade Pool {formatUSDC(fadePool)} USDC</span>
      </div>
      
      <div className="w-full h-7 rounded-[4px] overflow-hidden flex text-[11px] font-bold font-[family-name:var(--font-jetbrains-mono)] text-[#020817]">
        <div 
          className="h-full bg-[#34d399] flex items-center justify-start pl-3 transition-all duration-500 ease-out"
          style={{ width: `${followPercent}%` }}
        >
          {followPercent > 10 && `${Math.round(followPercent)}%`}
        </div>
        <div 
          className="h-full bg-[#f87171] flex items-center justify-end pr-3 transition-all duration-500 ease-out"
          style={{ width: `${fadePercent}%` }}
        >
          {fadePercent > 10 && `${Math.round(fadePercent)}%`}
        </div>
      </div>
    </div>
  );
}
