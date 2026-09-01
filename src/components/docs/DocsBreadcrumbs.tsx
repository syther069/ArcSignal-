import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export default function DocsBreadcrumbs({ title, isOverview = false }: { title: string; isOverview?: boolean }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-8">
      <ol className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-600">
        <li><Link href="/" className="hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">ArcSignal</Link></li>
        <li aria-hidden="true"><ChevronRight className="h-3 w-3" /></li>
        {isOverview ? <li aria-current="page" className="text-slate-400">Docs</li> : (
          <>
            <li><Link href="/docs" className="hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">Docs</Link></li>
            <li aria-hidden="true"><ChevronRight className="h-3 w-3" /></li>
            <li aria-current="page" className="truncate text-slate-400">{title}</li>
          </>
        )}
      </ol>
    </nav>
  );
}

