import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export default function DocsBreadcrumbs({ title, isOverview = false }: { title: string; isOverview?: boolean }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-8">
      <ol className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500 flex-wrap">
        <li>
          <Link
            href="/"
            className="hover:text-cyan-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 rounded"
          >
            ArcSignal
          </Link>
        </li>
        <li aria-hidden="true">
          <ChevronRight className="h-3 w-3 text-slate-600" />
        </li>
        {isOverview ? (
          <li aria-current="page" className="text-slate-300 font-medium">
            Docs
          </li>
        ) : (
          <>
            <li>
              <Link
                href="/docs"
                className="hover:text-cyan-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 rounded"
              >
                Docs
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-3 w-3 text-slate-600" />
            </li>
            <li aria-current="page" className="truncate text-slate-300 font-medium max-w-[280px] sm:max-w-md">
              {title}
            </li>
          </>
        )}
      </ol>
    </nav>
  );
}


