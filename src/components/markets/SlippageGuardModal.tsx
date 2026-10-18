'use client';

import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, Settings2, Check, X } from 'lucide-react';

export interface SlippageSettings {
  toleranceBps: number; // e.g. 50 = 0.5%
  maxPriceImpactBps: number;
}

interface SlippageGuardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentToleranceBps: number;
  onSave: (toleranceBps: number) => void;
}

const PRESET_TOLERANCES = [
  { label: '0.1%', bps: 10 },
  { label: '0.5%', bps: 50 },
  { label: '1.0%', bps: 100 },
];

export default function SlippageGuardModal({
  isOpen,
  onClose,
  currentToleranceBps,
  onSave,
}: SlippageGuardModalProps) {
  const [selectedBps, setSelectedBps] = useState<number>(currentToleranceBps);
  const [customInput, setCustomInput] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(
    !PRESET_TOLERANCES.some((p) => p.bps === currentToleranceBps)
  );

  if (!isOpen) return null;

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9.]/g, '');
    setCustomInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0 && num <= 50) {
      setSelectedBps(Math.round(num * 100));
    }
  };

  const handleSave = () => {
    onSave(selectedBps);
    onClose();
  };

  const isHighSlippage = selectedBps > 100; // > 1%

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="slippage-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#16151a] p-6 shadow-2xl text-white">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ddb7ff]/10 text-[#ddb7ff]">
              <Settings2 size={18} />
            </span>
            <div>
              <h3 id="slippage-title" className="text-base font-semibold tracking-tight text-white">
                Slippage & Protection
              </h3>
              <p className="text-xs text-[#94a3b8]">Arc Mainnet Real-Value Trade Guard</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#94a3b8] mb-2">
              Slippage Tolerance
            </label>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_TOLERANCES.map((preset) => {
                const active = !isCustom && selectedBps === preset.bps;
                return (
                  <button
                    key={preset.bps}
                    type="button"
                    onClick={() => {
                      setIsCustom(false);
                      setSelectedBps(preset.bps);
                      setCustomInput('');
                    }}
                    className={`rounded-xl py-2.5 text-xs font-mono font-semibold transition border ${
                      active
                        ? 'border-[#ddb7ff] bg-[#ddb7ff]/15 text-[#ddb7ff] shadow-[0_0_15px_rgba(221,183,255,0.15)]'
                        : 'border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/20 hover:bg-white/[0.06]'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
              <div
                className={`relative flex items-center rounded-xl border px-2 transition ${
                  isCustom
                    ? 'border-[#ddb7ff] bg-[#ddb7ff]/10'
                    : 'border-white/10 bg-white/[0.03]'
                }`}
              >
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Custom"
                  value={customInput}
                  onFocus={() => setIsCustom(true)}
                  onChange={handleCustomChange}
                  className="w-full bg-transparent text-center text-xs font-mono font-semibold text-white outline-none placeholder:text-zinc-500"
                />
                <span className="text-[10px] font-mono text-zinc-400">%</span>
              </div>
            </div>
          </div>

          {isHighSlippage && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-400" />
              <span>
                High slippage tolerance ({selectedBps / 100}%). Your transaction may be front-run or execute at an unfavorable odds ratio.
              </span>
            </div>
          )}

          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs space-y-1.5 text-zinc-400">
            <div className="flex justify-between font-mono text-[11px]">
              <span>Active Tolerance</span>
              <span className="text-white font-semibold">{selectedBps / 100}%</span>
            </div>
            <div className="flex justify-between font-mono text-[11px]">
              <span>Simulated Minimum Output</span>
              <span className="text-emerald-400">Guaranteed onchain</span>
            </div>
            <div className="flex justify-between font-mono text-[11px]">
              <span>Gas Accounting</span>
              <span className="text-zinc-300">Native USDC (18 dec)</span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] py-3 text-xs font-semibold text-zinc-300 hover:bg-white/[0.08] transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#ddb7ff] py-3 text-xs font-bold text-[#1a0e28] hover:bg-[#e7cdff] transition shadow-lg"
          >
            <Check size={14} />
            <span>Apply Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
