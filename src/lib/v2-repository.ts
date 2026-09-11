import { arcTestnet } from './contracts';
import { ARCSIGNAL_V2_ENABLED, ARCSIGNAL_V2_FACTORY_ADDRESS } from './contracts-v2';
import { getSql } from './db';

export type V2MarketRecord = {
  chainId: string;
  marketId: string;
  marketAddress: string;
  ammAddress: string;
  yesTokenAddress: string;
  noTokenAddress: string;
  collateralAddress: string;
  oracleAdapterAddress: string;
  protocolVersion: number;
  metadataSchemaVersion: number;
  categoryId: number;
  categoryVersion: number;
  oraclePolicyId: number;
  oraclePolicyVersion: number;
  feeVersion: number;
  closeTime: number;
  liveness: number;
  voidAfter: number;
  termsHash: string;
  resolutionSourceHash: string;
  ancillaryDataHash: string;
  metadataURI: string;
  marketState: string;
  oracleState: string;
  outcome: string | null;
  oracleRequestKey: string | null;
  resolutionRequestedAt: number | null;
  collateralLiability: string;
  createdBlock: string;
  updatedBlock: string;
  updatedAt: string;
};

type MarketRow = Record<string, unknown>;

function asSafeNumber(value: unknown, field: string) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new Error(`Invalid ${field} in V2 index`);
  return parsed;
}

