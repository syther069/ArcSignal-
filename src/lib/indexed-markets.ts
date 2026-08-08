import { getSql } from './db';
import type { Market } from './types';

function parseAnalysis(value: unknown) {
  if (!value) return undefined;
  if (typeof value === 'object') return value as Market['analysis'];
  try {
    return JSON.parse(String(value)) as Market['analysis'];
  } catch {
    return undefined;
  }
}

function mapOutcome(outcome: number, resolved: boolean): Market['outcome'] {
  if (!resolved) return 'PENDING';
  if (outcome === 1) return 'FOLLOW';
  if (outcome === 2) return 'FADE';
  return 'CANCELLED';
}

function mapStatus(row: Record<string, unknown>, nowUnix: number): Market['status'] {
  const status = String(row.status ?? '');
  if (status === 'VOIDED' || (Boolean(row.resolved) && Number(row.outcome) === 0)) return 'VOIDED';
  if (status === 'RESOLVED' || Boolean(row.resolved)) return 'RESOLVED';
  if (status === 'CLOSED') return 'CLOSED';
  if (status === 'PENDING_RESOLUTION') return 'PENDING_RESOLUTION';
  return Number(row.resolution_time) <= nowUnix ? 'PENDING_RESOLUTION' : 'OPEN';
}

export async function getIndexedMarkets(limit: number, offset: number): Promise<Market[]> {
  const sql = getSql();
  const rows = await sql`
    select market_id, category, question, analysis_json, resolution_time,
           follow_pool, fade_pool, resolved, outcome, status
    from markets_index
    order by resolution_time desc
    limit ${limit} offset ${offset}
  `;
  const nowUnix = Math.floor(Date.now() / 1000);

  return rows.map((row) => {
    const resolved = Boolean(row.resolved);
    const outcome = Number(row.outcome ?? 0);
    return {
      marketId: String(row.market_id),
      category: String(row.category).toUpperCase() === 'FOOTBALL' ? 'FOOTBALL' : 'CRYPTO',
      question: String(row.question),
      resolutionTime: Number(row.resolution_time),
      followPool: BigInt(String(row.follow_pool ?? 0)),
      fadePool: BigInt(String(row.fade_pool ?? 0)),
      resolved,
      outcome: mapOutcome(outcome, resolved),
      status: mapStatus(row, nowUnix),
      analysis: parseAnalysis(row.analysis_json),
      resolutionReason: resolved
        ? outcome === 0 ? 'Market voided; eligible stakes may be refunded.' : 'Resolved on-chain.'
        : undefined,
    };
  });
}
