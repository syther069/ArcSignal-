import { keccak256, stringToHex, toBytes, type Hash } from 'viem';
import { arcTestnet } from '@/lib/contracts';
import { getSql } from '@/lib/db';
import type { ArcSignalLiveMarket, LiveMarketCategory, LiveMarketSource } from './liveMarketTypes';

export const EXTERNAL_SETTLEMENT_SCHEMA = [
  `create table if not exists external_market_settlements (
    chain_id numeric(78, 0) not null,
    live_market_id text not null,
    source text not null,
    external_market_id text not null,
    category text not null,
    question text not null,
    source_url text not null,
    resolution_source text,
    source_probability numeric,
    signal_edge numeric,
    arc_market_id text not null check (arc_market_id ~ '^0x[a-fA-F0-9]{64}$'),
    arc_market_address text check (arc_market_address is null or arc_market_address ~ '^0x[a-fA-F0-9]{40}$'),
    amm_address text check (amm_address is null or amm_address ~ '^0x[a-fA-F0-9]{40}$'),
    create_tx_hash text check (create_tx_hash is null or create_tx_hash ~ '^0x[a-fA-F0-9]{64}$'),
    status text not null check (status in ('SELECTED', 'PROMOTED', 'OPEN', 'CLOSED', 'SOURCE_PENDING', 'SOURCE_RESOLVED', 'SOURCE_AMBIGUOUS', 'RESOLVED', 'VOIDED', 'FAILED')),
    source_outcome text check (source_outcome in ('YES', 'NO', 'UNDETERMINED')),
    source_outcome_observed_at timestamptz,
    source_outcome_evidence jsonb,
    last_checked_at timestamptz,
    resolution_tx_hash text check (resolution_tx_hash is null or resolution_tx_hash ~ '^0x[a-fA-F0-9]{64}$'),
    void_tx_hash text check (void_tx_hash is null or void_tx_hash ~ '^0x[a-fA-F0-9]{64}$'),
    error_message text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (chain_id, live_market_id),
    unique (chain_id, arc_market_id)
  )`,
  `create index if not exists external_market_settlements_status_idx
    on external_market_settlements (chain_id, status, last_checked_at)`,
  `create index if not exists external_market_settlements_arc_market_idx
    on external_market_settlements (chain_id, lower(arc_market_id))`,
] as const;

export type ExternalSettlementStatus =
  | 'SELECTED'
  | 'PROMOTED'
  | 'OPEN'
  | 'CLOSED'
  | 'SOURCE_PENDING'
  | 'SOURCE_RESOLVED'
  | 'SOURCE_AMBIGUOUS'
  | 'RESOLVED'
  | 'VOIDED'
  | 'FAILED';

export type ExternalSettlementRecord = {
  liveMarketId: string;
  source: LiveMarketSource;
  externalMarketId: string;
  category: LiveMarketCategory;
  question: string;
  sourceUrl: string;
  resolutionSource?: string;
  sourceProbability?: number;
  signalEdge?: number;
  arcMarketId: Hash;
  arcMarketAddress?: `0x${string}`;
  ammAddress?: `0x${string}`;
  createTxHash?: Hash;
  status: ExternalSettlementStatus;
  sourceOutcome?: 'YES' | 'NO' | 'UNDETERMINED';
  sourceOutcomeObservedAt?: string;
  lastCheckedAt?: string;
  errorMessage?: string;
};

type SettlementRow = Record<string, unknown>;

const CATEGORY_IDS: Record<LiveMarketCategory, number> = {
  crypto: 1,
  politics: 3,
  technology: 4,
  economics: 5,
};

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function hashCommitment(value: unknown): Hash {
  return keccak256(toBytes(stableJson(value)));
}

export function externalArcMarketId(liveMarket: Pick<ArcSignalLiveMarket, 'id' | 'source' | 'externalMarketId'>): Hash {
  return keccak256(toBytes(`arcsignal:v2:external:${liveMarket.source}:${liveMarket.externalMarketId ?? liveMarket.id}`));
}

