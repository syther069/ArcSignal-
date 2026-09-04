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
    <div className="my-5 rounded-xl border border-[#1e293b] bg-[#1c1b1b] p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">
          {label}
        </span>
        <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase text-[#ddb7ff]">ARC Testnet</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1 overflow-x-auto rounded bg-[#131313] px-3 py-2 border border-[#1e293b] custom-scrollbar">
          <code className="whitespace-nowrap font-[family-name:var(--font-jetbrains-mono)] text-xs text-[#ddb7ff]">
            {address}
          </code>
        </div>

        <button
          type="button"
          onClick={copyAddress}
          className="rounded-lg border border-[#1e293b] bg-[#131313] p-2 text-[#94a3b8] hover:border-[#3a3939] hover:text-[#e5e2e1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ddb7ff] shrink-0 transition-colors"
          aria-label={`Copy ${label} address`}
          title="Copy address"
        >
          {copied ? <Check className="h-4 w-4 text-[#ddb7ff]" /> : <Copy className="h-4 w-4" />}
        </button>

        <a
          href={explorerUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-[#1e293b] bg-[#131313] p-2 text-[#94a3b8] hover:border-[#3a3939] hover:text-[#e5e2e1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ddb7ff] shrink-0 transition-colors"
          aria-label={`View ${label} on ARC Explorer`}
          title="View on ARC Explorer"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}


