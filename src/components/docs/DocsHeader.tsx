import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import DocsMobileMenu from './DocsMobileMenu';

export default function DocsHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-[60] h-16 border-b border-white/[0.08] bg-[#0d0d11]/95 backdrop-blur-xl">
      <div className="flex h-full items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
          <Image src="/logo.png" alt="ArcSignal" width={28} height={28} className="h-7 w-7 object-contain" priority />
          <span className="font-display text-base font-bold text-white">ArcSignal</span>
          <span className="hidden h-5 border-l border-white/15 pl-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500 sm:inline">Docs</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/markets" className="hidden items-center gap-2 rounded-full border border-violet-300/20 bg-violet-300/10 px-4 py-2 text-xs font-semibold text-violet-100 transition-colors hover:border-violet-300/40 hover:bg-violet-300/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 sm:inline-flex">
            Explore markets <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
          <DocsMobileMenu />
        </div>
      </div>
    </header>
  );
}