export function categoryIdForLiveMarket(category: LiveMarketCategory) {
  return CATEGORY_IDS[category];
}

export function buildExternalMarketCommitment(liveMarket: ArcSignalLiveMarket) {
  const marketId = externalArcMarketId(liveMarket);
  const sourceCommitment = {
    source: liveMarket.source,
    externalMarketId: liveMarket.externalMarketId ?? liveMarket.id,
    sourceUrl: liveMarket.sourceUrl,
    resolutionSource: liveMarket.resolutionSource ?? null,
  };
  const settlementRules = {
    protocol: 'ArcSignal V2 external-market mirror',
    question: liveMarket.question,
    source: sourceCommitment,
    closeTime: liveMarket.endDate ?? liveMarket.resolutionDate ?? null,
    rule: 'ArcSignal records this source as evidence. Final Arc payouts follow the V2 oracle-settled YES, NO, or UNDETERMINED result.',
    ambiguityPolicy: 'If the committed source cannot establish a clear binary result before the V2 void deadline, the market should resolve UNDETERMINED and become void/refundable.',
  };
  const termsHash = hashCommitment(settlementRules);
  const resolutionSourceHash = hashCommitment(sourceCommitment);
  const ancillaryPayload = {
    kind: 'arcsignal.external-settlement.v1',
    marketId,
    question: liveMarket.question,
    category: liveMarket.category,
    source: liveMarket.source,
    externalMarketId: liveMarket.externalMarketId ?? liveMarket.id,
    sourceUrl: liveMarket.sourceUrl,
    resolutionSource: liveMarket.resolutionSource ?? null,
    sourceProbability: liveMarket.marketProbability,
    generatedAt: new Date().toISOString(),
    rules: settlementRules.rule,
    ambiguityPolicy: settlementRules.ambiguityPolicy,
  };
  const ancillaryJson = stableJson(ancillaryPayload);
  if (toBytes(ancillaryJson).length > 4096) throw new Error(`External settlement ancillary data is too large for ${liveMarket.id}`);

  return {
    marketId,
    categoryId: categoryIdForLiveMarket(liveMarket.category),
    termsHash,
    resolutionSourceHash,
    ancillaryData: stringToHex(ancillaryJson),
    ancillaryPayload,
    metadataURI: `arcsignal://v2/external/${encodeURIComponent(liveMarket.source)}/${encodeURIComponent(liveMarket.externalMarketId ?? liveMarket.id)}`,
  };
}

function mapRow(row: SettlementRow): ExternalSettlementRecord {
  return {
    liveMarketId: String(row.live_market_id),
    source: String(row.source) as LiveMarketSource,
    externalMarketId: String(row.external_market_id),
    category: String(row.category) as LiveMarketCategory,
    question: String(row.question),
    sourceUrl: String(row.source_url),
    resolutionSource: row.resolution_source === null ? undefined : String(row.resolution_source),
    sourceProbability: row.source_probability === null ? undefined : Number(row.source_probability),
    signalEdge: row.signal_edge === null ? undefined : Number(row.signal_edge),
    arcMarketId: String(row.arc_market_id) as Hash,
    arcMarketAddress: row.arc_market_address === null ? undefined : String(row.arc_market_address) as `0x${string}`,
    ammAddress: row.amm_address === null ? undefined : String(row.amm_address) as `0x${string}`,
    createTxHash: row.create_tx_hash === null ? undefined : String(row.create_tx_hash) as Hash,
    status: String(row.status) as ExternalSettlementStatus,
    sourceOutcome: row.source_outcome === null ? undefined : String(row.source_outcome) as 'YES' | 'NO' | 'UNDETERMINED',
    sourceOutcomeObservedAt: row.source_outcome_observed_at === null ? undefined : new Date(String(row.source_outcome_observed_at)).toISOString(),
    lastCheckedAt: row.last_checked_at === null ? undefined : new Date(String(row.last_checked_at)).toISOString(),
    errorMessage: row.error_message === null ? undefined : String(row.error_message),
  };
}

