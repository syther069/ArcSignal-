export type DefinitionItem = { term: string; definition: string };

export default function DefinitionTable({ items }: { items: DefinitionItem[] }) {
  return (
    <dl className="my-6 overflow-hidden rounded-xl border border-white/10 bg-black/20">
      {items.map((item) => (
        <div
          key={item.term}
          className="grid gap-1.5 border-b border-white/10 bg-white/[0.015] p-4 last:border-b-0 sm:grid-cols-[200px_1fr] sm:gap-6 sm:p-4.5 hover:bg-white/[0.03] transition-colors"
        >
          <dt className="font-[family-name:var(--font-jetbrains-mono)] text-xs font-semibold text-cyan-300 select-all">
            {item.term}
          </dt>
          <dd className="min-w-0 text-sm leading-relaxed text-slate-300 font-sans">
            {item.definition}
          </dd>
        </div>
      ))}
    </dl>
  );
}


