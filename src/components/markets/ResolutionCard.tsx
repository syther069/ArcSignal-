import { Gavel } from 'lucide-react';
import { summarizeResolution } from '@/lib/market-insight';

type Props = {
  isV2: boolean;
  settlementLive?: boolean;
  category: string;
  question: string;
  closesAt: number;
  resolutionSource?: string | null;
  livenessSeconds?: number | null;
  voidAfterSeconds?: number | null;
  externalSource?: string | null;
};

/** "How this market ends" in plain language, shown before the user trades. */
export function ResolutionCard(props: Props) {
  const s = summarizeResolution(props);
  const rows: Array<[string, string]> = [
    ['The question', props.question],
    ['Closes', new Date(props.closesAt * 1000).toLocaleString()],
    ['Who decides', s.who],
    ['Where the answer comes from', s.source],
    ['Delay before final', s.disputeWindow],
    ['If it can’t be settled', s.ifUnclear],
  ];
  return (
    <section aria-labelledby="resolution-card-title" className="rounded-2xl border border-[#403947] bg-[#1C1B1B] p-5 lg:p-6 space-y-4">
      <h2 id="resolution-card-title" className="flex items-center gap-2 font-display text-base font-bold text-[#F1EEF4]">
        <Gavel size={16} className="text-[#DDB7FF]" /> How this market ends
      </h2>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className={label === 'The question' ? 'sm:col-span-2' : ''}>
            <dt className="text-xs uppercase tracking-wider text-[#B0ABB5]">{label}</dt>
            <dd className="mt-0.5 text-[#F1EEF4] break-words">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="rounded-lg border border-[#F2C66D]/30 bg-[#F2C66D]/10 px-3 py-2 text-xs text-[#F2C66D]">{s.trustNote}</p>
    </section>
  );
}
