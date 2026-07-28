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

export async function getMarketsFromChain(forceRefresh = false): Promise<Market[]> {
  const now = Date.now();
  if (!forceRefresh && memoryCache.markets.length > 0 && (now - memoryCache.timestamp) < 10000) {
    return memoryCache.markets;
  }

  if (!ARCSIGNAL_ADDRESS || !/^0x[a-fA-F0-9]{40}$/.test(ARCSIGNAL_ADDRESS)) {
    return [];
  }

  try {
    const allIds = await publicClient.readContract({
      address: ARCSIGNAL_ADDRESS as Address,
      abi: ARCSIGNAL_ABI,
      functionName: 'getAllMarketIds',
    }) as string[];

    if (!allIds || allIds.length === 0) return [];

    const now = Math.floor(Date.now() / 1000);
    const TIMEFRAME_SECONDS: Record<string, number> = {
      '5m': 300,
      '15m': 900,
      '1h': 3600,
      '4h': 14400,
      '24h': 86400,
    };

    // Parse IDs to find active/recent markets (not expired > 24h ago)
    const activeOrRecentIds = allIds.filter(id => {
      const parts = id.split('-');
      if (parts.length < 4) return true; // Keep unrecognized formats just in case
      const timeframe = parts[2];
      const genTime = parseInt(parts[3], 10);
      if (isNaN(genTime)) return true;
      
      const durationSec = TIMEFRAME_SECONDS[timeframe] ?? 3600;
      const resolutionTime = genTime + durationSec;
      
      // Keep if it resolves in the future, or resolved within the last 24h
      return resolutionTime > now - 86400;
    });

    // Take up to 150 of the most recent active/recent markets to avoid RPC timeouts,
    // prioritizing the most recently created ones if there are too many.
    const targetIds = activeOrRecentIds.slice(-150);
    const markets: Market[] = [];

    // Fetch in parallel chunks for fast execution
    const CHUNK_SIZE = 20;
    for (let i = 0; i < targetIds.length; i += CHUNK_SIZE) {
      const chunkIds = targetIds.slice(i, i + CHUNK_SIZE);
      const chunkResults = await Promise.allSettled(
        chunkIds.map(id =>
          publicClient.readContract({
            address: ARCSIGNAL_ADDRESS as Address,
            abi: ARCSIGNAL_ABI,
            functionName: 'getMarket',
            args: [id],
          })
        )
      );

      for (const res of chunkResults) {
        if (res.status === 'fulfilled' && res.value) {
          const data = res.value as {
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

          markets.push({
            marketId: data.marketId,
            category: mapCategory(data.category),
            question: data.question,
            resolutionTime: Number(data.resolutionTime),
            followPool: data.followPool,
            fadePool: data.fadePool,
            resolved: data.resolved,
            outcome: mapOutcome(data.resolved, data.outcome),
            analysis: safeParseAnalysis(data.analysisJson),
          });
        }
      }
    }

    if (markets.length > 0) {
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
