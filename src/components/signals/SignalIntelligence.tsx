'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import type { AISignal, SignalCoverageRecord } from '@/lib/signal-intelligence/types';
import { modelVersionLabel, modelVersionExplanation } from '@/lib/signal-intelligence/model-identity';

export const SIGNAL_DISCLAIMER = 'AI signals are informational only. They are not financial advice. Use them as one input alongside your own judgment.';
export const percent = (value: number | null) => value === null ? '—' : `${(value * 100).toFixed(1)}%`;
const timestamp = (value: string) => Number.isFinite(Date.parse(value))
  ? new Date(value).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC') : 'Timestamp unavailable';
function safeUrl(value: string | null): string | undefined {
  if (!value) return undefined;
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? value : undefined; } catch { return undefined; }
}
export function summarizeSignals(signals: AISignal[]) {
  const estimates = signals.map(signal => ({ name: signal.agentName, probability: signal.probability }));
  const probabilities = estimates.map(estimate => estimate.probability).sort((a, b) => a - b);
  if (!probabilities.length) return null;
  const midpoint = Math.floor(probabilities.length / 2);
  const median = probabilities.length % 2 ? probabilities[midpoint] : (probabilities[midpoint - 1] + probabilities[midpoint]) / 2;
  return { estimates, median, minimum: probabilities[0], maximum: probabilities.at(-1)! };
}

