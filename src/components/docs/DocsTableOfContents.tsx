'use client';

import { useEffect, useState } from 'react';
import type { DocsHeading } from '@/lib/docs-content';

function TocLinks({ headings, activeId }: { headings: DocsHeading[]; activeId: string }) {
  return (
    <ul className="space-y-1 border-l border-white/10">
      {headings.map((heading) => (
        <li key={heading.id}>
          <a href={`#${heading.id}`} className={`block border-l py-1.5 text-xs leading-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 ${heading.depth === 3 ? 'pl-6' : 'pl-3'} ${activeId === heading.id ? '-ml-px border-violet-300 text-violet-200' : '-ml-px border-transparent text-slate-600 hover:text-slate-300'}`}>{heading.text}</a>
        </li>
      ))}
    </ul>
  );
}

export default function DocsTableOfContents({ headings, mode = 'all' }: { headings: DocsHeading[]; mode?: 'mobile' | 'desktop' | 'all' }) {
  const [activeId, setActiveId] = useState(headings[0]?.id ?? '');

  useEffect(() => {
    if (headings.length === 0) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActiveId(visible[0].target.id);
    }, { rootMargin: '-96px 0px -70% 0px' });
    headings.forEach((heading) => {
      const element = document.getElementById(heading.id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <>
      {mode !== 'desktop' ? <details className="mb-8 rounded-xl border border-white/10 bg-white/[0.02] p-4 xl:hidden">
        <summary className="cursor-pointer font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">On this page</summary>
        <div className="mt-4"><TocLinks headings={headings} activeId={activeId} /></div>
      </details> : null}
      {mode !== 'mobile' ? <aside className="hidden xl:block" aria-label="On this page">
        <div className="sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto pr-5">
          <h2 className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">On this page</h2>
          <TocLinks headings={headings} activeId={activeId} />
        </div>
      </aside> : null}
    </>
  );
}
