import type { Address } from 'viem';
import { ARCSIGNAL_ABI, ARCSIGNAL_ADDRESS, publicClient } from './contracts';
import type { AIAnalysis, Market, SerializableMarket } from './types';
import { deriveMarketStatus, mapOutcome, mapCategory } from './parimutuel-math';

export type { SerializableMarket };

function safeParseAnalysis(json: string): AIAnalysis | undefined {
  try {
    if (!json || json.length < 10) return undefined;
    return JSON.parse(json) as AIAnalysis;
  } catch {
    return undefined;
  }
}

let memoryCache: { markets: Market[]; timestamp: number } = {
  markets: [],
  timestamp: 0,
};

export function clearMarketCache() {
  memoryCache = { markets: [], timestamp: 0 };
}

const MARKET_CACHE_TTL_MS = 60_000;
const MARKET_RPC_TIMEOUT_MS = 8_000;
const DEFAULT_MARKET_PAGE_SIZE = 60;
const MARKET_READ_CONCURRENCY = 1;
const MARKET_RPC_MIN_INTERVAL_MS = 1_050;
const MARKET_RPC_RETRY_BASE_MS = 1_200;

let lastMarketRpcRequestAt = 0;

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout>;
  const timer = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });

  try {
    return await Promise.race([promise, timer]);
  } finally {
    clearTimeout(timeout!);
  }
}

type ChainMarket = {
  marketId: string;
  category: string;
  question: string;
  analysisJson: string;
  resolutionTime: bigint;
  followPool: bigint;
  fadePool: bigint;
  resolved: boolean;
  outcome: number;
  status?: number;
  openedAt?: bigint;
  closedAt?: bigint;
  resolvedAt?: bigint;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForMarketRpcSlot() {
  const waitMs = Math.max(0, MARKET_RPC_MIN_INTERVAL_MS - (Date.now() - lastMarketRpcRequestAt));
  if (waitMs > 0) await sleep(waitMs);
  lastMarketRpcRequestAt = Date.now();
}

function isRateLimitError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /429|too many requests|request limit|rate limit/i.test(message);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      try {
        results[index] = { status: 'fulfilled', value: await mapper(items[index], index) };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );

  return results;
}

async function readContractWithRetry<T>(
  label: string,
  read: () => Promise<T>,
  timeoutMs = MARKET_RPC_TIMEOUT_MS
): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await waitForMarketRpcSlot();
      return await withTimeout(read(), timeoutMs, label);
    } catch (err) {
      if (attempt === 2) throw err;
      await sleep(isRateLimitError(err) ? MARKET_RPC_RETRY_BASE_MS * (attempt + 1) : 300 * (attempt + 1));
    }
  }

  throw new Error(`Failed to read ${label}`);
}

async function fetchAllMarketIds(): Promise<string[]> {
  return readContractWithRetry(
    'getAllMarketIds',
    () => publicClient.readContract({
      address: ARCSIGNAL_ADDRESS as Address,
      abi: ARCSIGNAL_ABI,
      functionName: 'getAllMarketIds',
    }) as Promise<string[]>,
    6_000
  );
}

async function fetchMarketIdByIndex(index: bigint): Promise<string> {
  return readContractWithRetry(
    `getMarketIdByIndex ${index}`,
    () => publicClient.readContract({
      address: ARCSIGNAL_ADDRESS as Address,
      abi: ARCSIGNAL_ABI,
      functionName: 'getMarketIdByIndex',
      args: [index],
    }) as Promise<string>,
    4_000
  );
}

async function fetchMarketWithRetry(id: string): Promise<ChainMarket> {
  return readContractWithRetry(
    `getMarket ${id}`,
    () => publicClient.readContract({
      address: ARCSIGNAL_ADDRESS as Address,
      abi: ARCSIGNAL_ABI,
      functionName: 'getMarket',
      args: [id],
    }) as Promise<ChainMarket>,
    4_500
  );
}

