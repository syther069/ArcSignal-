import type { ReactNode } from 'react';
import { AlertTriangle, Beaker, CheckCircle2, CircleAlert, Info, Wrench } from 'lucide-react';

export type DocsCalloutVariant = 'testnet' | 'important' | 'security' | 'implemented' | 'planned' | 'technical';

const calloutStyles: Record<
  DocsCalloutVariant,
  { icon: typeof Info; borderClass: string; bgClass: string; textClass: string; badgeClass: string; defaultTitle: string }
> = {
  testnet: {
    icon: Beaker,
    borderClass: 'border-[#ddb7ff]/25',
    bgClass: 'bg-[#ddb7ff]/[0.04]',
    textClass: 'text-[#e5e2e1]',
    badgeClass: 'text-[#ddb7ff]',
    defaultTitle: 'ARC Testnet Notice',
  },
  important: {
    icon: CircleAlert,
    borderClass: 'border-[#ddb7ff]/35',
    bgClass: 'bg-[#ddb7ff]/[0.06]',
    textClass: 'text-[#e5e2e1]',
    badgeClass: 'text-[#ddb7ff]',
    defaultTitle: 'Important Rule',
  },
  security: {
    icon: AlertTriangle,
    borderClass: 'border-[#3a3939]',
    bgClass: 'bg-[#1c1b1b]',
    textClass: 'text-[#e5e2e1]',
    badgeClass: 'text-[#ddb7ff]',
    defaultTitle: 'Security Notice',
  },
  implemented: {
    icon: CheckCircle2,
    borderClass: 'border-white/10',
    bgClass: 'bg-white/[0.03]',
    textClass: 'text-[#e5e2e1]',
    badgeClass: 'text-white',
    defaultTitle: 'Live Implementation',
  },
  planned: {
    icon: Wrench,
    borderClass: 'border-[#1e293b]',
    bgClass: 'bg-[#1c1b1b]',
    textClass: 'text-[#94a3b8]',
    badgeClass: 'text-[#94a3b8]',
    defaultTitle: 'Planned Feature',
  },
  technical: {
    icon: Info,
    borderClass: 'border-[#1e293b]',
    bgClass: 'bg-[#161616]',
    textClass: 'text-[#94a3b8]',
    badgeClass: 'text-[#94a3b8]',
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
      className={`my-6 rounded-xl border p-4 sm:p-5 font-[family-name:var(--font-inter)] ${style.borderClass} ${style.bgClass}`}
      aria-label={title ?? style.defaultTitle}
    >
      <div className={`mb-2.5 flex items-center gap-2 font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] ${style.badgeClass}`}>
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{title ?? style.defaultTitle}</span>
      </div>
      <div className={`text-sm leading-relaxed ${style.textClass} [&_a]:text-[#ddb7ff] [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-[#ead7ff] [&_p]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1.5`}>
        {children}
      </div>
    </aside>
  );
}


