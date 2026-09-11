import { getSql } from './db';
import type { Market } from './types';
import { deriveMarketStatus, mapOutcome, mapCategory } from './parimutuel-math';
import { CANCELLATION_REFUNDS_ENABLED } from './contracts';

const MARKET_INDEX_TIMEOUT_MS = 6_000;

export interface GeneratedMarketIndexRecord {
  marketId: string;
  category: string;
  question: string;
  analysisJson: string;
  resolutionTime: bigint;
  createdBlock: bigint;
  protocolVersion?: 1 | 2;
  contractAddress?: string;
  categoryId?: number;
  categoryVersion?: number;
  oraclePolicyId?: number;
  oraclePolicyVersion?: number;
  termsHash?: string;
  resolutionSourceHash?: string;
}

export interface MarketIndexHealth {
  lastBlock: bigint;
  updatedAtMs: number;
}

export const MARKET_INDEX_MAX_AGE_MS = 10 * 60_000;
// Arc ~0.5s blocks and the production indexer runs every 5 minutes (~600 blocks).
// 20 blocks (~10s) made a healthy index look unusable between cron runs.
export const MARKET_INDEX_MAX_LAG_BLOCKS = 2000n;

export function isMarketIndexUsable(
  health: MarketIndexHealth | null,
  latestBlock: bigint,
  nowMs = Date.now(),
): boolean {
  if (!health) return false;
  const ageMs = nowMs - health.updatedAtMs;
  const lag = latestBlock - health.lastBlock;
  return ageMs >= 0
    && ageMs <= MARKET_INDEX_MAX_AGE_MS
    && lag >= 0n
    && lag <= MARKET_INDEX_MAX_LAG_BLOCKS;
}

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
    where coalesce(protocol_version, 1) = 1
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
          ? outcome === 0
            ? CANCELLATION_REFUNDS_ENABLED
              ? 'Market cancelled; participants may claim their staked amount.'
              : 'Market cancelled; the selected legacy contract has no participant refund path.'
            : 'Resolved on-chain.'
          : undefined,
      };
    });
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function getMarketIndexHealth(): Promise<MarketIndexHealth | null> {
  const sql = getSql();
  const query = sql`
    select last_block, updated_at
    from sync_state
    where id = 'arc-main'
    limit 1
  `;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Market index health query timed out after ${MARKET_INDEX_TIMEOUT_MS}ms`)),
        MARKET_INDEX_TIMEOUT_MS,
      );
    });
    const rows = await Promise.race([query, timeout]);
    if (!rows || rows.length === 0) return null;

    const updatedAtMs = Date.parse(String(rows[0].updated_at));
    if (!Number.isFinite(updatedAtMs)) return null;
    return {
      lastBlock: BigInt(String(rows[0].last_block)),
      updatedAtMs,
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Make a newly confirmed market visible immediately. The event indexer remains
 * authoritative and will reconcile this projection from finalized chain logs.
 */
export async function upsertGeneratedMarketIndex(record: GeneratedMarketIndexRecord) {
  const sql = getSql();
  await sql`
    insert into markets_index (
      market_id, category, question, analysis_json, resolution_time,
      follow_pool, fade_pool, resolved, outcome, status, created_block, updated_block,
      protocol_version, contract_address, category_id, category_version,
      oracle_policy_id, oracle_policy_version, terms_hash, resolution_source_hash
    ) values (
      ${record.marketId}, ${record.category}, ${record.question}, ${record.analysisJson},
      ${record.resolutionTime}, 0, 0, false, 0, 'OPEN',
      ${record.createdBlock}, ${record.createdBlock},
      ${record.protocolVersion ?? 1}, ${record.contractAddress ?? null},
      ${record.categoryId ?? null}, ${record.categoryVersion ?? null},
      ${record.oraclePolicyId ?? null}, ${record.oraclePolicyVersion ?? null},
      ${record.termsHash ?? null}, ${record.resolutionSourceHash ?? null}
    )
    on conflict (market_id) do update set
      category = excluded.category,
      question = excluded.question,
      analysis_json = excluded.analysis_json,
      resolution_time = excluded.resolution_time,
      protocol_version = excluded.protocol_version,
      contract_address = excluded.contract_address,
      category_id = excluded.category_id,
      category_version = excluded.category_version,
      oracle_policy_id = excluded.oracle_policy_id,
      oracle_policy_version = excluded.oracle_policy_version,
      terms_hash = excluded.terms_hash,
      resolution_source_hash = excluded.resolution_source_hash,
      created_block = case
        when markets_index.created_block is null or markets_index.created_block = 0
          then excluded.created_block
        else least(markets_index.created_block, excluded.created_block)
      end,
      updated_block = greatest(coalesce(markets_index.updated_block, 0), excluded.updated_block),
      updated_at = now()
  `;
}

export async function getIndexedMarketById(marketId: string): Promise<Market | null> {
  const sql = getSql();
  const query = sql`
    select market_id, category, question, analysis_json, resolution_time,
           follow_pool, fade_pool, resolved, outcome, status, protocol_version,
           contract_address, category_id, category_version, oracle_policy_id,
           oracle_policy_version, terms_hash, resolution_source_hash
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
      protocolVersion: Number(row.protocol_version ?? 1) === 2 ? 2 : 1,
      contractAddress: row.contract_address ? String(row.contract_address) : undefined,
      proof: Number(row.protocol_version ?? 1) === 2
        ? {
          marketAddress: row.contract_address ? String(row.contract_address) : '',
          ammAddress: '',
          yesTokenAddress: '',
          noTokenAddress: '',
          collateralAddress: '',
          oracleAdapterAddress: '',
          categoryId: row.category_id === null ? 0 : Number(row.category_id),
          categoryVersion: row.category_version === null ? 0 : Number(row.category_version),
          oraclePolicyId: row.oracle_policy_id === null ? 0 : Number(row.oracle_policy_id),
          oraclePolicyVersion: row.oracle_policy_version === null ? 0 : Number(row.oracle_policy_version),
          feeVersion: 0,
          metadataSchemaVersion: 1,
          termsHash: row.terms_hash ? String(row.terms_hash) : '',
          resolutionSourceHash: row.resolution_source_hash ? String(row.resolution_source_hash) : '',
          ancillaryDataHash: '',
          metadataURI: '',
          liveness: 0,
          voidAfter: 0,
          oracleState: 'INDEXING',
          oracleRequestKey: null,
          resolutionRequestedAt: null,
          indexedThroughBlock: undefined,
        }
        : undefined,
      analysis: parseAnalysis(row.analysis_json),
      resolutionReason: resolved
        ? outcome === 0
          ? CANCELLATION_REFUNDS_ENABLED
            ? 'Market cancelled; participants may claim their staked amount.'
            : 'Market cancelled; the selected legacy contract has no participant refund path.'
          : 'Resolved on-chain.'
        : undefined,
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

