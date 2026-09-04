'use client';

import { useDeferredValue, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, ArrowRight, CornerDownLeft, FileText, Sparkles } from 'lucide-react';
import type { DocsSearchRecord } from '@/lib/docs-content';

export function openDocsSearch() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('arcsignal:open-docs-search'));
  }
}

const statusBadgeStyles: Record<string, string> = {
  implemented: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  planned: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  testnet: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
  risk: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  reference: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
};

export default function DocsSearch({ records }: { records: DocsSearchRecord[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const handleOpen = useCallback(() => setOpen(true), []);
  const handleClose = useCallback(() => {
    setOpen(false);
    setQuery('');
    setSelectedIndex(0);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if ((event.key === '/' && !isTyping) || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k')) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
      if (event.key === 'Escape') {
        handleClose();
      }
    }

    function onCustomOpen() {
      setOpen(true);
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('arcsignal:open-docs-search', onCustomOpen);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('arcsignal:open-docs-search', onCustomOpen);
    };
  }, [handleClose]);

  useEffect(() => {
    if (open) {
      window.requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const results = useMemo(() => {
    if (!deferredQuery) return records.slice(0, 7);
    return records
      .filter((record) => record.searchText.includes(deferredQuery))
      .slice(0, 9);
  }, [deferredQuery, records]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [deferredQuery]);

  const selectResult = useCallback((href: string) => {
    handleClose();
    router.push(href);
  }, [handleClose, router]);

  // Keyboard navigation within the search dialog
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        selectResult(results[selectedIndex].href);
      }
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement | null;
    if (activeElement) {
      activeElement.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/80 px-4 pt-[10vh] sm:pt-[12vh] backdrop-blur-md animate-in fade-in duration-150"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="docs-search-title"
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/15 bg-[#0e0e14] shadow-2xl shadow-black/80 ring-1 ring-violet-500/20"
      >
        <h2 id="docs-search-title" className="sr-only">Search documentation</h2>

        {/* Input bar */}
        <div className="flex items-center gap-3 border-b border-white/10 px-4 sm:px-5">
          <Search className="h-5 w-5 text-violet-400 shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search docs, contracts, guides, formulas..."
            className="h-14 min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-slate-500 font-sans"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="rounded-md p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
              aria-label="Clear search query"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg border border-white/10 px-2 py-1 text-xs font-mono text-slate-400 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            aria-label="Close search"
          >
            ESC
          </button>
        </div>

        {/* Results list */}
        <div
          ref={listRef}
          className="max-h-[60vh] overflow-y-auto p-2.5 custom-scrollbar"
          role="listbox"
          aria-label="Documentation search results"
        >
          {results.length > 0 ? (
            <div className="space-y-1">
              {!deferredQuery && (
                <div className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-cyan-400" />
                  Quick Navigation
                </div>
              )}
              {results.map((result, idx) => {
                const isSelected = idx === selectedIndex;
                const statusStyle = result.status ? statusBadgeStyles[result.status] : '';

                return (
                  <button
                    key={result.href}
                    data-index={idx}
                    type="button"
                    onClick={() => selectResult(result.href)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`group flex w-full items-start justify-between gap-3 rounded-xl px-4 py-3 text-left transition-all duration-150 ${
                      isSelected
                        ? 'bg-violet-600/15 border border-violet-500/30 text-white shadow-sm'
                        : 'border border-transparent text-slate-300 hover:bg-white/[0.04]'
                    }`}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
                        <span className="font-medium text-sm text-white group-hover:text-cyan-200 transition-colors truncate">
                          {result.title}
                        </span>
                        {result.status && (
                          <span className={`rounded px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider border ${statusStyle}`}>
                            {result.status}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1 leading-relaxed">
                        {result.description}
                      </p>
                    </div>

                    <div className="shrink-0 pt-0.5 flex items-center">
                      {isSelected ? (
                        <div className="flex items-center gap-1 text-xs font-mono text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">
                          <span>Select</span>
                          <CornerDownLeft className="h-3 w-3" />
                        </div>
                      ) : (
                        <ArrowRight className="h-3.5 w-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-semibold text-slate-200">No documentation found for &ldquo;{query}&rdquo;</p>
              <p className="mt-2 text-xs text-slate-500 max-w-sm mx-auto">
                Try searching for concepts like <code className="text-cyan-300 font-mono">follow vs fade</code>, <code className="text-cyan-300 font-mono">claimWinnings</code>, <code className="text-cyan-300 font-mono">contracts</code>, or <code className="text-cyan-300 font-mono">security</code>.
              </p>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between border-t border-white/10 px-4 py-2.5 bg-black/40 font-mono text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5 text-[10px]">↑</kbd>
              <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5 text-[10px]">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5 text-[10px]">↵</kbd>
              Select
            </span>
          </div>
          <span className="text-slate-600">ArcSignal Docs</span>
        </div>
      </div>
    </div>
  );
}

