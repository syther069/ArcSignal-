'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, AlignLeft } from 'lucide-react';
import type { DocsHeading } from '@/lib/docs-content';

function TocLinks({ headings, activeId }: { headings: DocsHeading[]; activeId: string }) {
  return (
    <ul className="space-y-1 text-[13px]">
      {headings.map((heading) => {
        const isActive = activeId === heading.id;
        return (
          <li key={heading.id} style={{ paddingLeft: heading.depth === 3 ? '16px' : '0px' }}>
            <a
              href={`#${heading.id}`}
              className={`block border-l-2 py-1.5 pl-3 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
                isActive
                  ? '-ml-px border-cyan-400 font-medium text-cyan-200'
                  : '-ml-px border-white/10 text-slate-400 hover:border-slate-500 hover:text-slate-200'
              }`}
            >
              <span className="line-clamp-1">{heading.text}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export default function DocsTableOfContents({
  headings,
  mode = 'all',
}: {
  headings: DocsHeading[];
  mode?: 'mobile' | 'desktop' | 'all';
}) {
  const [activeId, setActiveId] = useState(headings[0]?.id ?? '');

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-96px 0px -70% 0px' }
    );

    headings.forEach((heading) => {
      const element = document.getElementById(heading.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <>
      {/* Mobile / Tablet Accordion */}
      {mode !== 'desktop' ? (
        <details className="group mb-8 rounded-xl border border-white/10 bg-white/[0.02] p-4 xl:hidden transition-colors hover:border-white/15">
          <summary className="flex cursor-pointer list-none items-center justify-between font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300 select-none">
            <div className="flex items-center gap-2">
              <AlignLeft className="h-3.5 w-3.5 text-cyan-400" />
              <span>On this page ({headings.length})</span>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400 transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <div className="mt-4 pt-3 border-t border-white/10">
            <TocLinks headings={headings} activeId={activeId} />
          </div>
        </details>
      ) : null}

      {/* Desktop Sticky Rail */}
      {mode !== 'mobile' ? (
        <aside className="hidden xl:block w-[240px] shrink-0" aria-label="Table of contents">
          <div className="sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto pr-4 custom-scrollbar">
            <div className="mb-3 flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
              <span>On this page</span>
            </div>
            <TocLinks headings={headings} activeId={activeId} />
          </div>
        </aside>
      ) : null}
    </>
  );
}

