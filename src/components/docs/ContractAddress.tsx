'use client';

import { useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';

export default function ContractAddress({ label, address }: { label: string; address: string }) {
  const [copied, setCopied] = useState(false);
  const explorerUrl = `https://testnet.arcscan.app/address/${address}`;

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback
    }
  }

  return (
    <div className="my-5 rounded-xl border border-white/10 bg-white/[0.025] p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          {label}
        </span>
        <span className="font-mono text-[10px] uppercase text-cyan-400">ARC Testnet</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1 overflow-x-auto rounded bg-black/40 px-3 py-2 border border-white/5 custom-scrollbar">
          <code className="whitespace-nowrap font-[family-name:var(--font-jetbrains-mono)] text-xs text-cyan-200">
            {address}
          </code>
        </div>

        <button
          type="button"
          onClick={copyAddress}
          className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-slate-400 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 shrink-0"
          aria-label={`Copy ${label} address`}
          title="Copy address"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
        </button>

        <a
          href={explorerUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-slate-400 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 shrink-0"
          aria-label={`View ${label} on ARC Explorer`}
          title="View on ARC Explorer"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}


