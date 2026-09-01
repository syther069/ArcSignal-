import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export default function DocsLinkCard({ href, eyebrow, title, description }: { href: string; eyebrow: string; title: string; description: string }) {
  return (
    <Link href={href} className="group relative rounded-xl border border-white/10 bg-white/[0.025] p-5 transition-colors hover:border-violet-300/40 hover:bg-violet-300/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300/80">{eyebrow}</span>
      <div className="mt-2 flex items-start justify-between gap-4">
        <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-500 transition-colors group-hover:text-violet-300" aria-hidden="true" />
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </Link>
  );
}

