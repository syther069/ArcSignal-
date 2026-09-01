import type { ReactNode } from 'react';
import { AlertTriangle, Beaker, CheckCircle2, CircleAlert, Info, Wrench } from 'lucide-react';

export type DocsCalloutVariant = 'testnet' | 'important' | 'security' | 'implemented' | 'planned' | 'technical';

const calloutStyles: Record<DocsCalloutVariant, { icon: typeof Info; classes: string; label: string }> = {
  testnet: { icon: Beaker, classes: 'border-violet-400/35 bg-violet-400/[0.07] text-violet-100', label: 'Testnet' },
  important: { icon: CircleAlert, classes: 'border-cyan-300/35 bg-cyan-300/[0.06] text-cyan-50', label: 'Important' },
  security: { icon: AlertTriangle, classes: 'border-amber-300/35 bg-amber-300/[0.06] text-amber-50', label: 'Security warning' },
  implemented: { icon: CheckCircle2, classes: 'border-emerald-300/35 bg-emerald-300/[0.06] text-emerald-50', label: 'Implemented' },
  planned: { icon: Wrench, classes: 'border-slate-500/60 bg-slate-500/[0.08] text-slate-100', label: 'Planned' },
  technical: { icon: Info, classes: 'border-slate-600/70 bg-white/[0.025] text-slate-100', label: 'Technical note' },
};

export default function DocsCallout({ variant, title, children }: { variant: DocsCalloutVariant; title?: string; children: ReactNode }) {
  const style = calloutStyles[variant];
  const Icon = style.icon;

  return (
    <aside className={`my-7 rounded-xl border p-5 ${style.classes}`} aria-label={title ?? style.label}>
      <div className="mb-2 flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em]">
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span>{title ?? style.label}</span>
      </div>
      <div className="text-sm leading-6 text-slate-300 [&_a]:text-cyan-300 [&_p]:m-0">{children}</div>
    </aside>
  );
}

