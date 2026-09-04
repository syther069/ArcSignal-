import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { decodeEventLog, http, createPublicClient } from 'viem';
import { arcTestnet, ARCSIGNAL_ABI, ARCSIGNAL_ADDRESS } from '@/lib/contracts';
import { authorizeCronRequest } from '@/lib/cron-auth';
import { getSql } from '@/lib/db';
import {
  chunkEnd,
  finalizedBlock,
  projectionForEvent,
  readPositiveInteger,
  type IndexerProjection,
} from '@/lib/indexer-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const RPC_URL = process.env.ARC_RPC_URL
  ?? process.env.ARC_TESTNET_RPC_URL
  ?? process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL
  ?? 'https://rpc.testnet.arc.network';
const RUN_BUDGET_MS = 45_000;
const LEASE_SECONDS = 55;

const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(RPC_URL, {
    retryCount: 0,
    timeout: 6_000,
    fetchOptions: { cache: 'no-store' },
  }),
});

type DecodedEvent = {
  eventName: string;
  args: Record<string, unknown>;
};

type PreparedEvent = {
  transactionHash: string;
  logIndex: number;
  blockNumber: bigint;
  eventName: string;
  projection: IndexerProjection;
};

type HydratedMarket = {
  marketId: string;
  category: string;
  question: string;
  analysisJson: string;
  resolutionTime: bigint;
  followPool: bigint;
  fadePool: bigint;
  resolved: boolean;
  outcome: number;
  status: string;
};

function statusLabel(resolved: boolean, outcome: number, resolutionTime: bigint, now: bigint) {
  if (resolved && outcome === 0) return 'VOIDED';
  if (resolved) return 'RESOLVED';
  return resolutionTime <= now ? 'PENDING_RESOLUTION' : 'OPEN';
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimit(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('429') || message.toLowerCase().includes('rate limit');
}

async function withRpcBackoff<T>(label: string, deadline: number, fn: () => Promise<T>): Promise<T> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    if (Date.now() >= deadline) throw new Error(`Indexer time budget exhausted before ${label}`);
    try {
      return await fn();
    } catch (error) {
      if (!isRateLimit(error) || attempt === 2) throw error;
      await sleep(500);
    }
  }
  throw new Error(`${label} failed after retries`);
}

async function hydrateMarkets(marketIds: Set<string>, blockNumber: bigint, deadline: number) {
  const markets: HydratedMarket[] = [];
  const now = BigInt(Math.floor(Date.now() / 1000));

  for (const marketId of marketIds) {
    const market = await withRpcBackoff(`getMarket ${marketId}`, deadline, () =>
      publicClient.readContract({
        address: ARCSIGNAL_ADDRESS,
        abi: ARCSIGNAL_ABI,
        functionName: 'getMarket',
        args: [marketId],
        blockNumber,
      })) as Omit<HydratedMarket, 'status' | 'outcome'> & { outcome: number };

    markets.push({
      ...market,
      outcome: Number(market.outcome),
      status: statusLabel(market.resolved, Number(market.outcome), market.resolutionTime, now),
    });
  }
  return markets;
}

