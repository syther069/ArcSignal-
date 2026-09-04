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
      className="group relative block rounded-xl border border-[#1e293b] bg-[#1c1b1b] p-5 sm:p-6 transition-all duration-200 hover:border-[#ddb7ff]/40 hover:bg-[#201f1f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ddb7ff]"
    >
      <div className="flex items-center justify-between gap-4 mb-2">
        <span className="font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ddb7ff]">
          {eyebrow}
        </span>
        <ArrowUpRight
          className="h-4 w-4 shrink-0 text-[#94a3b8] transition-transform duration-200 group-hover:text-[#ddb7ff] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          aria-hidden="true"
        />
      </div>
      <h3 className="font-[family-name:var(--font-hanken)] text-lg sm:text-xl font-bold text-white group-hover:text-[#ddb7ff] transition-colors">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-[#94a3b8] group-hover:text-[#e5e2e1] transition-colors font-[family-name:var(--font-inter)]">
        {description}
      </p>
    </Link>
  );
}


