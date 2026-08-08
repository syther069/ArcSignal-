import type { Address } from 'viem';
import { ARCSIGNAL_ABI, ARCSIGNAL_ADDRESS, publicClient } from './contracts';
import type { AIAnalysis, Market, MarketCategory, MarketOutcome, SerializableMarket } from './types';

export type { SerializableMarket };

function mapOutcome(resolved: boolean, outcome: number): MarketOutcome {
  if (!resolved) return 'PENDING';
  if (outcome === 1) return 'FOLLOW';
  if (outcome === 2) return 'FADE';
  return 'CANCELLED';
}

function mapCategory(category: string): MarketCategory {
  if (category === 'CRYPTO' || category === 'FOOTBALL') return category;
  return 'CRYPTO';
}

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
const MARKET_READ_CONCURRENCY = 2;
const MARKET_READ_STAGGER_MS = 90;

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

function mapMarketStatus(data: ChainMarket, nowUnix: number): Market['status'] {
  if (data.status === 4 || (data.resolved && data.outcome === 0)) return 'VOIDED';
  if (data.status === 3 || data.resolved) return 'RESOLVED';
  if (data.status === 2) return 'PENDING_RESOLUTION';
  if (data.status === 1) return 'CLOSED';
  return Number(data.resolutionTime) <= nowUnix ? 'PENDING_RESOLUTION' : 'OPEN';
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
        if (index > 0) await sleep(MARKET_READ_STAGGER_MS);
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
      return await withTimeout(read(), timeoutMs, label);
    } catch (err) {
      if (attempt === 2) throw err;
      await sleep(250 * (attempt + 1));
    }
  }

  throw new Error(`Failed to read ${label}`);
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
    const marketCount = await readContractWithRetry(
      'getMarketCount',
      () => publicClient.readContract({
        address: ARCSIGNAL_ADDRESS as Address,
        abi: ARCSIGNAL_ABI,
        functionName: 'getMarketCount',
      }) as Promise<bigint>
    );

    if (marketCount === 0n) return [];

    const nowUnix = Math.floor(Date.now() / 1000);
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
    const targetIds = idResults
      .filter((res): res is PromiseFulfilledResult<string> => res.status === 'fulfilled')
      .map((res) => res.value);
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
          status: mapMarketStatus(data, nowUnix),
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
