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

    let durationSeconds = 86400 * 3; // Default 3 days buffer
    if (marketId.includes('-5m-')) durationSeconds = 300;
    else if (marketId.includes('-15m-')) durationSeconds = 900;
    else if (marketId.includes('-1h-')) durationSeconds = 3600;
    else if (marketId.includes('-4h-')) durationSeconds = 14400;
    else if (marketId.includes('-24h-')) durationSeconds = 86400;

    // Keep markets that haven't expired, plus an extra 24 hours buffer since the UI shows recently resolved markets.
    return (generationTime + durationSeconds + 86400) >= nowUnix;
  });

  // Limit to at most the 100 most recent active IDs just in case
  const targetIds = likelyActiveIds.slice(-100);

  const CHUNK_SIZE = 5; // Smaller chunk size to strictly respect RPC rate limits
  const markets: Market[] = [];

  for (let i = 0; i < targetIds.length; i += CHUNK_SIZE) {
    const chunkIds = targetIds.slice(i, i + CHUNK_SIZE);
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
    // Small delay to prevent rate limit
    if (i + CHUNK_SIZE < targetIds.length) {
      await new Promise(r => setTimeout(r, 200));
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