export async function ensureExternalSettlementSchema() {
  const sql = getSql();
  for (const statement of EXTERNAL_SETTLEMENT_SCHEMA) await sql.query(statement);
}

export async function getExternalSettlementsByLiveIds(liveMarketIds: string[]) {
  if (liveMarketIds.length === 0) return new Map<string, ExternalSettlementRecord>();
  try {
    const rows = await getSql()`
      select * from external_market_settlements
      where chain_id = ${BigInt(arcTestnet.id)} and live_market_id = any(${liveMarketIds})
    `;
    return new Map(rows.map((row) => [String(row.live_market_id), mapRow(row as SettlementRow)]));
  } catch (error) {
    if (error instanceof Error && /external_market_settlements/i.test(error.message)) {
      return new Map<string, ExternalSettlementRecord>();
    }
    throw error;
  }
}

export async function getExternalSettlementsByArcMarketIds(arcMarketIds: string[]) {
  if (arcMarketIds.length === 0) return new Map<string, ExternalSettlementRecord>();
  try {
    const rows = await getSql()`
      select * from external_market_settlements
      where chain_id = ${BigInt(arcTestnet.id)} and lower(arc_market_id) = any(${arcMarketIds.map((id) => id.toLowerCase())})
    `;
    return new Map(rows.map((row) => [String(row.arc_market_id).toLowerCase(), mapRow(row as SettlementRow)]));
  } catch (error) {
    if (error instanceof Error && /external_market_settlements/i.test(error.message)) {
      return new Map<string, ExternalSettlementRecord>();
    }
    throw error;
  }
}
export async function getExternalSettlementByArcMarketId(marketId: string) {
  try {
    const rows = await getSql()`
      select * from external_market_settlements
      where chain_id = ${BigInt(arcTestnet.id)} and lower(arc_market_id) = lower(${marketId}) limit 1
    `;
    return rows[0] ? mapRow(rows[0] as SettlementRow) : null;
  } catch (error) {
    if (error instanceof Error && /external_market_settlements/i.test(error.message)) return null;
    throw error;
  }
}

export async function upsertExternalSettlementPromotion(input: {
  liveMarket: ArcSignalLiveMarket;
  arcMarketId: Hash;
  arcMarketAddress?: `0x${string}`;
  ammAddress?: `0x${string}`;
  createTxHash?: Hash;
  status: ExternalSettlementStatus;
}) {
  await ensureExternalSettlementSchema();
  const { liveMarket, arcMarketId } = input;
  const rows = await getSql()`
    insert into external_market_settlements (
      chain_id, live_market_id, source, external_market_id, category, question, source_url,
      resolution_source, source_probability, signal_edge, arc_market_id, arc_market_address,
      amm_address, create_tx_hash, status, updated_at
    ) values (
      ${BigInt(arcTestnet.id)}, ${liveMarket.id}, ${liveMarket.source}, ${liveMarket.externalMarketId ?? liveMarket.id},
      ${liveMarket.category}, ${liveMarket.question}, ${liveMarket.sourceUrl}, ${liveMarket.resolutionSource ?? null},
      ${liveMarket.marketProbability}, ${liveMarket.signalEdge ?? null}, ${arcMarketId}, ${input.arcMarketAddress ?? null},
      ${input.ammAddress ?? null}, ${input.createTxHash ?? null}, ${input.status}, now()
    ) on conflict (chain_id, live_market_id) do update set
      question = excluded.question,
      source_url = excluded.source_url,
      resolution_source = excluded.resolution_source,
      source_probability = excluded.source_probability,
      signal_edge = excluded.signal_edge,
      arc_market_id = excluded.arc_market_id,
      arc_market_address = coalesce(excluded.arc_market_address, external_market_settlements.arc_market_address),
      amm_address = coalesce(excluded.amm_address, external_market_settlements.amm_address),
      create_tx_hash = coalesce(excluded.create_tx_hash, external_market_settlements.create_tx_hash),
      status = excluded.status,
      error_message = null,
      updated_at = now()
    returning *
  `;
  return mapRow(rows[0] as SettlementRow);
}

