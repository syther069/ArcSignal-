import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { getDocsHref, type DocsArticle } from '@/lib/docs-config';

export default function DocsPagination({ previous, next }: { previous?: DocsArticle; next?: DocsArticle }) {
  return (
    <nav aria-label="Document navigation" className="mt-16 grid gap-3 border-t border-white/10 pt-7 sm:grid-cols-2">
      {previous ? (
        <Link href={getDocsHref(previous.slug)} className="group rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-600"><ArrowLeft className="h-3.5 w-3.5" /> Previous</span>
          <span className="mt-2 block text-sm font-semibold text-slate-300 group-hover:text-white">{previous.title}</span>
        </Link>
      ) : <span />}
      {next ? (
        <Link href={getDocsHref(next.slug)} className="group rounded-xl border border-white/10 bg-white/[0.02] p-4 text-right hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
          <span className="flex items-center justify-end gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-600">Next <ArrowRight className="h-3.5 w-3.5" /></span>
          <span className="mt-2 block text-sm font-semibold text-slate-300 group-hover:text-white">{next.title}</span>
        </Link>
      ) : null}
    </nav>
  );
}

