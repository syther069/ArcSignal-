import { getSql } from '@/lib/db';
import { validateAnalysis, verifyAnalysis } from './audit';
import { buildLeaderboard, scorePrediction } from './scoring';
import type { AIAgent, AISignal, SignalAnalysis, SignalCoverageRecord, SignalResolution } from './types';

export async function getAgents(): Promise<AIAgent[]> {
  const rows = await getSql()`select profile, status, created_at from ai_agents order by id`;
  return rows.map(row => ({ ...(row.profile as AIAgent), status: row.status as AIAgent['status'], createdAt: new Date(row.created_at).toISOString() }));
}
export async function getSignals(marketId?: string): Promise<AISignal[]> {
  const sql = getSql();
  const rows = await sql`
    select s.analysis, s.analysis_hash, r.status, r.final_result, r.resolved_at,
           r.resolution_source_url, r.settlement_transaction_hash
    from ai_signals s join signal_scores r on r.signal_id = s.id
    where (${marketId ?? null}::text is null or s.market_id = ${marketId ?? null})
    order by s.generated_at desc, s.id
  `;
  return rows.map(row => {
    const analysis = row.analysis as SignalAnalysis;
    const integrity = row.analysis_hash === analysis.analysisHash && verifyAnalysis(analysis);
    return { ...analysis, status: integrity ? row.status : 'invalid',
      finalResult: row.final_result, resolvedAt: row.resolved_at ? new Date(row.resolved_at).toISOString() : null,
      resolutionSourceUrl: row.resolution_source_url, settlementTransactionHash: row.settlement_transaction_hash } as AISignal;
  });
}
export async function getAILeaderboard() {
  const [agents, signals] = await Promise.all([getAgents(), getSignals()]);
  return buildLeaderboard(agents, signals);
}
export async function getSignalCoverage(marketId?: string, limit = 10_000): Promise<SignalCoverageRecord[]> {
  const rows = await getSql()`
    select m.market_id, m.question, m.category, m.status as market_status, m.resolution_time, m.resolved,
      j.status as generation_status, coalesce(j.attempt_count, 0) as attempt_count,
      j.last_error, j.last_attempt_at, j.next_attempt_at,
      count(s.id)::int as signal_count,
      count(*) filter (where r.status = 'pending' and m.resolved)::int as pending_reconciliation,
      avg((s.analysis->>'probability')::double precision) as consensus_probability,
      percentile_cont(0.5) within group (order by (s.analysis->>'probability')::double precision) as median_probability,
      min((s.analysis->>'probability')::double precision) as minimum_probability,
      max((s.analysis->>'probability')::double precision) as maximum_probability,
      max((s.analysis->>'snapshotAt')::timestamptz) as latest_snapshot_at,
      bool_or(abs(extract(epoch from (s.generated_at - (s.analysis->>'snapshotAt')::timestamptz))) > 120) as stale_snapshot
    from markets_index m
    left join signal_generation_jobs j on j.market_id = m.market_id
    left join ai_signals s on s.market_id = m.market_id
    left join signal_scores r on r.signal_id = s.id
    where (${marketId ?? null}::text is null or m.market_id = ${marketId ?? null})
    group by m.market_id, m.question, m.category, m.status, m.resolution_time, m.resolved,
      j.status, j.attempt_count, j.last_error, j.last_attempt_at, j.next_attempt_at
    order by m.resolution_time desc, m.market_id
    limit ${Math.max(1, Math.min(10_000, Math.floor(limit)))}
  `;
  return rows.map(row => {
    const signalCount = Number(row.signal_count);
    const marketStatus = row.resolved ? 'RESOLVED' : String(row.market_status);
    const generationStatus = signalCount >= 3 ? 'complete'
      : row.generation_status ? String(row.generation_status)
      : row.resolved ? 'predates'
      : marketStatus === 'OPEN' ? 'scheduled' : 'skipped';
    return {
      marketId: String(row.market_id), question: String(row.question), category: String(row.category), marketStatus,
      resolutionTime: Number(row.resolution_time), generationStatus: generationStatus as SignalCoverageRecord['generationStatus'],
      signalCount, missingSignals: Math.max(0, 3 - signalCount), attemptCount: Number(row.attempt_count),
      lastError: row.last_error ? String(row.last_error) : null,
      lastAttemptAt: row.last_attempt_at ? new Date(row.last_attempt_at).toISOString() : null,
      nextAttemptAt: row.next_attempt_at ? new Date(row.next_attempt_at).toISOString() : null,
      latestSnapshotAt: row.latest_snapshot_at ? new Date(row.latest_snapshot_at).toISOString() : null,
      snapshotHealth: !signalCount ? 'missing' : row.stale_snapshot ? 'stale' : 'fresh',
      consensusable: signalCount >= 2, pendingReconciliation: Number(row.pending_reconciliation),
      consensusProbability: row.consensus_probability === null ? null : Number(row.consensus_probability),
      medianProbability: row.median_probability === null ? null : Number(row.median_probability),
      minimumProbability: row.minimum_probability === null ? null : Number(row.minimum_probability),
      maximumProbability: row.maximum_probability === null ? null : Number(row.maximum_probability),
    };
  });
}
export async function storeSignal(agent: AIAgent, signal: SignalAnalysis): Promise<void> {
  validateAnalysis(signal);
  if (agent.id !== signal.agentId) throw new Error('Agent identity mismatch');
  const sql = getSql();
  // One prediction per agent/model per market in MVP prevents repeat submissions gaming rankings.
  // Immutable inserts and all dependent writes commit or roll back together.
  await sql.transaction([
    sql`insert into ai_agents (id, profile) values (${agent.id}, ${JSON.stringify(agent)}::jsonb) on conflict (id) do nothing`,
    sql`insert into ai_signals (id, market_id, agent_id, analysis, analysis_hash, generated_at, previous_signal_id)
        select ${signal.id}, ${signal.marketId}, ${signal.agentId}, ${JSON.stringify(signal)}::jsonb,
          ${signal.analysisHash}, ${signal.generatedAt}::timestamptz, ${signal.previousSignalId}
        from markets_index m join ai_agents a on a.id = ${agent.id}
        where m.market_id = ${signal.marketId} and not m.resolved and m.status = 'OPEN'
          and m.resolution_time > extract(epoch from now()) and a.status = 'active'`,
    sql`insert into signal_scores (signal_id) values (${signal.id})`,
    ...signal.sources.map((source, i) => sql`insert into signal_sources (signal_id, ordinal, name, url, accessed_at)
      values (${signal.id}, ${i}, ${source.name}, ${source.url}, ${source.accessedAt}::timestamptz)`),
  ]);
}
export async function storeResolution(signal: AISignal, resolution: SignalResolution): Promise<void> {
  const metrics = resolution.status === 'resolved' && resolution.finalResult
    ? scorePrediction(signal.probability, resolution.finalResult) : null;
  await getSql()`update signal_scores set status = ${resolution.status}, final_result = ${resolution.finalResult},
    resolved_at = ${resolution.resolvedAt}::timestamptz, resolution_source_url = ${resolution.resolutionSourceUrl},
    settlement_transaction_hash = ${resolution.settlementTransactionHash}, accuracy = ${metrics?.accuracy ?? null},
    brier_score = ${metrics?.brierScore ?? null}, log_loss = ${metrics?.logLoss ?? null}
    where signal_id = ${signal.id} and status = 'pending'`;
}
