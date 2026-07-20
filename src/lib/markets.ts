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

export async function getMarketsFromChain(): Promise<Market[]> {
  console.log("getMarketsFromChain called. ARCSIGNAL_ADDRESS:", ARCSIGNAL_ADDRESS);
  if (!ARCSIGNAL_ADDRESS || !/^0x[a-fA-F0-9]{40}$/.test(ARCSIGNAL_ADDRESS)) {
    console.log("ARCSIGNAL_ADDRESS check failed");
    return [];
  }

  const count = await publicClient.readContract({
    address: ARCSIGNAL_ADDRESS as Address,
    abi: ARCSIGNAL_ABI,
    functionName: 'getMarketCount',
  }) as bigint;

  // 1. Fetch all market IDs in one call
  const allIds = await publicClient.readContract({
    address: ARCSIGNAL_ADDRESS as Address,
    abi: ARCSIGNAL_ABI,
    functionName: 'getAllMarketIds',
  }) as string[];

  if (!allIds || allIds.length === 0) return [];

  // 2. Pre-filter IDs by parsing the timestamp embedded in the ID to avoid fetching expired markets.
  const nowUnix = Math.floor(Date.now() / 1000);
  const likelyActiveIds = allIds.filter(marketId => {
    const parts = marketId.split('-');
    const timestampStr = parts[parts.length - 1];
    const generationTime = parseInt(timestampStr, 10);

    if (isNaN(generationTime) || generationTime === 0) return true;
    return (generationTime + 86400) >= nowUnix;
  });

  const targetIds = likelyActiveIds.slice(-20);
  const markets: Market[] = [];

  for (const marketId of targetIds) {
    try {
      const data = await publicClient.readContract({
        address: ARCSIGNAL_ADDRESS as Address,
        abi: ARCSIGNAL_ABI,
        functionName: 'getMarket',
        args: [marketId],
      }) as {
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
    } catch {
      // Ignore individual read errors
    }
  }

  return markets;

}

export function serializeMarket(market: Market): SerializableMarket {
  return {
    ...market,
    followPool: market.followPool.toString(),
    fadePool: market.fadePool.toString(),
  };
}
