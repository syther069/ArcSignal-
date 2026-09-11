import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import {
  createPublicClient,
  decodeEventLog,
  http,
  type Address,
  type Hash,
  type Log,
} from 'viem';
import { authorizeCronRequest } from '@/lib/cron-auth';
import { arcTestnet, USDC_ABI } from '@/lib/contracts';
import {
  ARCSIGNAL_FACTORY_V2_ABI,
  ARCSIGNAL_MARKET_V2_ABI,
  ARCSIGNAL_V2_DEPLOYMENT_BLOCK,
  ARCSIGNAL_V2_ENABLED,
  ARCSIGNAL_V2_FACTORY_ADDRESS,
  CATEGORY_REGISTRY_V2_ABI,
  FEE_CONTROLLER_V2_ABI,
  ORACLE_ADAPTER_V2_ABI,
  ORACLE_POLICY_REGISTRY_V2_ABI,
  OUTCOME_TOKEN_V2_ABI,
  PREDICTION_MARKET_AMM_V2_ABI,
} from '@/lib/contracts-v2';
import { getSql } from '@/lib/db';
import {
  serializeV2EventArgs,
  v2ChunkEnd,
  v2MarketStateLabel,
  v2OracleStateLabel,
  v2OutcomeLabel,
} from '@/lib/v2-indexer-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const RPC_URL = process.env.ARC_RPC_URL
  ?? process.env.ARC_TESTNET_RPC_URL
  ?? process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL
  ?? 'https://rpc.testnet.arc.io';
const CHUNK_SIZE = 2_000n;
const LEASE_SECONDS = 55;

const client = createPublicClient({
  chain: arcTestnet,
  transport: http(RPC_URL, { retryCount: 2, retryDelay: 250, timeout: 8_000 }),
});

type StoredAddress = {
  market_id: string;
  market_address: string;
  amm_address: string;
  yes_token_address: string;
  no_token_address: string;
  oracle_adapter_address: string;
  created_block: string;
  market_state: string;
};

type PreparedLog = {
  address: Address;
  transactionHash: Hash;
  logIndex: number;
  blockNumber: bigint;
  blockHash: Hash;
  eventName: string;
  payload: string;
  args: Record<string, unknown>;
};

type OutcomeTransfer = {
  marketId: Hash;
  tokenAddress: Address;
  transactionHash: Hash;
  logIndex: number;
  blockNumber: bigint;
  from: Address;
  to: Address;
  amount: bigint;
};

type HydratedMarket = {
  marketId: Hash;
  marketAddress: Address;
  ammAddress: Address;
  yesTokenAddress: Address;
  noTokenAddress: Address;
  collateralAddress: Address;
  oracleAdapterAddress: Address;
  protocolVersion: number;
  metadataSchemaVersion: number;
  categoryId: number;
  categoryVersion: number;
  oraclePolicyId: number;
  oraclePolicyVersion: number;
  feeVersion: number;
  closeTime: bigint;
  liveness: bigint;
  voidAfter: bigint;
  termsHash: Hash;
  resolutionSourceHash: Hash;
  ancillaryDataHash: Hash;
  metadataURI: string;
  marketState: string;
  oracleState: string;
  outcome: string | null;
  oracleRequestKey: Hash;
  resolutionRequestedAt: bigint;
  collateralLiability: bigint;
  collateralBalance: bigint;
  createdBlock: bigint;
};

function readCount(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error('Invalid V2 indexer numeric configuration');
  return parsed;
}

function groups<T>(values: T[], size: number) {
  const result: T[][] = [];
  for (let i = 0; i < values.length; i += size) result.push(values.slice(i, i + size));
  return result;
}

