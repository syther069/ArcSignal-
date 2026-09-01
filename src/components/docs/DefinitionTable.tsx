export type DefinitionItem = { term: string; definition: string };

export default function DefinitionTable({ items }: { items: DefinitionItem[] }) {
  return (
    <dl className="my-7 overflow-hidden rounded-xl border border-white/10">
      {items.map((item) => (
        <div key={item.term} className="grid gap-1 border-b border-white/10 bg-white/[0.02] px-4 py-4 last:border-b-0 sm:grid-cols-[180px_1fr] sm:gap-5">
          <dt className="font-mono text-xs font-semibold text-slate-200">{item.term}</dt>
          <dd className="min-w-0 break-words text-sm leading-6 text-slate-400">{item.definition}</dd>
        </div>
      ))}
    </dl>
  );
}

