'use client';

import { useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';

export default function ContractAddress({ label, address }: { label: string; address: string }) {
  const [copied, setCopied] = useState(false);
  const explorerUrl = `https://testnet.arcscan.app/address/${address}`;

  async function copyAddress() {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="my-4 rounded-xl border border-white/10 bg-white/[0.025] p-4">
      <div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-sm text-cyan-200">{address}</code>
        <button type="button" onClick={copyAddress} className="rounded-md p-2 text-slate-400 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300" aria-label={`Copy ${label} address`}>
          {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
        </button>
        <a href={explorerUrl} target="_blank" rel="noreferrer" className="rounded-md p-2 text-slate-400 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300" aria-label={`View ${label} on ARC Explorer`}>
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

