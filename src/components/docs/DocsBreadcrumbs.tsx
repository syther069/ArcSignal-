import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export default function DocsBreadcrumbs({ title, isOverview = false }: { title: string; isOverview?: boolean }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-8">
      <ol className="flex items-center gap-2 font-[family-name:var(--font-jetbrains-mono)] text-[11px] uppercase tracking-[0.12em] text-[#94a3b8] flex-wrap">
        <li>
          <Link
            href="/"
            className="hover:text-[#ddb7ff] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ddb7ff] rounded"
          >
            ArcSignal
          </Link>
        </li>
        <li aria-hidden="true">
          <ChevronRight className="h-3 w-3 text-[#94a3b8]/50" />
        </li>
        {isOverview ? (
          <li aria-current="page" className="text-[#e5e2e1] font-medium">
            Docs
          </li>
        ) : (
          <>
            <li>
              <Link
                href="/docs"
                className="hover:text-[#ddb7ff] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ddb7ff] rounded"
              >
                Docs
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-3 w-3 text-[#94a3b8]/50" />
            </li>
            <li aria-current="page" className="truncate text-[#e5e2e1] font-medium max-w-[280px] sm:max-w-md">
              {title}
            </li>
          </>
        )}
      </ol>
    </nav>
  );
}


