import { getSql } from './db';
import type { Market } from './types';
import { deriveMarketStatus, mapOutcome, mapCategory } from './parimutuel-math';

const MARKET_INDEX_TIMEOUT_MS = 6_000;

function parseAnalysis(value: unknown) {
  if (!value) return undefined;
  if (typeof value === 'object') return value as Market['analysis'];
  try {
    return JSON.parse(String(value)) as Market['analysis'];
  } catch {
    return undefined;
  }
}

export async function getIndexedMarkets(limit: number, offset: number): Promise<Market[]> {
  const sql = getSql();
  const query = sql`
    select market_id, category, question, analysis_json, resolution_time,
           follow_pool, fade_pool, resolved, outcome, status
    from markets_index
    order by resolution_time desc
    limit ${limit} offset ${offset}
  `;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Market index query timed out after ${MARKET_INDEX_TIMEOUT_MS}ms`)),
        MARKET_INDEX_TIMEOUT_MS,
      );
    });
    const rows = await Promise.race([query, timeout]);
    const nowUnix = Math.floor(Date.now() / 1000);

    return rows.map((row) => {
      const resolved = Boolean(row.resolved);
      const outcome = Number(row.outcome ?? 0);
      const resolutionTime = Number(row.resolution_time);

      return {
        marketId: String(row.market_id),
        category: mapCategory(String(row.category)),
        question: String(row.question),
        resolutionTime,
        followPool: BigInt(String(row.follow_pool ?? 0)),
        fadePool: BigInt(String(row.fade_pool ?? 0)),
        resolved,
        outcome: mapOutcome(resolved, outcome),
        status: deriveMarketStatus({
          resolved,
          outcome,
          statusString: String(row.status ?? ''),
          resolutionTime,
          nowUnix,
        }),
        analysis: parseAnalysis(row.analysis_json),
        resolutionReason: resolved
          ? outcome === 0 ? 'Market voided; eligible stakes may be refunded.' : 'Resolved on-chain.'
          : undefined,
      };
    });
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function getIndexedMarketById(marketId: string): Promise<Market | null> {
  const sql = getSql();
  const query = sql`
    select market_id, category, question, analysis_json, resolution_time,
           follow_pool, fade_pool, resolved, outcome, status
    from markets_index
    where market_id = ${marketId}
    limit 1
  `;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Market index query for ${marketId} timed out after ${MARKET_INDEX_TIMEOUT_MS}ms`)),
        MARKET_INDEX_TIMEOUT_MS,
      );
    });
    const rows = await Promise.race([query, timeout]);
    if (!rows || rows.length === 0) return null;

    const row = rows[0];
    const resolved = Boolean(row.resolved);
    const outcome = Number(row.outcome ?? 0);
    const resolutionTime = Number(row.resolution_time);
    const nowUnix = Math.floor(Date.now() / 1000);

    return {
      marketId: String(row.market_id),
      category: mapCategory(String(row.category)),
      question: String(row.question),
      resolutionTime,
      followPool: BigInt(String(row.follow_pool ?? 0)),
      fadePool: BigInt(String(row.fade_pool ?? 0)),
      resolved,
      outcome: mapOutcome(resolved, outcome),
      status: deriveMarketStatus({
        resolved,
        outcome,
        statusString: String(row.status ?? ''),
        resolutionTime,
        nowUnix,
      }),
      analysis: parseAnalysis(row.analysis_json),
      resolutionReason: resolved
        ? outcome === 0 ? 'Market voided; eligible stakes may be refunded.' : 'Resolved on-chain.'
        : undefined,
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

