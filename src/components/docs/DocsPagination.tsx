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
    <nav aria-label="Document navigation" className="mt-14 grid gap-3 border-t border-[#1e293b] pt-8 sm:grid-cols-2 font-[family-name:var(--font-inter)]">
      {previous ? (
        <Link
          href={getDocsHref(previous.slug)}
          className="group flex flex-col rounded-xl border border-[#1e293b] bg-[#1c1b1b] p-4.5 transition-colors hover:border-[#ddb7ff]/40 hover:bg-[#201f1f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ddb7ff]"
        >
          <div className="flex items-center gap-1.5 font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8] group-hover:text-[#ddb7ff] transition-colors">
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
            <span>Previous</span>
          </div>
          <span className="mt-2 font-[family-name:var(--font-hanken)] text-base font-bold text-[#e5e2e1] group-hover:text-white transition-colors">
            {previous.title}
          </span>
          <span className="mt-1 text-xs text-[#94a3b8] line-clamp-1">{previous.description}</span>
        </Link>
      ) : (
        <div className="hidden sm:block" />
      )}

      {next ? (
        <Link
          href={getDocsHref(next.slug)}
          className="group flex flex-col items-end text-right rounded-xl border border-[#1e293b] bg-[#1c1b1b] p-4.5 transition-colors hover:border-[#ddb7ff]/40 hover:bg-[#201f1f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ddb7ff]"
        >
          <div className="flex items-center gap-1.5 font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8] group-hover:text-[#ddb7ff] transition-colors">
            <span>Next</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </div>
          <span className="mt-2 font-[family-name:var(--font-hanken)] text-base font-bold text-[#e5e2e1] group-hover:text-white transition-colors">
            {next.title}
          </span>
          <span className="mt-1 text-xs text-[#94a3b8] line-clamp-1">{next.description}</span>
        </Link>
      ) : null}
    </nav>
  );
}


