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
    <div className="bg-[#141414] border border-[#1f1f1f] rounded-[6px] p-4 flex flex-col gap-1">
      <div className="text-[11px] uppercase text-zinc-500 tracking-widest mb-2">
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-bold text-white font-mono">
          {value}
        </div>
        {change && (
          <div
            className={`text-xs font-semibold px-1.5 py-0.5 rounded-sm ${
              changePositive
                ? 'text-[#34d399] bg-[#34d399]/10'
                : 'text-[#f87171] bg-[#f87171]/10'
            }`}
          >
            {change}
          </div>
        )}
      </div>
    </div>
  );
}
