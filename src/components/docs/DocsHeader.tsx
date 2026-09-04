'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Search } from 'lucide-react';
import DocsMobileMenu from './DocsMobileMenu';
import { openDocsSearch } from './DocsSearch';

export default function DocsHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-[60] h-16 border-b border-[#1e293b] bg-[#131313] shadow-2xl shadow-black/40">
      <div className="flex h-full items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand + Nav Links */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="flex items-center gap-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ddb7ff] group"
          >
            <Image
              src="/logo.webp"
              alt="ArcSignal Logo"
              width={32}
              height={32}
              className="w-8 h-8 object-contain transition-transform group-hover:scale-105"
              priority
            />
            <span className="font-[family-name:var(--font-hanken)] text-xl font-bold tracking-tight text-[#e5e2e1]">
              ArcSignal
            </span>
            <span className="ml-1 rounded-md bg-[#ddb7ff]/10 border border-[#ddb7ff]/20 px-2 py-0.5 font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-semibold uppercase tracking-wider text-[#ddb7ff]">
              Docs
            </span>
          </Link>

          <nav className="hidden xl:flex items-center gap-7">
            <Link
              href="/markets"
              className="text-sm font-medium text-[#94a3b8] hover:text-[#e5e2e1] transition-colors"
            >
              Markets
            </Link>
            <Link
              href="/portfolio"
              className="text-sm font-medium text-[#94a3b8] hover:text-[#e5e2e1] transition-colors"
            >
              Portfolio
            </Link>
            <Link
              href="/analytics"
              className="text-sm font-medium text-[#94a3b8] hover:text-[#e5e2e1] transition-colors"
            >
              Analytics
            </Link>
            <Link
              href="/docs"
              className="text-sm font-medium text-[#ddb7ff] border-b-2 border-[#ddb7ff] py-5"
            >
              Docs
            </Link>
          </nav>
        </div>

        {/* Right: Search + Action Button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openDocsSearch}
            className="flex items-center gap-2 rounded-lg border border-[#1e293b] bg-[#1c1b1b] px-3 py-1.5 text-xs text-[#94a3b8] hover:border-[#3a3939] hover:text-[#e5e2e1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ddb7ff] transition-colors"
            aria-label="Search documentation"
          >
            <Search className="h-3.5 w-3.5 text-[#94a3b8]" aria-hidden="true" />
            <span className="hidden sm:inline">Search docs</span>
            <kbd className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] text-[#94a3b8]/80 bg-[#131313] px-1.5 py-0.5 rounded border border-[#1e293b]">⌘K</kbd>
          </button>

          <Link
            href="/markets"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#ddb7ff] px-4 py-2 text-xs font-bold text-[#121212] transition-colors hover:bg-[#ead7ff] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ddb7ff]"
          >
            <span>Explore markets</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>

          <DocsMobileMenu />
        </div>
      </div>
    </header>
  );
}


