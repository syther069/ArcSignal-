'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { DEFAULT_QUICK_BET, QUICK_BET_OPTIONS, normalizeQuickBet } from '@/lib/market-insight';

const STORAGE_KEY = 'arcsignal.quickBetLimitUsdc';

function readLimit(): number {
  try {
    return normalizeQuickBet(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_QUICK_BET;
  }
}

/**
 * One-tap shortcut: opens the trade dialog pre-set to the AI's side and the
 * user's chosen limit. It never sends anything itself — the wallet still asks
 * for every confirmation.
 */
export function QuickFollowAi({
  aiSideLabel,
  onQuickBet,
}: {
  aiSideLabel: 'YES' | 'NO';
  onQuickBet: (limitUsdc: number) => void;
}) {
  const [limit, setLimit] = useState<number>(DEFAULT_QUICK_BET);
  useEffect(() => setLimit(readLimit()), []);

  function choose(value: number) {
    setLimit(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      /* storage unavailable: the choice just won't persist */
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-[#DDB7FF]/30 bg-[#DDB7FF]/5 p-3">
      <button
        type="button"
        onClick={() => onQuickBet(limit)}
        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#DDB7FF] px-4 text-sm font-bold text-[#240B35] transition hover:bg-[#DDB7FF]/90 active:scale-[0.98]"
      >
        <Sparkles size={16} /> Follow the AI · {limit} USDC on {aiSideLabel}
      </button>
      <div className="flex items-center justify-between gap-2 text-xs text-[#B0ABB5]">
        <span id="quick-bet-limit-label">Max per quick bet</span>
        <div role="radiogroup" aria-labelledby="quick-bet-limit-label" className="flex gap-1">
          {QUICK_BET_OPTIONS.map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={limit === value}
              onClick={() => choose(value)}
              className={`min-h-[32px] rounded-lg border px-2.5 font-mono font-bold ${limit === value ? 'border-[#DDB7FF] bg-[#DDB7FF]/20 text-[#DDB7FF]' : 'border-[#403947] text-[#B0ABB5] hover:text-white'}`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
      <p className="text-[11px] leading-relaxed text-[#B0ABB5]">
        Opens the trade box with this amount filled in. You review the payout and confirm in your wallet. Following the AI can still lose your stake.
      </p>
    </div>
  );
}
