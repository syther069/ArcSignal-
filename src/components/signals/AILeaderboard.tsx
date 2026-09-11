'use client';
import Link from 'next/link';
import type { AgentLeaderboardEntry, ScoringMetrics } from '@/lib/signal-intelligence/types';
import { modelVersionLabel, modelVersionExplanation } from '@/lib/signal-intelligence/model-identity';

const percent = (n: number | null) => n === null ? '—' : `${(n * 100).toFixed(1)}%`;
const number = (n: number | null) => n === null ? '—' : n.toFixed(3);
export const sampleLabel = (resolved: number) => resolved === 0 ? 'Unscored' : resolved < 5 ? 'Early result' : resolved < 20 ? 'Limited sample' : 'Established history';
function Breakdown({ values }: { values: Record<string, ScoringMetrics> }) {
  if (!Object.keys(values).length) return <p className="text-xs text-[#b0abb5]">No predictions in this group yet.</p>;
  return <div className="overflow-x-auto"><table className="w-full text-left text-xs whitespace-nowrap">
    <thead className="text-[#b0abb5]"><tr>{['Group', 'Resolved', 'Pending', 'Excluded', 'Accuracy', 'Brier', 'Log loss', 'Calibration error', 'Confidence'].map(label => <th scope="col" className="py-2 pr-4 font-medium" key={label}>{label}</th>)}</tr></thead>
    <tbody>{Object.entries(values).map(([label, stats]) => <tr key={label} className="border-t border-[#403947]">
      <th scope="row" className="py-2 pr-4 font-medium">{label}</th><td>{stats.resolved}</td><td>{stats.pending}</td><td>{stats.excluded}</td>
      <td>{percent(stats.accuracy)}</td><td>{number(stats.brierScore)}</td><td>{number(stats.logLoss)}</td><td>{percent(stats.calibrationScore)}</td><td>{percent(stats.averageConfidence)}</td>
    </tr>)}</tbody>
  </table></div>;
}
export default function AILeaderboard({ entries }: { entries: AgentLeaderboardEntry[] }) {
  return <div className="space-y-6">
    <div className="overflow-x-auto rounded-xl border border-[#403947]">
      <table className="w-full text-left text-sm whitespace-nowrap"><caption className="sr-only">AI agents ranked by lowest Brier score using resolved predictions only</caption>
        <thead className="bg-[#1c1b1b] text-xs text-[#b0abb5]"><tr>{['Rank', 'Agent / model', 'Accuracy ↑', 'Brier ↓', 'Log loss ↓', 'Calibration error ↓', 'Avg. confidence', 'Resolved', 'Pending'].map(label => <th scope="col" className="px-4 py-3 font-medium" key={label}>{label}</th>)}</tr></thead>
        <tbody>{entries.map(entry => <tr key={entry.agent.id} className="border-t border-[#403947]">
          <td className="p-4 text-[#ddb7ff]">{entry.rank ?? '—'}</td>
          <th scope="row" className="p-4 font-normal"><a href={`#agent-${entry.agent.id}`} onClick={() => {
            const details = document.getElementById(`agent-${entry.agent.id}`);
            if (details instanceof HTMLDetailsElement) details.open = true;
          }} className="font-medium text-[#f1eef4] underline underline-offset-4">{entry.agent.name}</a><span className="ml-2 rounded-full border border-[#ddb7ff]/20 bg-[#ddb7ff]/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#ddb7ff]">{sampleLabel(entry.resolved)}</span><p className="mt-1 text-xs text-[#b0abb5]">{entry.agent.modelProvider} · {entry.agent.modelName}</p><p className="mt-1 text-xs text-[#b0abb5]">{modelVersionLabel(entry.agent)}</p></th>
          <td className="p-4">{percent(entry.accuracy)}</td><td className="p-4">{number(entry.brierScore)}</td><td className="p-4">{number(entry.logLoss)}</td><td className="p-4">{percent(entry.calibrationScore)}</td><td className="p-4">{percent(entry.averageConfidence)}</td><td className="p-4">{entry.resolved}</td><td className="p-4">{entry.pending}</td>
        </tr>)}</tbody>
      </table>
    </div>
    {entries.length === 0 ? <div className="rounded-xl border border-[#403947] p-6"><h2 className="font-semibold">No agent history yet</h2><p className="mt-2 text-sm text-[#b0abb5]">Agents appear after their first real prediction is recorded. Rankings appear only after verified market resolution.</p><Link href="/markets" className="mt-3 inline-block text-sm text-[#ddb7ff] underline">Explore markets</Link></div> : null}
    {entries.map(entry => <details id={`agent-${entry.agent.id}`} key={entry.agent.id} className="rounded-xl border border-[#403947] p-4 scroll-mt-24">
      <summary className="cursor-pointer font-medium">{entry.agent.name} · Category, time horizon, and calibration</summary>
      <p className="mt-3 text-sm text-[#b0abb5]">{entry.agent.description} {entry.agent.reasoningStyle}</p>
      {modelVersionExplanation(entry.agent) ? <p className="mt-2 text-xs text-[#b0abb5]">{modelVersionExplanation(entry.agent)}</p> : null}
      <p className="mt-2 text-xs text-[#b0abb5]">{entry.agent.modelProvider} · {entry.agent.status} · Created {entry.agent.createdAt} · {entry.total} total predictions · {entry.excluded} excluded</p>
      <p className="mt-2 text-xs text-[#b0abb5]">Last updated: {entry.updatedAt ?? 'No predictions'}</p>
      <p className="mt-2 text-xs text-[#ddb7ff]">Sample status: {sampleLabel(entry.resolved)} · {entry.resolved} resolved prediction{entry.resolved === 1 ? '' : 's'}</p>
      {!entry.resolved ? <p className="mt-3 text-sm text-[#b0abb5]">No scored outcomes yet. {entry.pending} pending predictions are shown below for coverage, but do not contribute to performance.</p> : null}
      <div className="mt-5 space-y-5"><div><h3 className="mb-2 text-sm font-medium">By category</h3><Breakdown values={entry.byCategory} /></div><div><h3 className="mb-2 text-sm font-medium">By time horizon</h3><Breakdown values={entry.byTimeHorizon} /></div></div>
      <div className="mt-5 overflow-x-auto"><table className="w-full text-left text-xs"><caption className="mb-2 text-left text-sm font-medium">Calibration: predicted YES probability vs. observed YES frequency</caption><thead className="text-[#b0abb5]"><tr>{['Probability bucket', 'Predictions', 'Average estimate', 'Observed YES'].map(t => <th scope="col" key={t} className="py-2 pr-4">{t}</th>)}</tr></thead><tbody>{entry.calibration.map(bucket => <tr key={bucket.lower} className="border-t border-[#403947]"><th scope="row" className="py-2 pr-4 font-normal">{Math.round(bucket.lower * 100)}–{Math.round(bucket.upper * 100)}%</th><td>{bucket.count}</td><td>{percent(bucket.predicted)}</td><td>{percent(bucket.observed)}</td></tr>)}</tbody></table></div>
      <h3 className="mt-5 text-sm font-medium">Recent prediction records</h3>
      <ul className="mt-2 space-y-3 text-xs text-[#b0abb5]">{entry.predictions.map(signal => <li key={signal.id}>
        <Link className="text-[#ddb7ff] underline" href={`/market/${encodeURIComponent(signal.marketId)}#signal-${signal.id}`}>{signal.question}</Link>
        <p className="mt-1">{percent(signal.probability)} YES · {signal.status} · Result {signal.finalResult ?? 'pending'} · {signal.generatedAt}</p>
      </li>)}</ul>
    </details>)}
  </div>;
}
