import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export default function DocsLinkCard({
  href,
  eyebrow,
  title,
  description,
}: {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group relative block rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6 transition-all duration-200 hover:border-violet-500/40 hover:bg-violet-950/15 hover:shadow-[0_0_24px_rgba(168,85,247,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
    >
      <div className="flex items-center justify-between gap-4 mb-2">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-400">
          {eyebrow}
        </span>
        <ArrowUpRight
          className="h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 group-hover:text-cyan-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          aria-hidden="true"
        />
      </div>
      <h3 className="font-[family-name:var(--font-hanken)] text-lg sm:text-xl font-bold text-white group-hover:text-violet-200 transition-colors">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400 group-hover:text-slate-300 transition-colors">
        {description}
      </p>
    </Link>
  );
}


