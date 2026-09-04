'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search } from 'lucide-react';
import { docsArticles, docsSections, getDocsHref } from '@/lib/docs-config';
import { openDocsSearch } from './DocsSearch';

export default function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden border-r border-[#1e293b] lg:block w-[280px] shrink-0 bg-[#131313]" aria-label="Documentation sidebar">
      <div className="sticky top-16 h-[calc(100vh-64px)] overflow-y-auto px-5 py-6 custom-scrollbar flex flex-col gap-6">
        {/* Search trigger button inside sidebar */}
        <div>
          <button
            type="button"
            onClick={openDocsSearch}
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-[#1e293b] bg-[#1c1b1b] px-3.5 py-2.5 text-left text-xs text-[#94a3b8] transition-colors hover:border-[#3a3939] hover:text-[#e5e2e1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ddb7ff] group"
            aria-label="Search documentation"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Search className="h-4 w-4 text-[#94a3b8] group-hover:text-[#ddb7ff] transition-colors" aria-hidden="true" />
              <span className="truncate">Search docs...</span>
            </div>
            <div className="flex items-center gap-1 shrink-0 font-[family-name:var(--font-jetbrains-mono)] text-[10px] text-[#94a3b8]">
              <kbd className="rounded border border-[#1e293b] bg-[#131313] px-1.5 py-0.5 group-hover:border-[#3a3939]">⌘K</kbd>
            </div>
          </button>
        </div>

        {/* Categorized Navigation */}
        <nav aria-label="Documentation sections" className="space-y-6">
          {docsSections.map((section) => {
            const articles = docsArticles.filter((article) => article.section === section.id);
            return (
              <div key={section.id} className="space-y-1.5">
                <h2 className="px-2 font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]/70">
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
                          className={`group flex items-center justify-between rounded-lg px-3 py-2 text-[13px] font-[family-name:var(--font-inter)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ddb7ff] ${
                            active
                              ? 'border-l-2 border-[#ddb7ff] bg-[#ddb7ff]/10 text-[#ddb7ff] font-medium pl-2.5'
                              : 'border-l-2 border-transparent text-[#94a3b8] hover:bg-[#1c1b1b] hover:text-[#e5e2e1]'
                          }`}
                        >
                          <span className="truncate">{article.title}</span>
                          {article.status === 'planned' && (
                            <span className="shrink-0 font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#1c1b1b] text-[#94a3b8] border border-[#3a3939]">
                              Planned
                            </span>
                          )}
                          {article.status === 'risk' && (
                            <span className="shrink-0 font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#ddb7ff]/10 text-[#ddb7ff] border border-[#ddb7ff]/20">
                              Notice
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

