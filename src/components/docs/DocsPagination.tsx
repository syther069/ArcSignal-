import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { getDocsHref, type DocsArticle } from '@/lib/docs-config';

export default function DocsPagination({
  previous,
  next,
}: {
  previous?: DocsArticle;
  next?: DocsArticle;
}) {
  return (
    <nav aria-label="Document navigation" className="mt-14 grid gap-3 border-t border-white/10 pt-8 sm:grid-cols-2">
      {previous ? (
        <Link
          href={getDocsHref(previous.slug)}
          className="group flex flex-col rounded-xl border border-white/10 bg-white/[0.02] p-4.5 transition-all duration-150 hover:border-violet-500/40 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
        >
          <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 group-hover:text-violet-300 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
            <span>Previous</span>
          </div>
          <span className="mt-2 font-[family-name:var(--font-hanken)] text-base font-bold text-slate-200 group-hover:text-white transition-colors">
            {previous.title}
          </span>
          <span className="mt-1 text-xs text-slate-400 line-clamp-1">{previous.description}</span>
        </Link>
      ) : (
        <div className="hidden sm:block" />
      )}

      {next ? (
        <Link
          href={getDocsHref(next.slug)}
          className="group flex flex-col items-end text-right rounded-xl border border-white/10 bg-white/[0.02] p-4.5 transition-all duration-150 hover:border-violet-500/40 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
        >
          <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 group-hover:text-cyan-300 transition-colors">
            <span>Next</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </div>
          <span className="mt-2 font-[family-name:var(--font-hanken)] text-base font-bold text-slate-200 group-hover:text-white transition-colors">
            {next.title}
          </span>
          <span className="mt-1 text-xs text-slate-400 line-clamp-1">{next.description}</span>
        </Link>
      ) : null}
    </nav>
  );
}


