'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export default function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback
    }
  }

  return (
    <div className="group my-6 overflow-hidden rounded-xl border border-white/10 bg-[#07070a]">
      {/* Code Header Bar */}
      <div className="flex min-h-10 items-center justify-between border-b border-white/10 bg-white/[0.02] px-4 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400 font-medium">
          {language || 'code'}
        </span>
        <button
          type="button"
          onClick={copyCode}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[11px] text-slate-400 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          aria-label="Copy code block to clipboard"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-300">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <pre className="overflow-x-auto p-4 font-[family-name:var(--font-jetbrains-mono)] text-[13px] leading-relaxed text-slate-200 custom-scrollbar">
        <code>{code}</code>
      </pre>
    </div>
  );
}


