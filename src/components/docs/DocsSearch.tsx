'use client';

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import type { DocsSearchRecord } from '@/lib/docs-content';

export default function DocsSearch({ records }: { records: DocsSearchRecord[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if ((event.key === '/' && !isTyping) || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k')) {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (open) window.requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const results = useMemo(() => {
    if (!deferredQuery) return records.slice(0, 6);
    return records
      .filter((record) => record.searchText.includes(deferredQuery))
      .slice(0, 8);
  }, [deferredQuery, records]);

  function selectResult(href: string) {
    setOpen(false);
    setQuery('');
    router.push(href);
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="fixed left-6 top-[92px] z-50 hidden w-[232px] items-center gap-2 rounded-lg border border-white/10 bg-[#111116] px-3 py-2.5 text-left text-sm text-slate-500 transition-colors hover:border-white/20 hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 lg:flex" aria-label="Search documentation">
        <Search className="h-4 w-4" aria-hidden="true" />
        <span className="flex-1">Search docs</span>
        <kbd className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">/</kbd>
      </button>

      <button type="button" onClick={() => setOpen(true)} className="fixed right-14 top-3 z-[62] rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 lg:hidden" aria-label="Search documentation">
        <Search className="h-5 w-5" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/75 px-4 pt-[12vh] backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="docs-search-title" className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/15 bg-[#121217] shadow-2xl shadow-black/60">
            <h2 id="docs-search-title" className="sr-only">Search documentation</h2>
            <div className="flex items-center gap-3 border-b border-white/10 px-4">
              <Search className="h-5 w-5 text-violet-300" aria-hidden="true" />
              <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search concepts, guides, or contracts" className="h-14 min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-slate-600" />
              <button type="button" onClick={() => setOpen(false)} className="rounded-md p-2 text-slate-500 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300" aria-label="Close search">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-2" role="listbox" aria-label="Documentation search results">
              {results.length > 0 ? results.map((result) => (
                <button key={result.href} type="button" onClick={() => selectResult(result.href)} className="block w-full rounded-xl px-4 py-3 text-left hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-300" role="option" aria-selected="false">
                  <span className="block text-sm font-semibold text-slate-100">{result.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">{result.description}</span>
                </button>
              )) : (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm font-medium text-slate-300">No documentation found</p>
                  <p className="mt-1 text-xs text-slate-600">Try a broader term such as “claims”, “wallet”, or “API”.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
