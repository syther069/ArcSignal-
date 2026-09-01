'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export default function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="group my-7 overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0d]">
      <div className="flex min-h-10 items-center justify-between border-b border-white/10 px-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">{language || 'text'}</span>
        <button type="button" onClick={copyCode} className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 font-mono text-[10px] uppercase tracking-wide text-slate-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300" aria-label="Copy code">
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-6 text-slate-300"><code>{code}</code></pre>
    </div>
  );
}

