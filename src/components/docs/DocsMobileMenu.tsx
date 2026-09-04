'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Search } from 'lucide-react';
import { docsArticles, docsSections, getDocsHref } from '@/lib/docs-config';
import { openDocsSearch } from './DocsSearch';

export default function DocsMobileMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const handleOpenSearchFromDrawer = () => {
    setOpen(false);
    openDocsSearch();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 lg:hidden"
        aria-label="Open documentation menu"
        aria-expanded={open}
      >
        <Menu className="h-5 w-5" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-label="Dismiss documentation menu"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-docs-title"
            className="absolute inset-y-0 right-0 w-[min(88vw,360px)] overflow-y-auto border-l border-white/10 bg-[#0c0c12] px-5 py-5 shadow-2xl flex flex-col justify-between"
          >
            <div>
              <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
                <span id="mobile-docs-title" className="font-[family-name:var(--font-hanken)] text-lg font-bold text-white">
                  ArcSignal Docs
                </span>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                  aria-label="Close documentation menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Search button in mobile drawer */}
              <button
                type="button"
                onClick={handleOpenSearchFromDrawer}
                className="mb-6 flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-left text-sm text-slate-300 hover:border-violet-500/40 hover:bg-white/[0.06]"
              >
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-violet-400" />
                  <span>Search docs...</span>
                </div>
                <kbd className="font-mono text-xs text-slate-500">⌘K</kbd>
              </button>

              <nav aria-label="Mobile documentation navigation" className="space-y-6">
                {docsSections.map((section) => (
                  <div key={section.id} className="space-y-1">
                    <h2 className="px-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {section.label}
                    </h2>
                    <ul className="space-y-0.5">
                      {docsArticles
                        .filter((article) => article.section === section.id)
                        .map((article) => {
                          const href = getDocsHref(article.slug);
                          const active = pathname === href;
                          return (
                            <li key={href}>
                              <Link
                                href={href}
                                aria-current={active ? 'page' : undefined}
                                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                                  active
                                    ? 'bg-violet-500/15 border border-violet-500/30 text-violet-200 font-medium'
                                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                }`}
                              >
                                <span className="truncate">{article.title}</span>
                                {article.status === 'planned' && (
                                  <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 rounded bg-white/5 text-amber-300/80 border border-amber-500/20">
                                    Planned
                                  </span>
                                )}
                              </Link>
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                ))}
              </nav>
            </div>

            <div className="mt-8 border-t border-white/10 pt-4 text-center">
              <Link
                href="/markets"
                className="block w-full rounded-xl bg-violet-600 px-4 py-2.5 text-center text-xs font-semibold text-white hover:bg-violet-500"
              >
                Go to Markets
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

