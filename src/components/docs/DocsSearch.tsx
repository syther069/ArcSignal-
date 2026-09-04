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
  implemented: 'border-white/10 bg-white/5 text-[#e5e2e1]',
  planned: 'border-[#3a3939] bg-[#1c1b1b] text-[#94a3b8]',
  testnet: 'border-[#ddb7ff]/30 bg-[#ddb7ff]/10 text-[#ddb7ff]',
  risk: 'border-[#ddb7ff]/30 bg-[#ddb7ff]/10 text-[#ddb7ff]',
  reference: 'border-white/10 bg-white/5 text-[#94a3b8]',
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
      document.body.style.overflow = 'hidden';
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = '';
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [open]);

  const results = useMemo(() => {
    if (!deferredQuery) return records.slice(0, 7);
    return records
      .filter((record) => record.searchText.includes(deferredQuery))
      .slice(0, 8);
  }, [deferredQuery, records]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [deferredQuery]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const selectedEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, open]);

  const selectResult = useCallback(
    (href: string) => {
      handleClose();
      router.push(href);
    },
    [handleClose, router]
  );

  const handleInputKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((prev) => (results.length === 0 ? 0 : (prev + 1) % results.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((prev) => (results.length === 0 ? 0 : (prev - 1 + results.length) % results.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (results[selectedIndex]) {
        selectResult(results[selectedIndex].href);
      }
    }
  };

  if (!open) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/80 px-4 pt-16 sm:pt-24 backdrop-blur-md transition-all duration-200"
      onClick={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="docs-search-title"
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[#3a3939] bg-[#1c1b1b] shadow-2xl shadow-black/90 font-[family-name:var(--font-inter)]"
      >
        <h2 id="docs-search-title" className="sr-only">Search documentation</h2>

        {/* Input bar */}
        <div className="flex items-center gap-3 border-b border-[#1e293b] px-4 sm:px-5">
          <Search className="h-5 w-5 text-[#ddb7ff] shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search docs, contracts, guides, formulas..."
            className="h-14 min-w-0 flex-1 bg-transparent text-base text-[#e5e2e1] outline-none placeholder:text-[#94a3b8]/60 font-[family-name:var(--font-inter)]"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="rounded-md p-1.5 text-[#94a3b8] hover:bg-white/5 hover:text-white"
              aria-label="Clear search query"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg border border-[#1e293b] px-2 py-1 text-xs font-[family-name:var(--font-jetbrains-mono)] text-[#94a3b8] hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ddb7ff]"
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
                <div className="px-3 py-1.5 font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-wider text-[#94a3b8]/70 flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-[#ddb7ff]" />
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
                    className={`group flex w-full items-start justify-between gap-3 rounded-xl px-4 py-3 text-left transition-colors ${
                      isSelected
                        ? 'bg-[#ddb7ff]/10 border border-[#ddb7ff]/30 text-white'
                        : 'border border-transparent text-[#94a3b8] hover:bg-white/[0.04]'
                    }`}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-[#ddb7ff]' : 'text-[#94a3b8]'}`} />
                        <span className="font-medium text-sm text-[#e5e2e1] group-hover:text-white transition-colors truncate">
                          {result.title}
                        </span>
                        {result.status && (
                          <span className={`rounded px-1.5 py-0.5 text-[9px] font-[family-name:var(--font-jetbrains-mono)] uppercase tracking-wider border ${statusStyle}`}>
                            {result.status}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#94a3b8] line-clamp-1 leading-relaxed">
                        {result.description}
                      </p>
                    </div>

                    <div className="shrink-0 pt-0.5 flex items-center">
                      {isSelected ? (
                        <div className="flex items-center gap-1 text-xs font-[family-name:var(--font-jetbrains-mono)] text-[#ddb7ff] bg-[#ddb7ff]/10 px-2 py-0.5 rounded border border-[#ddb7ff]/20">
                          <span>Select</span>
                          <CornerDownLeft className="h-3 w-3" />
                        </div>
                      ) : (
                        <ArrowRight className="h-3.5 w-3.5 text-[#94a3b8]/50 group-hover:text-[#94a3b8] transition-colors" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-semibold text-[#e5e2e1]">No documentation found for &ldquo;{query}&rdquo;</p>
              <p className="mt-2 text-xs text-[#94a3b8] max-w-sm mx-auto">
                Try searching for concepts like <code className="text-[#ddb7ff] font-[family-name:var(--font-jetbrains-mono)]">follow vs fade</code>, <code className="text-[#ddb7ff] font-[family-name:var(--font-jetbrains-mono)]">claimWinnings</code>, <code className="text-[#ddb7ff] font-[family-name:var(--font-jetbrains-mono)]">contracts</code>, or <code className="text-[#ddb7ff] font-[family-name:var(--font-jetbrains-mono)]">security</code>.
              </p>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between border-t border-[#1e293b] px-4 py-2.5 bg-[#131313] font-[family-name:var(--font-jetbrains-mono)] text-[11px] text-[#94a3b8]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-[#1e293b] bg-[#1c1b1b] px-1 py-0.5 text-[10px]">↑</kbd>
              <kbd className="rounded border border-[#1e293b] bg-[#1c1b1b] px-1 py-0.5 text-[10px]">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-[#1e293b] bg-[#1c1b1b] px-1 py-0.5 text-[10px]">↵</kbd>
              Select
            </span>
          </div>
          <span className="text-[#94a3b8]/60">ArcSignal Docs</span>
        </div>
      </div>
    </div>
  );
}
