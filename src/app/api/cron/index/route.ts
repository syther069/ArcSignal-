import { NextResponse } from 'next/server';
import { decodeEventLog, http, createPublicClient } from 'viem';
import { arcTestnet, ARCSIGNAL_ABI, ARCSIGNAL_ADDRESS } from '@/lib/contracts';
import { getSql } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const RPC_URL = process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL ?? 'https://rpc.testnet.arc.network';
// Keep each request moderate for ARC RPC, while allowing the external cron to
// make useful progress during the initial historical catch-up.
const CHUNK_SIZE = BigInt(process.env.INDEX_CHUNK_SIZE ?? '2000');
const MAX_CHUNKS_PER_RUN = Number(process.env.INDEX_MAX_CHUNKS_PER_RUN ?? 8);

const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(RPC_URL, { retryCount: 0, fetchOptions: { cache: 'no-store' } }),
});

type DecodedEvent = {
  eventName: string;
  args: Record<string, unknown>;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimit(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('429') || message.toLowerCase().includes('rate limit');
}

async function withRpcBackoff<T>(label: string, fn: () => Promise<T>): Promise<T> {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (!isRateLimit(error) || attempt === 5) throw error;
      const delayMs = 1_000 * attempt * attempt;
      console.warn(`${label} hit RPC rate limit; retrying in ${delayMs}ms`);
      await sleep(delayMs);
    }
  }

  throw new Error(`${label} failed after retries`);
}

async function sync(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sql = getSql();
    const stateRows = await sql`select last_block from sync_state where id = 'arc-main' limit 1`;
    const configuredStart = BigInt(process.env.ARCSIGNAL_DEPLOYMENT_BLOCK ?? '50012000');
    const minimumLastBlock = configuredStart - 1n;
    const savedLastBlock = stateRows.length > 0 ? BigInt(String(stateRows[0].last_block)) : minimumLastBlock;
    const lastBlock = savedLastBlock < minimumLastBlock ? minimumLastBlock : savedLastBlock;
    const latestBlock = await withRpcBackoff('getBlockNumber', () => publicClient.getBlockNumber());

    if (lastBlock >= latestBlock) {
      return NextResponse.json({ indexed: false, fromBlock: lastBlock.toString(), toBlock: latestBlock.toString() });
    }

    let processedEvents = 0;
    let changedMarkets = new Set<string>();
    let cursor = lastBlock + 1n;

    let chunksProcessed = 0;

    while (cursor <= latestBlock && chunksProcessed < MAX_CHUNKS_PER_RUN) {
      const end = cursor + CHUNK_SIZE - 1n < latestBlock ? cursor + CHUNK_SIZE - 1n : latestBlock;
      const logs = await withRpcBackoff(`getLogs ${cursor}-${end}`, () => publicClient.getLogs({ address: ARCSIGNAL_ADDRESS, fromBlock: cursor, toBlock: end }));

      for (const log of logs) {
        let decoded: DecodedEvent;
        try {
          decoded = decodeEventLog({ abi: ARCSIGNAL_ABI, data: log.data, topics: log.topics }) as unknown as DecodedEvent;
        } catch {
          continue;
        }

        const transactionHash = log.transactionHash;
        const logIndex = Number(log.logIndex ?? 0n);
        const inserted = await sql`
        insert into indexed_events (transaction_hash, log_index, event_name, block_number)
        values (${transactionHash}, ${logIndex}, ${decoded.eventName}, ${cursor})
        on conflict (transaction_hash, log_index) do nothing
        returning transaction_hash
      `;
        if (inserted.length === 0) continue;
        processedEvents++;

        const args = decoded.args;
        if (typeof args.marketId === 'string') changedMarkets.add(args.marketId);

        if (decoded.eventName === 'MarketCreated'
          && typeof args.marketId === 'string'
          && typeof args.category === 'string'
          && typeof args.question === 'string') {
          // Create the parent row before any same-transaction/same-chunk stake
          // event is inserted, then hydrate the authoritative pools below.
          await sql`
          insert into markets_index (market_id, category, question, resolution_time, created_block, updated_block)
          values (${args.marketId}, ${args.category}, ${args.question}, ${String(args.resolutionTime)}, ${cursor}, ${cursor})
          on conflict (market_id) do nothing
        `;
        }

        if (decoded.eventName === 'Staked' && typeof args.marketId === 'string' && typeof args.user === 'string') {
          await sql`
          insert into positions_index (market_id, wallet_address, side, amount, first_staked_block, last_staked_block)
          values (${args.marketId}, ${args.user.toLowerCase()}, ${Number(args.side)}, ${String(args.amount)}, ${cursor}, ${cursor})
          on conflict (market_id, wallet_address, side) do update set
            amount = positions_index.amount + excluded.amount,
            last_staked_block = excluded.last_staked_block
        `;
        }

        if (decoded.eventName === 'Claimed' && typeof args.marketId === 'string' && typeof args.user === 'string') {
          await sql`
          insert into claims_index (market_id, wallet_address, amount, claimed_block)
          values (${args.marketId}, ${args.user.toLowerCase()}, ${String(args.amount)}, ${cursor})
          on conflict (market_id, wallet_address) do update set
            amount = claims_index.amount + excluded.amount,
            claimed_block = excluded.claimed_block
        `;
        }
      }

      await sql`
      insert into sync_state (id, last_block) values ('arc-main', ${end})
      on conflict (id) do update set last_block = excluded.last_block, updated_at = now()
    `;
      cursor = end + 1n;
      chunksProcessed++;
      await sleep(200);
    }

    for (const marketId of changedMarkets) {
      try {
        const market = await withRpcBackoff(`getMarket ${marketId}`, () => publicClient.readContract({ address: ARCSIGNAL_ADDRESS, abi: ARCSIGNAL_ABI, functionName: 'getMarket', args: [marketId] })) as {
          marketId: string; category: string; question: string; analysisJson: string; resolutionTime: bigint;
          followPool: bigint; fadePool: bigint; resolved: boolean; outcome: number;
        };
        await sql`
        insert into markets_index (market_id, category, question, analysis_json, resolution_time, follow_pool, fade_pool, resolved, outcome, updated_block)
        values (${market.marketId}, ${market.category}, ${market.question}, ${market.analysisJson || null}, ${market.resolutionTime}, ${market.followPool}, ${market.fadePool}, ${market.resolved}, ${market.outcome}, ${latestBlock})
        on conflict (market_id) do update set
          category = excluded.category,
          question = excluded.question,
          analysis_json = excluded.analysis_json,
          resolution_time = excluded.resolution_time,
          follow_pool = excluded.follow_pool,
          fade_pool = excluded.fade_pool,
          resolved = excluded.resolved,
          outcome = excluded.outcome,
          updated_block = excluded.updated_block,
          updated_at = now()
      `;
      } catch (error) {
        console.error(`Failed to hydrate market ${marketId}:`, error);
      }
    }

    return NextResponse.json({
      indexed: true,
      complete: cursor > latestBlock,
      processedEvents,
      hydratedMarkets: changedMarkets.size,
      chunksProcessed,
      nextBlock: cursor.toString(),
      fromBlock: (lastBlock + 1n).toString(),
      toBlock: (cursor - 1n).toString(),
      latestBlock: latestBlock.toString(),
    });
  } catch (error) {
    console.error('Cron index failed:', error);
    return NextResponse.json({
      error: 'Cron index failed',
      message: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

export async function GET(req: Request) { return sync(req); }
export async function POST(req: Request) { return sync(req); }
