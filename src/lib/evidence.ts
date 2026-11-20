import { getSql } from '@/lib/db';
import { hashRecord } from '@/lib/signal-intelligence/audit';
import { extractJson, grokSearch } from '@/lib/xai';
import { evidencePrompt, parseEvidenceReply, type EvidencePack } from '@/lib/evidence-shared';

/** Markets that closed in the last 6 hours and have no evidence pack yet. */
export async function getEvidenceCandidates(limit = 3) {
  const rows = await getSql()`
    select m.market_id, m.question, m.resolution_time, m.analysis_json from markets_index m
    left join resolution_evidence e on e.market_id = m.market_id
    where e.market_id is null
      and m.resolution_time <= extract(epoch from now()) and m.resolution_time > extract(epoch from now()) - 6 * 3600
    order by m.resolution_time asc limit ${Math.max(1, Math.min(10, limit))}
  `;
  return rows.map((r) => ({
    marketId: String(r.market_id), question: String(r.question), closesAt: Number(r.resolution_time),
    rules: typeof (r.analysis_json as Record<string, unknown> | null)?.resolutionCriteria === 'string'
      ? String((r.analysis_json as Record<string, unknown>).resolutionCriteria) : null,
  }));
}

export async function buildEvidencePack(marketId: string, question: string, rules: string | null, closesAt: number): Promise<EvidencePack> {
  const result = await grokSearch({ prompt: evidencePrompt(question, rules, closesAt), sources: ['web', 'x'], lookbackDays: 2, maxTurns: 3 });
  const parsed = parseEvidenceReply(extractJson(result.text));
  const record = { marketId, ...parsed, citations: result.citations.slice(0, 5), model: result.model, createdAt: new Date().toISOString() };
  return { ...record, evidenceHash: hashRecord(record) };
}

export async function storeEvidencePack(p: EvidencePack) {
  await getSql()`insert into resolution_evidence (market_id, likely_result, summary, citations, model, evidence_hash, created_at)
    values (${p.marketId}, ${p.likelyResult}, ${p.summary}, ${JSON.stringify(p.citations)}::jsonb, ${p.model}, ${p.evidenceHash}, ${p.createdAt})
    on conflict (market_id) do nothing`;
}

export async function getEvidencePack(marketId: string): Promise<EvidencePack | null> {
  const rows = await getSql()`select * from resolution_evidence where market_id = ${marketId}`;
  const r = rows[0];
  if (!r) return null;
  return { marketId: String(r.market_id), likelyResult: r.likely_result, summary: String(r.summary), citations: r.citations,
    model: String(r.model), evidenceHash: String(r.evidence_hash), createdAt: new Date(r.created_at).toISOString() };
}