function decodeLog(
  log: Log,
  abi: typeof ARCSIGNAL_FACTORY_V2_ABI
    | typeof ARCSIGNAL_MARKET_V2_ABI
    | typeof PREDICTION_MARKET_AMM_V2_ABI
    | typeof OUTCOME_TOKEN_V2_ABI
    | typeof ORACLE_ADAPTER_V2_ABI
    | typeof FEE_CONTROLLER_V2_ABI
    | typeof CATEGORY_REGISTRY_V2_ABI
    | typeof ORACLE_POLICY_REGISTRY_V2_ABI,
) {
  const decoded = decodeEventLog({ abi, data: log.data, topics: log.topics, strict: true });
  if (!log.transactionHash || log.blockNumber === null || !log.blockHash) throw new Error('V2 RPC log lacks block metadata');
  const logIndex = Number(log.logIndex);
  if (!Number.isSafeInteger(logIndex) || logIndex < 0) throw new Error('V2 RPC log lacks a valid log index');
  return {
    address: log.address,
    transactionHash: log.transactionHash,
    logIndex,
    blockNumber: log.blockNumber,
    blockHash: log.blockHash,
    eventName: decoded.eventName,
    payload: serializeV2EventArgs(decoded.args),
    args: decoded.args as unknown as Record<string, unknown>,
  };
}

async function hydrateMarket(address: Address, blockNumber: bigint, createdBlock: bigint): Promise<HydratedMarket> {
  const values = await client.multicall({
    allowFailure: false,
    blockNumber,
    contracts: [
      { address, abi: ARCSIGNAL_MARKET_V2_ABI, functionName: 'marketId' },
      { address, abi: ARCSIGNAL_MARKET_V2_ABI, functionName: 'PROTOCOL_VERSION' },
      { address, abi: ARCSIGNAL_MARKET_V2_ABI, functionName: 'metadataSchemaVersion' },
      { address, abi: ARCSIGNAL_MARKET_V2_ABI, functionName: 'categoryId' },
      { address, abi: ARCSIGNAL_MARKET_V2_ABI, functionName: 'categoryVersion' },
      { address, abi: ARCSIGNAL_MARKET_V2_ABI, functionName: 'oraclePolicyId' },
      { address, abi: ARCSIGNAL_MARKET_V2_ABI, functionName: 'oraclePolicyVersion' },
      { address, abi: ARCSIGNAL_MARKET_V2_ABI, functionName: 'feeVersion' },
      { address, abi: ARCSIGNAL_MARKET_V2_ABI, functionName: 'closeTime' },
      { address, abi: ARCSIGNAL_MARKET_V2_ABI, functionName: 'liveness' },
      { address, abi: ARCSIGNAL_MARKET_V2_ABI, functionName: 'voidAfter' },
      { address, abi: ARCSIGNAL_MARKET_V2_ABI, functionName: 'termsHash' },
      { address, abi: ARCSIGNAL_MARKET_V2_ABI, functionName: 'resolutionSourceHash' },
      { address, abi: ARCSIGNAL_MARKET_V2_ABI, functionName: 'ancillaryDataHash' },
      { address, abi: ARCSIGNAL_MARKET_V2_ABI, functionName: 'metadataURI' },
      { address, abi: ARCSIGNAL_MARKET_V2_ABI, functionName: 'marketState' },
      { address, abi: ARCSIGNAL_MARKET_V2_ABI, functionName: 'oracleState' },
      { address, abi: ARCSIGNAL_MARKET_V2_ABI, functionName: 'outcome' },
      { address, abi: ARCSIGNAL_MARKET_V2_ABI, functionName: 'oracleRequestKey' },
      { address, abi: ARCSIGNAL_MARKET_V2_ABI, functionName: 'resolutionRequestedAt' },
      { address, abi: ARCSIGNAL_MARKET_V2_ABI, functionName: 'collateralLiability' },
      { address, abi: ARCSIGNAL_MARKET_V2_ABI, functionName: 'yesToken' },
      { address, abi: ARCSIGNAL_MARKET_V2_ABI, functionName: 'noToken' },
      { address, abi: ARCSIGNAL_MARKET_V2_ABI, functionName: 'collateral' },
      { address, abi: ARCSIGNAL_MARKET_V2_ABI, functionName: 'oracleAdapter' },
      { address, abi: ARCSIGNAL_MARKET_V2_ABI, functionName: 'amm' },
    ],
  });
  const collateralAddress = values[23];
  const collateralBalance = await client.readContract({
    address: collateralAddress,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: [address],
    blockNumber,
  });
  return {
    marketId: values[0],
    marketAddress: address,
    protocolVersion: Number(values[1]),
    metadataSchemaVersion: Number(values[2]),
    categoryId: Number(values[3]),
    categoryVersion: Number(values[4]),
    oraclePolicyId: Number(values[5]),
    oraclePolicyVersion: Number(values[6]),
    feeVersion: Number(values[7]),
    closeTime: values[8],
    liveness: values[9],
    voidAfter: values[10],
    termsHash: values[11],
    resolutionSourceHash: values[12],
    ancillaryDataHash: values[13],
    metadataURI: values[14],
    marketState: v2MarketStateLabel(Number(values[15])),
    oracleState: v2OracleStateLabel(Number(values[16])),
    outcome: v2OutcomeLabel(Number(values[17])),
    oracleRequestKey: values[18],
    resolutionRequestedAt: values[19],
    collateralLiability: values[20],
    yesTokenAddress: values[21],
    noTokenAddress: values[22],
    collateralAddress,
    oracleAdapterAddress: values[24],
    ammAddress: values[25],
    collateralBalance,
    createdBlock,
  };
}