function mapMarket(row: MarketRow): V2MarketRecord {
  return {
    chainId: String(row.chain_id),
    marketId: String(row.market_id),
    marketAddress: String(row.market_address),
    ammAddress: String(row.amm_address),
    yesTokenAddress: String(row.yes_token_address),
    noTokenAddress: String(row.no_token_address),
    collateralAddress: String(row.collateral_address),
    oracleAdapterAddress: String(row.oracle_adapter_address),
    protocolVersion: asSafeNumber(row.protocol_version, 'protocol version'),
    metadataSchemaVersion: asSafeNumber(row.metadata_schema_version, 'metadata schema version'),
    categoryId: asSafeNumber(row.category_id, 'category ID'),
    categoryVersion: asSafeNumber(row.category_version, 'category version'),
    oraclePolicyId: asSafeNumber(row.oracle_policy_id, 'oracle policy ID'),
    oraclePolicyVersion: asSafeNumber(row.oracle_policy_version, 'oracle policy version'),
    feeVersion: asSafeNumber(row.fee_version, 'fee version'),
    closeTime: asSafeNumber(row.close_time, 'close time'),
    liveness: asSafeNumber(row.liveness, 'liveness'),
    voidAfter: asSafeNumber(row.void_after, 'void deadline'),
    termsHash: String(row.terms_hash),
    resolutionSourceHash: String(row.resolution_source_hash),
    ancillaryDataHash: String(row.ancillary_data_hash),
    metadataURI: String(row.metadata_uri),
    marketState: String(row.market_state),
    oracleState: String(row.oracle_state),
    outcome: row.outcome === null ? null : String(row.outcome),
    oracleRequestKey: row.oracle_request_key === null ? null : String(row.oracle_request_key),
    resolutionRequestedAt: row.resolution_requested_at === null
      ? null
      : asSafeNumber(row.resolution_requested_at, 'resolution request time'),
    collateralLiability: String(row.collateral_liability),
    createdBlock: String(row.created_block),
    updatedBlock: String(row.updated_block),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

export function v2Availability() {
  return {
    enabled: ARCSIGNAL_V2_ENABLED,
    chainId: arcTestnet.id,
    factoryAddress: ARCSIGNAL_V2_FACTORY_ADDRESS,
  };
}

export async function getV2Markets(limit: number, offset: number) {
  const sql = getSql();
  const rows = await sql`
    select * from markets_v2 where chain_id = ${BigInt(arcTestnet.id)}
    order by created_block desc, market_id asc limit ${limit} offset ${offset}
  `;
  return rows.map((row) => mapMarket(row as MarketRow));
}

export async function getV2Market(marketId: string) {
  const sql = getSql();
  const rows = await sql`
    select * from markets_v2
    where chain_id = ${BigInt(arcTestnet.id)} and lower(market_id) = lower(${marketId}) limit 1
  `;
  return rows[0] ? mapMarket(rows[0] as MarketRow) : null;
}

export async function getV2MarketEvents(market: V2MarketRecord, eventNames?: string[]) {
  const sql = getSql();
  const addresses = [market.marketAddress, market.ammAddress, market.yesTokenAddress,
    market.noTokenAddress, market.oracleAdapterAddress].map((address) => address.toLowerCase());
  const rows = eventNames?.length
    ? await sql`
        select contract_address, transaction_hash, log_index, block_number, block_hash, event_name, payload
        from indexed_events_v2 where chain_id = ${BigInt(arcTestnet.id)}
          and lower(contract_address) = any(${addresses}) and event_name = any(${eventNames})
        order by block_number asc, log_index asc
      `
    : await sql`
        select contract_address, transaction_hash, log_index, block_number, block_hash, event_name, payload
        from indexed_events_v2 where chain_id = ${BigInt(arcTestnet.id)}
          and lower(contract_address) = any(${addresses})
        order by block_number asc, log_index asc
      `;
  return rows.map((row) => ({
    contractAddress: String(row.contract_address),
    transactionHash: String(row.transaction_hash),
    logIndex: Number(row.log_index),
    blockNumber: String(row.block_number),
    blockHash: String(row.block_hash),
    eventName: String(row.event_name),
    payload: row.payload,
  }));
}

export async function getV2ProtocolEvents(eventNames: string[]) {
  const sql = getSql();
  const rows = await sql`
    select contract_address, transaction_hash, log_index, block_number, event_name, payload
    from indexed_events_v2 where chain_id = ${BigInt(arcTestnet.id)} and event_name = any(${eventNames})
    order by block_number asc, log_index asc
  `;
  return rows.map((row) => ({
    contractAddress: String(row.contract_address),
    transactionHash: String(row.transaction_hash),
    logIndex: Number(row.log_index),
    blockNumber: String(row.block_number),
    eventName: String(row.event_name),
    payload: row.payload,
  }));
}

export async function getV2Deployments() {
  const sql = getSql();
  const rows = await sql`
    select chain_id, protocol_version, factory_address, deployment_block, deployment_tx_hash,
      bytecode_manifest, active_for_creation, created_at
    from protocol_deployments where chain_id = ${BigInt(arcTestnet.id)} order by protocol_version desc
  `;
  return rows.map((row) => ({
    chainId: String(row.chain_id),
    protocolVersion: Number(row.protocol_version),
    factoryAddress: String(row.factory_address),
    deploymentBlock: String(row.deployment_block),
    deploymentTransactionHash: String(row.deployment_tx_hash),
    bytecodeManifest: row.bytecode_manifest,
    activeForCreation: Boolean(row.active_for_creation),
    createdAt: new Date(String(row.created_at)).toISOString(),
  }));
}

export async function getV2Health() {
  const sql = getSql();
  const [checkpoint, marketCounts, reconciliation] = await Promise.all([
    sql`select block_number, block_hash, created_at from v2_index_checkpoints
        where chain_id = ${BigInt(arcTestnet.id)} order by block_number desc limit 1`,
    sql`select market_state, count(*)::int as count from markets_v2
        where chain_id = ${BigInt(arcTestnet.id)} group by market_state`,
    sql`select count(*) filter (where not is_solvent)::int as insolvent_count,
        max(checked_block) as checked_block, max(checked_at) as checked_at
        from market_reconciliation_v2 where chain_id = ${BigInt(arcTestnet.id)}`,
  ]);
  return {
    ...v2Availability(),
    checkpoint: checkpoint[0] ? {
      blockNumber: String(checkpoint[0].block_number),
      blockHash: String(checkpoint[0].block_hash),
      indexedAt: new Date(String(checkpoint[0].created_at)).toISOString(),
    } : null,
    marketsByState: Object.fromEntries(marketCounts.map((row) => [String(row.market_state), Number(row.count)])),
    reconciliation: reconciliation[0] ? {
      insolventCount: Number(reconciliation[0].insolvent_count ?? 0),
      checkedBlock: reconciliation[0].checked_block === null ? null : String(reconciliation[0].checked_block),
      checkedAt: reconciliation[0].checked_at === null
        ? null
        : new Date(String(reconciliation[0].checked_at)).toISOString(),
    } : null,
  };
}
