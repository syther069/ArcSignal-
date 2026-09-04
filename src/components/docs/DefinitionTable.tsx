export type DefinitionItem = { term: string; definition: string };

export default function DefinitionTable({ items }: { items: DefinitionItem[] }) {
  return (
    <dl className="my-6 overflow-hidden rounded-xl border border-[#1e293b] bg-[#1c1b1b]">
      {items.map((item) => (
        <div
          key={item.term}
          className="grid gap-1.5 border-b border-[#1e293b] p-4 last:border-b-0 sm:grid-cols-[200px_1fr] sm:gap-6 sm:p-4.5 hover:bg-[#201f1f] transition-colors"
        >
          <dt className="font-[family-name:var(--font-jetbrains-mono)] text-xs font-semibold text-[#ddb7ff] select-all">
            {item.term}
          </dt>
          <dd className="min-w-0 text-sm leading-relaxed text-[#e5e2e1] font-[family-name:var(--font-inter)]">
            {item.definition}
          </dd>
        </div>
      ))}
    </dl>
  );
}


