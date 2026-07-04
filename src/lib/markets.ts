import type { Address } from 'viem';
import { ARCSIGNAL_ABI, ARCSIGNAL_ADDRESS, publicClient } from './contracts';
import type { AIAnalysis, Market, MarketCategory, MarketOutcome, SerializableMarket } from './types';

export type { SerializableMarket };

function mapOutcome(resolved: boolean, outcome: number): MarketOutcome {
  if (!resolved) return 'PENDING';
  if (outcome === 0) return 'FOLLOW';
  if (outcome === 1) return 'FADE';
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

  if (!count || count === 0n) return [];

  const markets: Market[] = [];

  for (let i = 0; i < Number(count); i++) {
    try {
      const marketId = await publicClient.readContract({
        address: ARCSIGNAL_ADDRESS as Address,
        abi: ARCSIGNAL_ABI,
        functionName: 'getMarketIdByIndex',
        args: [BigInt(i)],
      }) as string;

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
      // skip markets that fail to load
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
