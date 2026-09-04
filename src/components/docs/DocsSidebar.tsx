'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search } from 'lucide-react';
import { docsArticles, docsSections, getDocsHref } from '@/lib/docs-config';
import { openDocsSearch } from './DocsSearch';

const statusDotStyles: Record<string, string> = {
  implemented: 'bg-emerald-400',
  planned: 'bg-amber-400',
  testnet: 'bg-violet-400',
  risk: 'bg-rose-400',
  reference: 'bg-cyan-400',
};

export default function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden border-r border-white/[0.08] lg:block w-[280px] shrink-0 bg-[#09090d]/60 backdrop-blur-sm" aria-label="Documentation sidebar">
      <div className="sticky top-16 h-[calc(100vh-64px)] overflow-y-auto px-5 py-6 custom-scrollbar flex flex-col gap-6">
        {/* Search trigger button inside sidebar */}
        <div>
          <button
            type="button"
            onClick={openDocsSearch}
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-left text-xs text-slate-400 transition-all duration-150 hover:border-violet-500/40 hover:bg-white/[0.06] hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 group"
            aria-label="Search documentation"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Search className="h-4 w-4 text-slate-500 group-hover:text-violet-300 transition-colors" aria-hidden="true" />
              <span className="truncate">Search docs...</span>
            </div>
            <div className="flex items-center gap-1 shrink-0 font-mono text-[10px] text-slate-500">
              <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 group-hover:border-white/20">⌘K</kbd>
            </div>
          </button>
        </div>

        {/* Categorized Navigation */}
        <nav aria-label="Documentation sections" className="space-y-6">
          {docsSections.map((section) => {
            const articles = docsArticles.filter((article) => article.section === section.id);
            return (
              <div key={section.id} className="space-y-1">
                <h2 className="px-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {section.label}
                </h2>
                <ul className="space-y-0.5">
                  {articles.map((article) => {
                    const href = getDocsHref(article.slug);
                    const active = pathname === href;
                    return (
                      <li key={href}>
                        <Link
                          href={href}
                          aria-current={active ? 'page' : undefined}
                          className={`group flex items-center justify-between rounded-lg px-3 py-2 text-[13px] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
                            active
                              ? 'border-l-2 border-violet-400 bg-violet-500/10 text-white font-medium pl-2.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]'
                              : 'border-l-2 border-transparent text-slate-400 hover:bg-white/[0.035] hover:text-slate-200'
                          }`}
                        >
                          <span className="truncate">{article.title}</span>
                          {article.status === 'planned' && (
                            <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded bg-white/5 text-amber-300/80 border border-amber-500/20">
                              Planned
                            </span>
                          )}
                          {article.status === 'risk' && (
                            <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-300/90 border border-rose-500/20">
                              Risk
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

