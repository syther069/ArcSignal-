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

  if (!count || count === 0n) return [];

  const countNum = Number(count);
  const CHUNK_SIZE = 20;

  // 1. Fetch all market IDs in chunks
  const marketIds: string[] = [];
  for (let i = 0; i < countNum; i += CHUNK_SIZE) {
    const chunkPromises = [];
    for (let j = i; j < i + CHUNK_SIZE && j < countNum; j++) {
      chunkPromises.push(
        publicClient.readContract({
          address: ARCSIGNAL_ADDRESS as Address,
          abi: ARCSIGNAL_ABI,
          functionName: 'getMarketIdByIndex',
          args: [BigInt(j)],
        }) as Promise<string>
      );
    }
    const chunkResults = await Promise.allSettled(chunkPromises);
    for (const res of chunkResults) {
      if (res.status === 'fulfilled' && res.value) {
        marketIds.push(res.value);
      }
    }
  }

  const markets: Market[] = [];

  // 2. Fetch all market data in chunks
  for (let i = 0; i < marketIds.length; i += CHUNK_SIZE) {
    const chunkIds = marketIds.slice(i, i + CHUNK_SIZE);
    const chunkPromises = chunkIds.map(marketId =>
      publicClient.readContract({
        address: ARCSIGNAL_ADDRESS as Address,
        abi: ARCSIGNAL_ABI,
        functionName: 'getMarket',
        args: [marketId],
      }) as Promise<{
        marketId: string;
        category: string;
        question: string;
        analysisJson: string;
        resolutionTime: bigint;
        followPool: bigint;
        fadePool: bigint;
        resolved: boolean;
        outcome: number;
      }>
    );

    const chunkResults = await Promise.allSettled(chunkPromises);
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
          analysis: safeParseAnalysis(data.analysisJson),
        });
      }
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
