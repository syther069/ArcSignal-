'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, AlignLeft } from 'lucide-react';
import type { DocsHeading } from '@/lib/docs-content';

function TocLinks({ headings, activeId }: { headings: DocsHeading[]; activeId: string }) {
  return (
    <ul className="space-y-1 text-[13px] font-[family-name:var(--font-inter)]">
      {headings.map((heading) => {
        const isActive = activeId === heading.id;
        return (
          <li key={heading.id} style={{ paddingLeft: heading.depth === 3 ? '16px' : '0px' }}>
            <a
              href={`#${heading.id}`}
              className={`block border-l-2 py-1.5 pl-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ddb7ff] ${
                isActive
                  ? '-ml-px border-[#ddb7ff] font-medium text-[#ddb7ff]'
                  : '-ml-px border-[#1e293b] text-[#94a3b8] hover:border-[#3a3939] hover:text-[#e5e2e1]'
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
        <details className="group mb-8 rounded-xl border border-[#1e293b] bg-[#1c1b1b] p-4 xl:hidden transition-colors hover:border-[#3a3939]">
          <summary className="flex cursor-pointer list-none items-center justify-between font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[#e5e2e1] select-none">
            <div className="flex items-center gap-2">
              <AlignLeft className="h-3.5 w-3.5 text-[#ddb7ff]" />
              <span>On this page ({headings.length})</span>
            </div>
            <ChevronDown className="h-4 w-4 text-[#94a3b8] transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <div className="mt-4 pt-3 border-t border-[#1e293b]">
            <TocLinks headings={headings} activeId={activeId} />
          </div>
        </details>
      ) : null}

      {/* Desktop Sticky Rail */}
      {mode !== 'mobile' ? (
        <aside className="hidden xl:block w-[240px] shrink-0" aria-label="Table of contents">
          <div className="sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto pr-4 custom-scrollbar">
            <div className="mb-3 flex items-center gap-2 font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ddb7ff] shadow-[0_0_8px_rgba(221,183,255,0.6)]" />
              <span>On this page</span>
            </div>
            <TocLinks headings={headings} activeId={activeId} />
          </div>
        </aside>
      ) : null}
    </>
  );
}

