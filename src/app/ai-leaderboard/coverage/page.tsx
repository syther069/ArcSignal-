import Link from 'next/link';
import SignalLayout from '@/components/signals/SignalLayout';
import { getSignalCoverage } from '@/lib/signal-intelligence/repository';
import type { SignalCoverageRecord } from '@/lib/signal-intelligence/types';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Signal Coverage | ArcSignal' };

const percent = (value: number | null) => value === null ? '—' : `${(value * 100).toFixed(1)}%`;
const time = (value: string | null) => value ? new Date(value).toLocaleString() : '—';
function statusText(record: SignalCoverageRecord) {
  if (record.pendingReconciliation) return `${record.pendingReconciliation} awaiting score`;
  if (record.generationStatus === 'complete') return 'Complete';
  if (record.generationStatus === 'retrying') return 'Failed — retrying';
  if (record.generationStatus === 'running') return 'Generating';
  if (record.generationStatus === 'scheduled') return 'Scheduled';
  if (record.generationStatus === 'predates') return 'Predates feature';
  return 'Cutoff passed';
}

export default async function SignalCoveragePage() {
  const records = await getSignalCoverage().catch(() => null);
  const values = records ?? [];
  const attention = values.filter(record =>
    ['scheduled', 'running', 'retrying'].includes(record.generationStatus)
      || record.snapshotHealth === 'stale'
      || record.pendingReconciliation > 0,
  ).slice(0, 100);
  const counts = {
    complete: values.filter(record => record.signalCount >= 3).length,
    queued: values.filter(record => ['scheduled', 'running'].includes(record.generationStatus)).length,
    retrying: values.filter(record => record.generationStatus === 'retrying').length,
    historical: values.filter(record => record.generationStatus === 'predates').length,
    reconciliation: values.reduce((sum, record) => sum + record.pendingReconciliation, 0),
  };
  return <SignalLayout>
    <header><p className="text-xs uppercase tracking-wider text-[#ddb7ff]">Operations</p><h1 className="mt-2 text-3xl font-semibold">Signal coverage</h1><p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#b0abb5]">Generation, snapshot, and scoring status for every indexed market. Provider calls are leased and bounded to one market per scheduled run.</p><Link href="/ai-leaderboard" className="mt-3 inline-block text-sm text-[#ddb7ff] underline">← Back to AI leaderboard</Link></header>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
      ['Complete markets', counts.complete], ['Generation queued', counts.queued], ['Failed — retrying', counts.retrying], ['Awaiting scores', counts.reconciliation],
    ].map(([label, value]) => <div key={label} className="rounded-xl border border-[#403947] bg-[#1c1b1b] p-4"><p className="text-xs text-[#b0abb5]">{label}</p><p className="mt-1 text-2xl font-semibold text-[#f1eef4]">{value}</p></div>)}</div>
    {records === null ? <div role="alert" className="rounded-xl border border-[#403947] p-5"><h2 className="font-medium">Coverage data unavailable</h2><p className="mt-1 text-sm text-[#b0abb5]">The database could not be read. The scheduled worker will continue retrying independently.</p></div>
      : <div className="space-y-2"><p className="text-xs text-[#b0abb5]">Showing {attention.length} markets that need generation, retry, snapshot, or scoring attention. {counts.historical} historical markets predate Signal Intelligence.</p><div className="overflow-x-auto rounded-xl border border-[#403947]"><table className="w-full whitespace-nowrap text-left text-xs"><caption className="sr-only">Signal Intelligence coverage requiring attention</caption><thead className="bg-[#1c1b1b] text-[#b0abb5]"><tr>{['Market', 'Generation', 'Signals', 'Consensus', 'Range', 'Snapshot', 'Attempts', 'Next retry'].map(label => <th key={label} scope="col" className="px-4 py-3 font-medium">{label}</th>)}</tr></thead><tbody>{attention.map(record => <tr key={record.marketId} className="border-t border-[#403947]"><th scope="row" className="max-w-md px-4 py-3 font-normal"><Link href={`/market/${encodeURIComponent(record.marketId)}`} className="block truncate text-[#ddb7ff] underline">{record.question}</Link><span className="mt-1 block text-[#b0abb5]">{record.category} · {record.marketStatus}</span>{record.lastError ? <span className="mt-1 block max-w-md truncate text-[#f2c66d]" title={record.lastError}>{record.lastError}</span> : null}</th><td className="px-4 py-3">{statusText(record)}</td><td className="px-4 py-3">{record.signalCount}/3</td><td className="px-4 py-3">{percent(record.medianProbability)}</td><td className="px-4 py-3">{record.minimumProbability === null ? '—' : `${percent(record.minimumProbability)}–${percent(record.maximumProbability)}`}</td><td className="px-4 py-3 capitalize">{record.snapshotHealth}<span className="block text-[#b0abb5]">{time(record.latestSnapshotAt)}</span></td><td className="px-4 py-3">{record.attemptCount}</td><td className="px-4 py-3">{record.generationStatus === 'retrying' ? time(record.nextAttemptAt) : '—'}</td></tr>)}</tbody></table></div></div>}
  </SignalLayout>;
}
