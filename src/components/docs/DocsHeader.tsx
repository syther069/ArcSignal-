'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Search } from 'lucide-react';
import DocsMobileMenu from './DocsMobileMenu';
import { openDocsSearch } from './DocsSearch';

export default function DocsHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-[60] h-16 border-b border-white/[0.08] bg-[#09090d]/90 backdrop-blur-xl">
      <div className="flex h-full items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-lg py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 group"
          >
            <Image
              src="/logo.png"
              alt="ArcSignal"
              width={28}
              height={28}
              className="h-7 w-7 object-contain transition-transform group-hover:scale-105"
              priority
            />
            <span className="font-[family-name:var(--font-hanken)] text-lg font-bold tracking-tight text-white">
              ArcSignal
            </span>
          </Link>
          <div className="hidden h-4 w-px bg-white/15 sm:block" aria-hidden="true" />
          <Link
            href="/docs"
            className="hidden items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider text-cyan-400 hover:text-cyan-300 sm:inline-flex"
          >
            Docs
          </Link>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick search button for mobile / tablet */}
          <button
            type="button"
            onClick={openDocsSearch}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-400 hover:border-violet-500/40 hover:bg-white/[0.06] hover:text-white lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            aria-label="Search documentation"
          >
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden xs:inline">Search</span>
            <kbd className="font-mono text-[10px] text-slate-500">⌘K</kbd>
          </button>

          {/* Explore markets primary action */}
          <Link
            href="/markets"
            className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/10 px-3.5 py-1.5 text-xs font-semibold text-violet-200 transition-all duration-150 hover:border-violet-400/60 hover:bg-violet-500/20 hover:text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          >
            <span>Explore markets</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>

          {/* Mobile hamburger menu */}
          <DocsMobileMenu />
        </div>
      </div>
    </header>
  );
}


