import React from 'react';

export interface ConfidenceBarProps {
  confidence: number;
  label?: string;
  className?: string;
}

export function ConfidenceBar({ confidence, label, className = '' }: ConfidenceBarProps) {
  const safeConfidence = Math.min(100, Math.max(0, confidence));
  
  let fillClass = '';
  let textClass = '';
  if (safeConfidence > 70) {
    fillClass = 'bg-[#34d399]'; // Green
    textClass = 'text-[#34d399]';
  } else if (safeConfidence >= 50) {
    fillClass = 'bg-[#fbbf24]'; // Yellow
    textClass = 'text-[#fbbf24]';
  } else {
    fillClass = 'bg-[#f87171]'; // Red
    textClass = 'text-[#f87171]';
  }

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      <div className={`flex items-center text-[11px] font-[family-name:var(--font-jetbrains-mono)] uppercase tracking-[0.08em] ${label ? 'justify-between' : 'justify-end'}`}>
        {label && <span className="text-gray-400">{label}</span>}
        <span className={`font-bold ${textClass}`}>{safeConfidence}%</span>
      </div>
      <div className="w-full h-[4px] rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
        <div
          className={`h-full rounded-full ${fillClass} transition-all duration-500 ease-out`}
          style={{ width: `${safeConfidence}%` }}
        />
      </div>
    </div>
  );
}