export async function markExternalSettlementFailure(liveMarket: ArcSignalLiveMarket, arcMarketId: Hash, message: string) {
  await ensureExternalSettlementSchema();
  const rows = await getSql()`
    insert into external_market_settlements (
      chain_id, live_market_id, source, external_market_id, category, question, source_url,
      resolution_source, source_probability, signal_edge, arc_market_id, status, error_message, updated_at
    ) values (
      ${BigInt(arcTestnet.id)}, ${liveMarket.id}, ${liveMarket.source}, ${liveMarket.externalMarketId ?? liveMarket.id},
      ${liveMarket.category}, ${liveMarket.question}, ${liveMarket.sourceUrl}, ${liveMarket.resolutionSource ?? null},
      ${liveMarket.marketProbability}, ${liveMarket.signalEdge ?? null}, ${arcMarketId}, 'FAILED', ${message}, now()
    ) on conflict (chain_id, live_market_id) do update set
      status = 'FAILED', error_message = excluded.error_message, updated_at = now()
    returning *
  `;
  return mapRow(rows[0] as SettlementRow);
}

export async function listPromotedExternalSettlements(limit = 60) {
  await ensureExternalSettlementSchema();
  const rows = await getSql()`
    select * from external_market_settlements
    where chain_id = ${BigInt(arcTestnet.id)}
      and status in ('PROMOTED', 'OPEN', 'SOURCE_PENDING')
      and arc_market_address is not null
      and amm_address is not null
    order by updated_at desc
    limit ${limit}
  `;
  return rows.map((row) => mapRow(row as SettlementRow));
}

export async function listExternalSettlementsForReconciliation(limit = 60) {
  await ensureExternalSettlementSchema();
  const rows = await getSql()`
    select s.* from external_market_settlements s
    left join markets_v2 m on m.chain_id = s.chain_id and lower(m.market_id) = lower(s.arc_market_id)
    where s.chain_id = ${BigInt(arcTestnet.id)}
      and s.status not in ('RESOLVED', 'VOIDED', 'FAILED')
      and (s.last_checked_at is null or s.last_checked_at < now() - interval '15 minutes')
      and (m.market_state is null or m.market_state in ('OPEN', 'CLOSED', 'RESOLVED', 'VOIDED'))
    order by coalesce(m.close_time, 0) asc, s.created_at asc
    limit ${limit}
  `;
  return rows.map((row) => mapRow(row as SettlementRow));
}

export async function updateExternalSettlementOutcome(input: {
  liveMarketId: string;
  status: ExternalSettlementStatus;
  sourceOutcome?: 'YES' | 'NO' | 'UNDETERMINED';
  evidence?: unknown;
  errorMessage?: string;
}) {
  await ensureExternalSettlementSchema();
  const rows = await getSql()`
    update external_market_settlements set
      status = ${input.status},
      source_outcome = ${input.sourceOutcome ?? null},
      source_outcome_observed_at = ${input.sourceOutcome ? new Date().toISOString() : null},
      source_outcome_evidence = ${input.evidence ? JSON.stringify(input.evidence) : null}::jsonb,
      last_checked_at = now(),
      error_message = ${input.errorMessage ?? null},
      updated_at = now()
    where chain_id = ${BigInt(arcTestnet.id)} and live_market_id = ${input.liveMarketId}
    returning *
  `;
  return rows[0] ? mapRow(rows[0] as SettlementRow) : null;
}

