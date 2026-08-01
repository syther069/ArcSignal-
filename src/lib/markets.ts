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
const MARKET_RPC_TIMEOUT_MS = 12_000;
const DEFAULT_MARKET_PAGE_SIZE = 160;

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
};

async function readMarketChunk(chunkIds: string[], chunkIndex: number): Promise<PromiseSettledResult<ChainMarket>[]> {
  try {
    const multicallResults = await withTimeout(
      publicClient.multicall({
        allowFailure: true,
        contracts: chunkIds.map(id => ({
          address: ARCSIGNAL_ADDRESS as Address,
          abi: ARCSIGNAL_ABI,
          functionName: 'getMarket',
          args: [id],
        })),
      }),
      MARKET_RPC_TIMEOUT_MS,
      `getMarket multicall chunk ${chunkIndex}`
    );

    return multicallResults.map((res) => {
      if (res.status === 'success' && res.result) {
        return { status: 'fulfilled', value: res.result as unknown as ChainMarket };
      }

      return {
        status: 'rejected',
        reason: res.error ?? new Error('Market multicall failed'),
      };
    });
  } catch (error) {
    const isUnsupportedMulticall = error instanceof Error && error.message.includes('multicall3');
    if (!isUnsupportedMulticall) {
      throw error;
    }

    return withTimeout(
      Promise.allSettled(
        chunkIds.map(id =>
          publicClient.readContract({
            address: ARCSIGNAL_ADDRESS as Address,
            abi: ARCSIGNAL_ABI,
            functionName: 'getMarket',
            args: [id],
          }) as Promise<ChainMarket>
        )
      ),
      MARKET_RPC_TIMEOUT_MS,
      `getMarket fallback chunk ${chunkIndex}`
    );
  }
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
    const allIds = await withTimeout(
      publicClient.readContract({
        address: ARCSIGNAL_ADDRESS as Address,
        abi: ARCSIGNAL_ABI,
        functionName: 'getAllMarketIds',
      }) as Promise<string[]>,
      MARKET_RPC_TIMEOUT_MS,
      'getAllMarketIds'
    );

    if (!allIds || allIds.length === 0) return [];

    const nowUnix = Math.floor(Date.now() / 1000);
    const targetIds = [...allIds].reverse().slice(offset, offset + limit);
    const markets: Market[] = [];

    // Fetch in parallel chunks for fast execution
    const CHUNK_SIZE = 20;
    for (let i = 0; i < targetIds.length; i += CHUNK_SIZE) {
      const chunkIds = targetIds.slice(i, i + CHUNK_SIZE);
      const chunkResults = await readMarketChunk(chunkIds, Math.floor(i / CHUNK_SIZE) + 1);

      for (const res of chunkResults) {
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
            status: data.resolved
              ? 'RESOLVED'
              : Number(data.resolutionTime) <= nowUnix
                ? 'PENDING_RESOLUTION'
                : 'ACTIVE',
            resolvedAt: data.resolved ? Number(data.resolutionTime) : undefined,
            resolutionReason: data.resolved
              ? `Resolved on-chain with ${mapOutcome(data.resolved, data.outcome)} outcome.`
              : undefined,
            analysis: safeParseAnalysis(data.analysisJson),
          });
        }
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
