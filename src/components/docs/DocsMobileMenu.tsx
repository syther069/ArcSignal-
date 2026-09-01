'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { docsArticles, docsSections, getDocsHref } from '@/lib/docs-config';

export default function DocsMobileMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 lg:hidden" aria-label="Open documentation menu" aria-expanded={open}>
        <Menu className="h-5 w-5" />
      </button>
      {open ? (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} aria-label="Dismiss documentation menu" />
          <div role="dialog" aria-modal="true" aria-labelledby="mobile-docs-title" className="absolute inset-y-0 right-0 w-[min(88vw,360px)] overflow-y-auto border-l border-white/10 bg-[#111116] px-5 py-5 shadow-2xl">
            <div className="mb-7 flex items-center justify-between">
              <span id="mobile-docs-title" className="font-display text-lg font-semibold text-white">Documentation</span>
              <button ref={closeButtonRef} type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300" aria-label="Close documentation menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav aria-label="Mobile documentation">
              {docsSections.map((section) => (
                <div key={section.id} className="mb-7">
                  <h2 className="mb-2 px-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">{section.label}</h2>
                  <ul className="space-y-1">
                    {docsArticles.filter((article) => article.section === section.id).map((article) => {
                      const href = getDocsHref(article.slug);
                      const active = pathname === href;
                      return (
                        <li key={href}>
                          <Link href={href} aria-current={active ? 'page' : undefined} className={`block rounded-lg px-3 py-2.5 text-sm ${active ? 'bg-violet-300/10 text-violet-100' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>{article.title}</Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}