export function generationMessage(coverage: SignalCoverageRecord | null | undefined): { title: string; message: string } {
  if (!coverage || coverage.generationStatus === 'scheduled') return {
    title: 'Signal generation scheduled',
    message: 'This market is queued for the next bounded generation run. The panel refreshes automatically every 15 seconds.',
  };
  if (coverage.generationStatus === 'running') return {
    title: 'Agents are analyzing this market',
    message: 'Fresh provider snapshots are being evaluated now. Completed records will appear automatically.',
  };
  if (coverage.generationStatus === 'retrying') return {
    title: 'Generation failed — retrying',
    message: coverage.nextAttemptAt ? `A provider retry is scheduled for ${timestamp(coverage.nextAttemptAt)}.` : 'A provider retry is scheduled automatically.',
  };
  if (coverage.generationStatus === 'predates') return {
    title: 'Market predates Signal Intelligence',
    message: 'This market resolved before auditable agent records were captured, so no history or score is invented.',
  };
  return {
    title: 'No signal was captured before cutoff',
    message: 'The market is no longer eligible for a new prediction. It will not contribute to agent rankings.',
  };
}
export function SignalCard({ signal: s }: { signal: AISignal }) {
  return <article id={`signal-${s.id}`} className="rounded-xl border border-[#403947] p-4 space-y-4 min-w-0">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="font-semibold text-[#f1eef4]">{s.agentName}</h3>
        <p className="text-xs text-[#b0abb5] break-words">{s.modelProvider} · {s.modelName}</p>
        <p className="mt-1 text-xs text-[#b0abb5] break-words">{modelVersionLabel(s)}</p>
        {modelVersionExplanation(s) ? <p className="mt-1 max-w-xl text-xs text-[#b0abb5]">{modelVersionExplanation(s)}</p> : null}</div>
      <span className="rounded-full bg-[#ddb7ff]/10 px-3 py-1 text-xs text-[#ddb7ff] capitalize">{s.status}</span>
    </div>
    <div className="flex flex-wrap gap-x-8 gap-y-3">
      <div><p className="text-xs text-[#b0abb5]">Probability of YES</p><p className="text-2xl font-semibold text-[#ddb7ff]">{percent(s.probability)}</p></div>
      <div><p className="text-xs text-[#b0abb5]">Subjective uncertainty range</p><p>{percent(s.confidenceRange[0])}–{percent(s.confidenceRange[1])}</p></div>
      <div><p className="text-xs text-[#b0abb5]">Self-reported confidence</p><p>{percent(s.confidence)}</p></div>
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      <div><h4 className="text-sm font-medium">Supporting factors</h4><ul className="mt-2 list-disc pl-5 text-sm text-[#b0abb5] space-y-1">{s.supportingFactors.map((factor, i) => <li key={i}>{factor}</li>)}</ul></div>
      <div><h4 className="text-sm font-medium">Contradicting factors</h4><ul className="mt-2 list-disc pl-5 text-sm text-[#b0abb5] space-y-1">{s.contradictingFactors.map((factor, i) => <li key={i}>{factor}</li>)}</ul></div>
    </div>
    <dl className="grid gap-2 text-xs text-[#b0abb5] sm:grid-cols-2">
      <div><dt>Generated</dt><dd>{timestamp(s.generatedAt)}</dd></div>
      <div><dt>Market snapshot</dt><dd>{timestamp(s.snapshotAt)}</dd></div>
      <div><dt>Time horizon</dt><dd>{s.timeHorizon}</dd></div>
      <div><dt>Previous prediction</dt><dd>{s.previousSignalId ? <Link className="text-[#ddb7ff] underline" href={`/market/${encodeURIComponent(s.marketId)}#signal-${s.previousSignalId}`}>View previous prediction</Link> : 'First prediction for this agent and market'}</dd></div>
    </dl>
    <div className="text-xs"><h4 className="font-medium">Data sources</h4><ul className="mt-1 space-y-1 text-[#b0abb5]">{s.sources.map((source, i) => <li key={i}>{safeUrl(source.url) ? <a className="text-[#ddb7ff] underline" href={safeUrl(source.url)} target="_blank" rel="noreferrer">{source.name}</a> : source.name} · {timestamp(source.accessedAt)}</li>)}</ul></div>
    {s.status !== 'pending' ? <div className="border-t border-[#403947] pt-3 text-sm space-y-1">
      <p>Final result: {s.finalResult ?? 'Not scored'}{s.status === 'resolved' && s.finalResult ? ` · Prediction ${(s.probability >= 0.5) === (s.finalResult === 'YES') ? 'correct' : 'incorrect'}` : ''}</p>
      {s.resolvedAt ? <p className="text-xs text-[#b0abb5]">Resolved {timestamp(s.resolvedAt)}</p> : null}
      {safeUrl(s.resolutionSourceUrl) ? <a href={safeUrl(s.resolutionSourceUrl)} className="text-xs text-[#ddb7ff] underline" target="_blank" rel="noreferrer">Resolution provider</a> : null}
      {s.settlementTransactionHash ? <p className="text-xs break-all">Settlement transaction: <Link href={`/transaction/${s.settlementTransactionHash}`} className="text-[#ddb7ff] underline">{s.settlementTransactionHash}</Link></p> : null}
    </div> : <p className="text-xs text-[#b0abb5]">Awaiting verified settlement. Not included in performance scores.</p>}
    <details className="border-t border-[#403947] pt-3 text-xs">
      <summary className="cursor-pointer text-[#ddb7ff] focus-visible:outline focus-visible:outline-2">Audit record and original analysis</summary>
      <p className="mt-3 text-[#b0abb5]">SHA-256 of the immutable analysis record. This detects changes; it is not an independent on-chain timestamp or proof of prediction quality.</p>
      <code className="mt-2 block break-all">{s.analysisHash}</code>
      <p className="mt-2 break-all text-[#b0abb5]">Signal ID: {s.id}</p>
      {s.systemFingerprint ? <p className="mt-2 break-all text-[#b0abb5]">Provider serving fingerprint: {s.systemFingerprint}</p> : null}
      {s.providerResponseId ? <p className="mt-2 break-all text-[#b0abb5]">Provider response ID: {s.providerResponseId}</p> : null}
      <pre className="mt-3 whitespace-pre-wrap break-words rounded bg-black/20 p-3">{s.originalAnalysis}</pre>
      <details className="mt-3"><summary className="cursor-pointer">Original data snapshot</summary><pre className="mt-2 whitespace-pre-wrap break-words">{JSON.stringify(s.snapshot, null, 2)}</pre></details>
    </details>
  </article>;
}
export default function SignalIntelligence({ marketId, initialSignals, initialCoverage }: { marketId: string; initialSignals?: AISignal[]; initialCoverage?: SignalCoverageRecord }) {
  const query = useQuery({ queryKey: ['market-signals', marketId], queryFn: async () => {
    const response = await fetch(`/api/markets/${encodeURIComponent(marketId)}/signals`);
    if (!response.ok) throw new Error('Signal records unavailable');
    return await response.json() as { signals: AISignal[]; coverage: SignalCoverageRecord | null };
  }, initialData: initialSignals ? { signals: initialSignals, coverage: initialCoverage ?? null } : undefined,
    staleTime: 15_000, refetchInterval: 15_000, retry: 1 });
  const signals = query.data?.signals ?? [];
  const consensus = summarizeSignals(signals);
  const emptyState = generationMessage(query.data?.coverage ?? initialCoverage);
  return <section aria-labelledby="signal-intelligence-title" className="rounded-2xl border border-[#403947] bg-[#1c1b1b] p-5 lg:p-6 space-y-5 text-[#f1eef4]">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="signal-intelligence-title" className="text-lg font-semibold">Signal Intelligence</h2><Link href="/ai-leaderboard" className="text-sm text-[#ddb7ff] underline">Compare AI agents →</Link></div>
    <p className="text-sm text-[#b0abb5]">Independent reasoning perspectives on the same YES/NO question. Ranges express the model’s uncertainty and are not validated statistical intervals.</p>
    {consensus ? <div className="rounded-xl border border-[#403947] bg-black/10 p-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs uppercase tracking-wider text-[#b0abb5]">Median estimate</p><p className="mt-1 text-2xl font-semibold text-[#ddb7ff]">{percent(consensus.median)} YES</p></div>
        <div><p className="text-xs text-[#b0abb5]">Agent disagreement</p><p className="mt-1 text-sm">{percent(consensus.minimum)}–{percent(consensus.maximum)}</p></div>
      </div>
      <ul aria-label="Agent probability estimates" className="mt-3 flex flex-wrap gap-2">{consensus.estimates.map(estimate => <li key={estimate.name} className="rounded-lg border border-white/[0.08] px-3 py-2 text-xs"><span className="text-[#b0abb5]">{estimate.name.replace(' Agent', '')}</span> <strong className="ml-1 text-[#f1eef4]">{percent(estimate.probability)}</strong></li>)}</ul>
    </div> : null}
    {query.isPending ? <p role="status" className="animate-pulse text-sm text-[#b0abb5]">Loading auditable signals…</p>
      : query.isError ? <div role="alert"><p>Signal records are temporarily unavailable.</p><button type="button" onClick={() => void query.refetch()} className="mt-2 text-sm text-[#ddb7ff] underline">Retry</button></div>
      : signals.length ? signals.map(signal => <SignalCard key={signal.id} signal={signal} />)
        : <div className="rounded-xl border border-[#403947] p-4"><h3 className="text-sm font-medium">{emptyState.title}</h3><p className="mt-1 text-sm text-[#b0abb5]">{emptyState.message}</p></div>}
    <p className="text-xs leading-relaxed text-[#b0abb5]">{SIGNAL_DISCLAIMER}</p>
  </section>;
}