async function syncV2(request: Request) {
  const authorization = authorizeCronRequest(request);
  if (!authorization.ok) return authorization.response;
  if (!ARCSIGNAL_V2_ENABLED || !ARCSIGNAL_V2_FACTORY_ADDRESS || ARCSIGNAL_V2_DEPLOYMENT_BLOCK === null) {
    return NextResponse.json({ indexed: false, skipped: true, reason: 'ArcSignal V2 is not deployed/configured' });
  }

  const sql = getSql();
  const leaseToken = randomUUID();
  const chainId = BigInt(arcTestnet.id);
  const confirmations = BigInt(readCount(process.env.V2_INDEX_CONFIRMATIONS, 1));
  const startBlock = ARCSIGNAL_V2_DEPLOYMENT_BLOCK;
  let leaseAcquired = false;

  try {
    const state = await sql`
      insert into sync_state (id, last_block, lease_token, lease_expires_at)
      values ('arc-v2', ${startBlock - 1n}, ${leaseToken}, now() + (${LEASE_SECONDS} * interval '1 second'))
      on conflict (id) do update set lease_token = excluded.lease_token, lease_expires_at = excluded.lease_expires_at
      where sync_state.lease_expires_at is null or sync_state.lease_expires_at <= now()
      returning last_block
    `;
    if (state.length === 0) return NextResponse.json({ indexed: false, skipped: true, reason: 'V2 indexer lease is held' });
    leaseAcquired = true;
    const savedBlock = BigInt(String(state[0].last_block));
    const lastBlock = savedBlock < startBlock - 1n ? startBlock - 1n : savedBlock;
    if (lastBlock >= startBlock) {
      const checkpoints = await sql`
        select block_hash from v2_index_checkpoints
        where chain_id = ${chainId} and block_number = ${lastBlock} limit 1
      `;
      if (checkpoints.length > 0) {
        const canonicalBlock = await client.getBlock({ blockNumber: lastBlock });
        if (canonicalBlock.hash.toLowerCase() !== String(checkpoints[0].block_hash).toLowerCase()) {
          await sql.transaction([
            sql`delete from market_reconciliation_v2 where chain_id = ${chainId}`,
            sql`delete from outcome_transfers_v2 where chain_id = ${chainId}`,
            sql`delete from markets_v2 where chain_id = ${chainId}`,
            sql`delete from indexed_events_v2 where chain_id = ${chainId}`,
            sql`delete from v2_index_checkpoints where chain_id = ${chainId}`,
            sql`update sync_state set last_block = ${startBlock - 1n}, updated_at = now()
                where id = 'arc-v2' and lease_token = ${leaseToken}`,
          ], { isolationLevel: 'Serializable' });
          return NextResponse.json({
            indexed: false,
            reorgReset: true,
            reason: 'V2 checkpoint hash changed; V2 projections were reset for canonical replay',
          });
        }
      }
    }
    const latest = await client.getBlockNumber();
    const finalized = latest > confirmations ? latest - confirmations : 0n;
    if (lastBlock >= finalized) return NextResponse.json({ indexed: false, fromBlock: lastBlock.toString(), finalizedBlock: finalized.toString() });

    const fromBlock = lastBlock + 1n;
    const toBlock = v2ChunkEnd(fromBlock, finalized, BigInt(readCount(process.env.V2_INDEX_CHUNK_SIZE, Number(CHUNK_SIZE))));
    const knownRows = await sql`
      select market_id, market_address, amm_address, yes_token_address, no_token_address,
        oracle_adapter_address, created_block, market_state
      from markets_v2 where chain_id = ${chainId}
    ` as StoredAddress[];
    const knownCreatedBlocks = new Map(knownRows.map((row) => [row.market_address.toLowerCase(), BigInt(row.created_block)]));
    const marketAddresses = new Set<Address>(knownRows.map((row) => row.market_address as Address));
    const ammAddresses = new Set<Address>(knownRows.map((row) => row.amm_address as Address));
    const oracleAdapterAddresses = new Set<Address>(knownRows.map((row) => row.oracle_adapter_address as Address));
    const outcomeTokenMarkets = new Map<string, Hash>();
    for (const row of knownRows) {
      outcomeTokenMarkets.set(row.yes_token_address.toLowerCase(), row.market_id as Hash);
      outcomeTokenMarkets.set(row.no_token_address.toLowerCase(), row.market_id as Hash);
    }
    const factoryLogs = await client.getLogs({ address: ARCSIGNAL_V2_FACTORY_ADDRESS, fromBlock, toBlock });
    const prepared: PreparedLog[] = [];
    const affected = new Set<Address>();

    for (const log of factoryLogs) {
      const decoded = decodeLog(log, ARCSIGNAL_FACTORY_V2_ABI);
      prepared.push(decoded);
      if (decoded.eventName === 'MarketCreatedV2') {
        const market = decoded.args.market as Address;
        const amm = decoded.args.amm as Address;
        marketAddresses.add(market);
        ammAddresses.add(amm);
        affected.add(market);
        knownCreatedBlocks.set(market.toLowerCase(), decoded.blockNumber);
      }
    }

    for (const addressGroup of groups([...marketAddresses], 50)) {
      const logs = await client.getLogs({ address: addressGroup, fromBlock, toBlock });
      for (const log of logs) {
        const decoded = decodeLog(log, ARCSIGNAL_MARKET_V2_ABI);
        prepared.push(decoded);
        affected.add(log.address);
        if (decoded.eventName === 'MarketInitialized') {
          const marketId = decoded.args.marketId as Hash;
          outcomeTokenMarkets.set(String(decoded.args.yesToken).toLowerCase(), marketId);
          outcomeTokenMarkets.set(String(decoded.args.noToken).toLowerCase(), marketId);
        }
      }
    }
    for (const addressGroup of groups([...ammAddresses], 50)) {
      const logs = await client.getLogs({ address: addressGroup, fromBlock, toBlock });
      for (const log of logs) prepared.push(decodeLog(log, PREDICTION_MARKET_AMM_V2_ABI));
    }
    const outcomeTransfers: OutcomeTransfer[] = [];
    for (const addressGroup of groups([...outcomeTokenMarkets.keys()] as Address[], 50)) {
      const logs = await client.getLogs({ address: addressGroup, fromBlock, toBlock });
      for (const log of logs) {
        const decoded = decodeLog(log, OUTCOME_TOKEN_V2_ABI);
        prepared.push(decoded);
        if (decoded.eventName !== 'Transfer') continue;
        outcomeTransfers.push({
          marketId: outcomeTokenMarkets.get(log.address.toLowerCase()) as Hash,
          tokenAddress: log.address,
          transactionHash: decoded.transactionHash,
          logIndex: decoded.logIndex,
          blockNumber: decoded.blockNumber,
          from: decoded.args.from as Address,
          to: decoded.args.to as Address,
          amount: decoded.args.value as bigint,
        });
      }
    }
    for (const row of knownRows.filter((item) => item.market_state === 'OPEN' || item.market_state === 'CLOSED').slice(0, 25)) {
      affected.add(row.market_address as Address);
    }

    const hydrated = await Promise.all([...affected].map((address) => hydrateMarket(
      address,
      toBlock,
      knownCreatedBlocks.get(address.toLowerCase()) ?? toBlock,
    )));
    for (const market of hydrated) oracleAdapterAddresses.add(market.oracleAdapterAddress);

    for (const addressGroup of groups([...oracleAdapterAddresses], 50)) {
      const logs = await client.getLogs({ address: addressGroup, fromBlock, toBlock });
      for (const log of logs) prepared.push(decodeLog(log, ORACLE_ADAPTER_V2_ABI));
    }
    const [categoryRegistry, oraclePolicyRegistry, feeController] = await Promise.all([
      client.readContract({ address: ARCSIGNAL_V2_FACTORY_ADDRESS, abi: ARCSIGNAL_FACTORY_V2_ABI, functionName: 'categoryRegistry', blockNumber: toBlock }),
      client.readContract({ address: ARCSIGNAL_V2_FACTORY_ADDRESS, abi: ARCSIGNAL_FACTORY_V2_ABI, functionName: 'oraclePolicyRegistry', blockNumber: toBlock }),
      client.readContract({ address: ARCSIGNAL_V2_FACTORY_ADDRESS, abi: ARCSIGNAL_FACTORY_V2_ABI, functionName: 'feeController', blockNumber: toBlock }),
    ]);
    const protocolEventSources = [
      { address: categoryRegistry, abi: CATEGORY_REGISTRY_V2_ABI },
      { address: oraclePolicyRegistry, abi: ORACLE_POLICY_REGISTRY_V2_ABI },
      { address: feeController, abi: FEE_CONTROLLER_V2_ABI },
    ] as const;
    for (const source of protocolEventSources) {
      const logs = await client.getLogs({ address: source.address, fromBlock, toBlock });
      for (const log of logs) prepared.push(decodeLog(log, source.abi));
    }
    const queries = prepared.map((event) => sql`
      insert into indexed_events_v2 (
        chain_id, contract_address, transaction_hash, log_index, block_number, block_hash, event_name, payload
      ) values (
        ${chainId}, ${event.address}, ${event.transactionHash}, ${event.logIndex}, ${event.blockNumber},
        ${event.blockHash}, ${event.eventName}, ${event.payload}::jsonb
      ) on conflict (chain_id, contract_address, transaction_hash, log_index) do nothing
    `);
    for (const transfer of outcomeTransfers) {
      queries.push(sql`
        insert into outcome_transfers_v2 (
          chain_id, market_id, token_address, transaction_hash, log_index, block_number,
          from_address, to_address, amount
        ) values (
          ${chainId}, ${transfer.marketId}, ${transfer.tokenAddress}, ${transfer.transactionHash},
          ${transfer.logIndex}, ${transfer.blockNumber}, ${transfer.from}, ${transfer.to}, ${transfer.amount}
        ) on conflict (chain_id, token_address, transaction_hash, log_index) do nothing
      `);
    }
    for (const market of hydrated) {
      queries.push(sql`
        insert into markets_v2 (
          chain_id, market_id, market_address, amm_address, yes_token_address, no_token_address,
          collateral_address, oracle_adapter_address, protocol_version, metadata_schema_version, category_id, category_version,
          oracle_policy_id, oracle_policy_version, fee_version, close_time, liveness, void_after, terms_hash,
          resolution_source_hash, ancillary_data_hash, metadata_uri, market_state, oracle_state, outcome,
          oracle_request_key, resolution_requested_at, collateral_liability, created_block, updated_block
        ) values (
          ${chainId}, ${market.marketId}, ${market.marketAddress}, ${market.ammAddress}, ${market.yesTokenAddress},
          ${market.noTokenAddress}, ${market.collateralAddress}, ${market.oracleAdapterAddress}, ${market.protocolVersion},
          ${market.metadataSchemaVersion}, ${market.categoryId}, ${market.categoryVersion}, ${market.oraclePolicyId},
          ${market.oraclePolicyVersion}, ${market.feeVersion}, ${market.closeTime}, ${market.liveness}, ${market.voidAfter},
          ${market.termsHash}, ${market.resolutionSourceHash}, ${market.ancillaryDataHash}, ${market.metadataURI},
          ${market.marketState}, ${market.oracleState}, ${market.outcome}, ${market.oracleRequestKey},
          ${market.resolutionRequestedAt},
          ${market.collateralLiability}, ${market.createdBlock}, ${toBlock}
        ) on conflict (chain_id, market_id) do update set
          market_state = excluded.market_state, oracle_state = excluded.oracle_state, outcome = excluded.outcome,
          oracle_request_key = excluded.oracle_request_key,
          resolution_requested_at = excluded.resolution_requested_at,
          collateral_liability = excluded.collateral_liability,
          updated_block = excluded.updated_block, updated_at = now()
      `);
      const surplus = market.collateralBalance - market.collateralLiability;
      queries.push(sql`
        insert into market_reconciliation_v2 (
          chain_id, market_address, checked_block, collateral_balance, collateral_liability,
          surplus, oracle_state, market_state, is_solvent
        ) values (
          ${chainId}, ${market.marketAddress}, ${toBlock}, ${market.collateralBalance},
          ${market.collateralLiability}, ${surplus}, ${market.oracleState}, ${market.marketState}, ${surplus >= 0n}
        ) on conflict (chain_id, market_address, checked_block) do nothing
      `);
    }
    const checkpointBlock = await client.getBlock({ blockNumber: toBlock });
    queries.push(sql`
      insert into v2_index_checkpoints (chain_id, block_number, block_hash)
      values (${chainId}, ${toBlock}, ${checkpointBlock.hash})
      on conflict (chain_id, block_number) do update set block_hash = excluded.block_hash
    `);
    queries.push(sql`
      update sync_state set last_block = ${toBlock}, updated_at = now(),
        lease_expires_at = now() + (${LEASE_SECONDS} * interval '1 second')
      where id = 'arc-v2' and lease_token = ${leaseToken} and lease_expires_at > now()
      returning last_block
    `);
    const result = await sql.transaction(queries, { isolationLevel: 'Serializable' });
    if (result[result.length - 1].length === 0) throw new Error('V2 indexer lease expired before commit');
    return NextResponse.json({
      indexed: true,
      fromBlock: fromBlock.toString(),
      toBlock: toBlock.toString(),
      finalizedBlock: finalized.toString(),
      events: prepared.length,
      marketsHydrated: hydrated.length,
      complete: toBlock === finalized,
    });
  } catch (error) {
    console.error('V2 indexer failed:', error);
    return NextResponse.json({ error: 'V2 indexer failed', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  } finally {
    if (leaseAcquired) {
      await sql`
        update sync_state set lease_token = null, lease_expires_at = null
        where id = 'arc-v2' and lease_token = ${leaseToken}
      `.catch((error) => console.error('FailedV2 indexer lease release failed:', error));
    }
  }
}

export async function GET(request: Request) { return syncV2(request); }
export async function POST(request: Request) { return syncV2(request); }