export async function getMarketsFromChain(
  forceRefresh = false,
  options: { limit?: number; offset?: number } = {}
): Promise<Market[]> {
  const now = Date.now();
  const limit = options.limit ?? DEFAULT_MARKET_PAGE_SIZE;
  const offset = options.offset ?? 0;

  if (
    !forceRefresh &&
    offset === 0 &&
    limit === DEFAULT_MARKET_PAGE_SIZE &&
    memoryCache.markets.length > 0 &&
    (now - memoryCache.timestamp) < MARKET_CACHE_TTL_MS
  ) {
    return memoryCache.markets;
  }

  if (!ARCSIGNAL_ADDRESS || !/^0x[a-fA-F0-9]{40}$/.test(ARCSIGNAL_ADDRESS)) {
    return [];
  }

  try {
    const nowUnix = Math.floor(Date.now() / 1000);
    let targetIds: string[];

    try {
      // One ID read avoids one RPC request per market before the market data
      // reads begin. This matters on ARC's public endpoint, which is heavily
      // rate limited.
      const allMarketIds = await fetchAllMarketIds();
      targetIds = allMarketIds.slice().reverse().slice(offset, offset + limit);
    } catch (allIdsError) {
      console.warn('Bulk market ID read unavailable; falling back to indexed IDs:', allIdsError);
      const marketCount = await readContractWithRetry(
        'getMarketCount',
        () => publicClient.readContract({
          address: ARCSIGNAL_ADDRESS as Address,
          abi: ARCSIGNAL_ABI,
          functionName: 'getMarketCount',
        }) as Promise<bigint>
      );

      const startIndex = Number(marketCount) - 1 - offset;
      if (startIndex < 0) return [];

      const indexes = Array.from(
        { length: Math.min(limit, startIndex + 1) },
        (_, i) => BigInt(startIndex - i)
      );
      const idResults = await mapWithConcurrency(
        indexes,
        MARKET_READ_CONCURRENCY,
        (index) => fetchMarketIdByIndex(index)
      );
      targetIds = idResults
        .filter((res): res is PromiseFulfilledResult<string> => res.status === 'fulfilled')
        .map((res) => res.value);
    }

    const markets: Market[] = [];

    const marketResults = await mapWithConcurrency(
      targetIds,
      MARKET_READ_CONCURRENCY,
      (id) => fetchMarketWithRetry(id)
    );

    for (const res of marketResults) {
      if (res.status === 'fulfilled' && res.value) {
        const data = res.value;

        markets.push({
          marketId: data.marketId,
          category: mapCategory(data.category),
          question: data.question,
          resolutionTime: Number(data.resolutionTime),
          followPool: data.followPool,
          fadePool: data.fadePool,
          resolved: data.resolved,
          outcome: mapOutcome(data.resolved, data.outcome),
          status: deriveMarketStatus({
            resolved: data.resolved,
            outcome: data.outcome,
            resolutionTime: Number(data.resolutionTime),
            nowUnix,
          }),
          resolvedAt: data.resolvedAt && data.resolvedAt > 0n
            ? Number(data.resolvedAt)
            : undefined,
          openedAt: data.openedAt && data.openedAt > 0n
            ? Number(data.openedAt)
            : undefined,
          closedAt: data.closedAt && data.closedAt > 0n
            ? Number(data.closedAt)
            : undefined,
          resolutionReason: data.resolved
            ? `Resolved on-chain with ${mapOutcome(data.resolved, data.outcome)} outcome.`
            : undefined,
          analysis: safeParseAnalysis(data.analysisJson),
        });
      }
    }

    markets.sort((a, b) => b.resolutionTime - a.resolutionTime);

    if (markets.length > 0 && offset === 0 && limit === DEFAULT_MARKET_PAGE_SIZE) {
      memoryCache = { markets, timestamp: Date.now() };
    }

    return markets;
  } catch (err) {
    console.error("Error in getMarketsFromChain:", err);
    return memoryCache.markets;
  }
}


export function serializeMarket(market: Market): SerializableMarket {
  return {
    ...market,
    followPool: market.followPool.toString(),
    fadePool: market.fadePool.toString(),
  };
}
