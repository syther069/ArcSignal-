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
    <div className="group my-6 overflow-hidden rounded-xl border border-[#1e293b] bg-[#161616]">
      {/* Code Header Bar */}
      <div className="flex min-h-10 items-center justify-between border-b border-[#1e293b] bg-[#131313] px-4 py-1.5">
        <span className="font-[family-name:var(--font-jetbrains-mono)] text-[11px] uppercase tracking-wider text-[#94a3b8] font-medium">
          {language || 'code'}
        </span>
        <button
          type="button"
          onClick={copyCode}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-[family-name:var(--font-jetbrains-mono)] text-[11px] text-[#94a3b8] transition-colors hover:bg-white/5 hover:text-[#e5e2e1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ddb7ff]"
          aria-label="Copy code block to clipboard"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-[#ddb7ff]" />
              <span className="text-[#ddb7ff]">Copied</span>
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
      <pre className="overflow-x-auto p-4 font-[family-name:var(--font-jetbrains-mono)] text-[13px] leading-relaxed text-[#e5e2e1] custom-scrollbar">
        <code>{code}</code>
      </pre>
    </div>
  );
}


