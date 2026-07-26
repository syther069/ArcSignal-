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

    const nowUnix = Math.floor(Date.now() / 1000);
    const likelyActiveIds = allIds.filter(marketId => {
      const parts = marketId.split('-');
      const timestampStr = parts[parts.length - 1];
      const generationTime = parseInt(timestampStr, 10);

      if (isNaN(generationTime) || generationTime === 0) return true;
      return (generationTime + 86400) >= nowUnix;
    });

    const targetIds = likelyActiveIds.slice(-60);
    const markets: Market[] = [];

    // Fetch in small parallel chunks with slight pacing
    const CHUNK_SIZE = 5;
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

      if (i + CHUNK_SIZE < targetIds.length) {
        await new Promise(r => setTimeout(r, 200));
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
