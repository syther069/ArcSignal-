import React from 'react';

export interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  changePositive?: boolean;
}

export function StatCard({
  label,
  value,
  change,
  changePositive = true,
}: StatCardProps) {
  return (
    <div className="bg-[#0f1f38] rounded-[6px] border border-white/10 p-4 flex flex-col gap-1">
      <div className="text-[11px] uppercase text-gray-400 tracking-[0.08em] font-medium">
        {label}
      </div>
      <div className="flex items-baseline gap-2 mt-0.5">
        <div className="text-2xl font-bold text-white font-[family-name:var(--font-jetbrains-mono)] tabular-nums">
          {value}
        </div>
        {change && (
          <div
            className={`text-xs font-medium ${
              changePositive ? 'text-[#34d399]' : 'text-[#f87171]'
            }`}
          >
            {change}
          </div>
        )}
      </div>
    </div>
  );
}
