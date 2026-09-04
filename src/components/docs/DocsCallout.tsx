import type { ReactNode } from 'react';
import { AlertTriangle, Beaker, CheckCircle2, CircleAlert, Info, Wrench } from 'lucide-react';

export type DocsCalloutVariant = 'testnet' | 'important' | 'security' | 'implemented' | 'planned' | 'technical';

const calloutStyles: Record<
  DocsCalloutVariant,
  { icon: typeof Info; borderClass: string; bgClass: string; textClass: string; badgeClass: string; defaultTitle: string }
> = {
  testnet: {
    icon: Beaker,
    borderClass: 'border-violet-500/30',
    bgClass: 'bg-violet-950/15',
    textClass: 'text-violet-200',
    badgeClass: 'text-violet-300',
    defaultTitle: 'ARC Testnet Notice',
  },
  important: {
    icon: CircleAlert,
    borderClass: 'border-cyan-500/30',
    bgClass: 'bg-cyan-950/15',
    textClass: 'text-cyan-100',
    badgeClass: 'text-cyan-300',
    defaultTitle: 'Important Rule',
  },
  security: {
    icon: AlertTriangle,
    borderClass: 'border-rose-500/30',
    bgClass: 'bg-rose-950/15',
    textClass: 'text-rose-100',
    badgeClass: 'text-rose-400',
    defaultTitle: 'Security Warning',
  },
  implemented: {
    icon: CheckCircle2,
    borderClass: 'border-emerald-500/30',
    bgClass: 'bg-emerald-950/15',
    textClass: 'text-emerald-100',
    badgeClass: 'text-emerald-300',
    defaultTitle: 'Live Implementation',
  },
  planned: {
    icon: Wrench,
    borderClass: 'border-amber-500/30',
    bgClass: 'bg-amber-950/15',
    textClass: 'text-amber-100',
    badgeClass: 'text-amber-300',
    defaultTitle: 'Planned Feature',
  },
  technical: {
    icon: Info,
    borderClass: 'border-slate-500/30',
    bgClass: 'bg-slate-900/40',
    textClass: 'text-slate-200',
    badgeClass: 'text-slate-400',
    defaultTitle: 'Technical Specification',
  },
};

export default function DocsCallout({
  variant,
  title,
  children,
}: {
  variant: DocsCalloutVariant;
  title?: string;
  children: ReactNode;
}) {
  const style = calloutStyles[variant];
  const Icon = style.icon;

  return (
    <aside
      className={`my-6 rounded-xl border p-4 sm:p-5 ${style.borderClass} ${style.bgClass}`}
      aria-label={title ?? style.defaultTitle}
    >
      <div className={`mb-2.5 flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] ${style.badgeClass}`}>
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{title ?? style.defaultTitle}</span>
      </div>
      <div className={`text-sm leading-relaxed ${style.textClass} [&_a]:text-cyan-300 [&_a]:underline [&_a]:underline-offset-4 [&_p]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1.5`}>
        {children}
      </div>
    </aside>
  );
}