async function sync(req: Request) {
  const authorization = authorizeCronRequest(req);
  if (!authorization.ok) return authorization.response;

  const token = randomUUID();
  let sql: ReturnType<typeof getSql> | undefined;
  let leaseAcquired = false;

  try {
    const chunkSize = BigInt(readPositiveInteger(process.env.INDEX_CHUNK_SIZE, 9_000, 'INDEX_CHUNK_SIZE'));
    const maxChunks = readPositiveInteger(process.env.INDEX_MAX_CHUNKS_PER_RUN, 8, 'INDEX_MAX_CHUNKS_PER_RUN');
    const confirmations = BigInt(readPositiveInteger(process.env.INDEX_CONFIRMATIONS, 1, 'INDEX_CONFIRMATIONS'));
    const configuredStart = BigInt(process.env.ARCSIGNAL_DEPLOYMENT_BLOCK ?? '50346816');
    if (configuredStart < 0n) throw new Error('ARCSIGNAL_DEPLOYMENT_BLOCK must not be negative');
    const minimumLastBlock = configuredStart - 1n;
    const deadline = Date.now() + RUN_BUDGET_MS;

    sql = getSql();
    const stateRows = await sql`
      insert into sync_state (id, last_block, lease_token, lease_expires_at)
      values ('arc-main', ${minimumLastBlock}, ${token}, now() + (${LEASE_SECONDS} * interval '1 second'))
      on conflict (id) do update set
        lease_token = excluded.lease_token,
        lease_expires_at = excluded.lease_expires_at
      where sync_state.lease_expires_at is null or sync_state.lease_expires_at <= now()
      returning last_block
    `;
    if (stateRows.length === 0) {
      return NextResponse.json({ indexed: false, skipped: true, reason: 'Indexer lease is already held' });
    }
    leaseAcquired = true;

    const savedLastBlock = BigInt(String(stateRows[0].last_block));
    const lastBlock = savedLastBlock < minimumLastBlock ? minimumLastBlock : savedLastBlock;
    const latestBlock = await withRpcBackoff('getBlockNumber', deadline, () => publicClient.getBlockNumber());
    const finalizedHead = finalizedBlock(latestBlock, confirmations);

    if (lastBlock >= finalizedHead) {
      return NextResponse.json({
        indexed: false,
        fromBlock: lastBlock.toString(),
        finalizedBlock: finalizedHead.toString(),
        latestBlock: latestBlock.toString(),
      });
    }

    let processedEvents = 0;
    let hydratedMarketCount = 0;
    let cursor = lastBlock + 1n;
    let chunksProcessed = 0;

    while (cursor <= finalizedHead && chunksProcessed < maxChunks && Date.now() < deadline) {
      const end = chunkEnd(cursor, finalizedHead, chunkSize);
      const logs = await withRpcBackoff(`getLogs ${cursor}-${end}`, deadline, () =>
        publicClient.getLogs({ address: ARCSIGNAL_ADDRESS, fromBlock: cursor, toBlock: end }));

      const events: PreparedEvent[] = [];
      const affectedMarkets = new Set<string>();
      const firstObservedBlock = new Map<string, bigint>();
      for (const log of logs) {
        let decoded: DecodedEvent;
        try {
          decoded = decodeEventLog({
            abi: ARCSIGNAL_ABI,
            data: log.data,
            topics: log.topics,
            strict: true,
          }) as unknown as DecodedEvent;
        } catch (error) {
          throw new Error(`Unable to decode contract log ${log.transactionHash ?? 'unknown'}:${String(log.logIndex)}`, { cause: error });
        }
        if (!log.transactionHash || log.blockNumber === null || log.blockNumber === undefined) {
          throw new Error('RPC returned a log without transaction hash or block number metadata');
        }
        const logIndex = Number(log.logIndex);
        if (!Number.isSafeInteger(logIndex) || logIndex < 0) {
          throw new Error('RPC returned a log without a valid log index');
        }
        const projection = projectionForEvent(decoded.eventName, decoded.args);
        if (projection.marketId) {
          affectedMarkets.add(projection.marketId);
          const previousBlock = firstObservedBlock.get(projection.marketId);
          if (previousBlock === undefined || log.blockNumber < previousBlock) {
            firstObservedBlock.set(projection.marketId, log.blockNumber);
          }
        }
        events.push({
          transactionHash: log.transactionHash,
          logIndex,
          blockNumber: log.blockNumber,
          eventName: decoded.eventName,
          projection,
        });
      }

      // Every read uses the chunk's finalized block. If any read fails, no
      // transaction runs and the durable cursor remains unchanged.
      const markets = await hydrateMarkets(affectedMarkets, end, deadline);
      if (Date.now() >= deadline) break;

      const results = await sql.transaction((tx) => {
        const queries = markets.map((market) => tx`
          insert into markets_index (
            market_id, category, question, analysis_json, resolution_time,
            follow_pool, fade_pool, resolved, outcome, status, created_block, updated_block
          )
          select ${market.marketId}, ${market.category}, ${market.question}, ${market.analysisJson || null},
            ${market.resolutionTime}, ${market.followPool}, ${market.fadePool}, ${market.resolved},
            ${market.outcome}, ${market.status}, ${firstObservedBlock.get(market.marketId) ?? end}, ${end}
          where exists (
            select 1 from sync_state
            where id = 'arc-main' and lease_token = ${token} and lease_expires_at > now()
          )
          on conflict (market_id) do update set
            category = excluded.category, question = excluded.question,
            analysis_json = excluded.analysis_json, resolution_time = excluded.resolution_time,
            follow_pool = excluded.follow_pool, fade_pool = excluded.fade_pool,
            resolved = excluded.resolved, outcome = excluded.outcome, status = excluded.status,
            created_block = case
              when markets_index.created_block = 0 then excluded.created_block
              else least(markets_index.created_block, excluded.created_block)
            end,
            updated_block = excluded.updated_block, updated_at = now()
          where excluded.updated_block >= markets_index.updated_block
        `);

        for (const event of events) {
          if (event.projection.kind === 'stake') {
            const projection = event.projection;
            queries.push(tx`
              with marker as (
                insert into indexed_events (transaction_hash, log_index, event_name, block_number)
                select ${event.transactionHash}, ${event.logIndex}, ${event.eventName}, ${event.blockNumber}
                where exists (
                  select 1 from sync_state
                  where id = 'arc-main' and lease_token = ${token} and lease_expires_at > now()
                )
                on conflict (transaction_hash, log_index) do nothing
                returning 1
              )
              insert into positions_index (market_id, wallet_address, side, amount, first_staked_block, last_staked_block)
              select ${projection.marketId}, ${projection.user}, ${projection.side}, ${projection.amount},
                ${event.blockNumber}, ${event.blockNumber} from marker
              on conflict (market_id, wallet_address, side) do update set
                amount = positions_index.amount + excluded.amount,
                last_staked_block = greatest(positions_index.last_staked_block, excluded.last_staked_block)
              returning market_id
            `);
          } else if (event.projection.kind === 'claim') {
            const projection = event.projection;
            queries.push(tx`
              with marker as (
                insert into indexed_events (transaction_hash, log_index, event_name, block_number)
                select ${event.transactionHash}, ${event.logIndex}, ${event.eventName}, ${event.blockNumber}
                where exists (
                  select 1 from sync_state
                  where id = 'arc-main' and lease_token = ${token} and lease_expires_at > now()
                )
                on conflict (transaction_hash, log_index) do nothing
                returning 1
              )
              insert into claims_index (market_id, wallet_address, amount, claimed_block)
              select ${projection.marketId}, ${projection.user}, ${projection.amount}, ${event.blockNumber} from marker
              on conflict (market_id, wallet_address) do update set
                amount = claims_index.amount + excluded.amount,
                claimed_block = greatest(claims_index.claimed_block, excluded.claimed_block)
              returning market_id
            `);
          } else {
            queries.push(tx`
              insert into indexed_events (transaction_hash, log_index, event_name, block_number)
              select ${event.transactionHash}, ${event.logIndex}, ${event.eventName}, ${event.blockNumber}
              where exists (
                select 1 from sync_state
                where id = 'arc-main' and lease_token = ${token} and lease_expires_at > now()
              )
              on conflict (transaction_hash, log_index) do nothing
              returning transaction_hash
            `);
          }
        }

        queries.push(tx`
          update sync_state
          set last_block = greatest(last_block, ${end}),
              lease_expires_at = now() + (${LEASE_SECONDS} * interval '1 second'),
              updated_at = now()
          where id = 'arc-main' and lease_token = ${token} and lease_expires_at > now()
          returning last_block
        `);
        return queries;
      }, { isolationLevel: 'Serializable' });

      const cursorRows = results[results.length - 1];
      if (!cursorRows || cursorRows.length === 0) throw new Error('Indexer lease expired before chunk commit');
      processedEvents += results
        .slice(markets.length, markets.length + events.length)
        .filter((rows) => rows.length > 0)
        .length;
      hydratedMarketCount += markets.length;
      cursor = end + 1n;
      chunksProcessed++;
    }

    return NextResponse.json({
      indexed: chunksProcessed > 0,
      complete: cursor > finalizedHead,
      processedEvents,
      hydratedMarkets: hydratedMarketCount,
      chunksProcessed,
      nextBlock: cursor.toString(),
      fromBlock: (lastBlock + 1n).toString(),
      toBlock: (cursor - 1n).toString(),
      finalizedBlock: finalizedHead.toString(),
      latestBlock: latestBlock.toString(),
    });
  } catch (error) {
    console.error('Cron index failed:', error);
    return NextResponse.json({
      error: 'Cron index failed',
      message: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  } finally {
    if (sql && leaseAcquired) {
      try {
        await sql`
          update sync_state set lease_token = null, lease_expires_at = null
          where id = 'arc-main' and lease_token = ${token}
        `;
      } catch (error) {
        console.error('Failed to release indexer lease:', error);
      }
    }
  }
}

export async function GET(req: Request) { return sync(req); }
export async function POST(req: Request) { return sync(req); }