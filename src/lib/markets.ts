import type { Address } from 'viem';
import { ARCSIGNAL_ABI, ARCSIGNAL_ADDRESS, publicClient } from './contracts';
import type { AIAnalysis, Market, MarketCategory, MarketOutcome, SerializableMarket } from './types';

// In-memory cache for AI analysis (keyed by marketId)
const analysisCache = new Map<string, AIAnalysis>();
const questionCache = new Map<string, string>();

export function cacheAnalysis(marketId: string, question: string, analysis: AIAnalysis) {
  analysisCache.set(marketId, analysis);
  questionCache.set(marketId, question);
}

function mapOutcome(resolved: boolean, outcome: number): MarketOutcome {
  if (!resolved) return 'PENDING';
  if (outcome === 0) return 'FOLLOW';
  return 'FADE';
}

function mapCategory(category: string): MarketCategory {
  if (category === 'CRYPTO' || category === 'FOOTBALL') return category;
  return 'CRYPTO';
}

export async function getMarketIds(): Promise<string[]> {
  if (!ARCSIGNAL_ADDRESS || !/^0x[a-fA-F0-9]{40}$/.test(ARCSIGNAL_ADDRESS)) return [];

  const logs = await publicClient.getLogs({
    address: ARCSIGNAL_ADDRESS as Address,
    event: {
      type: 'event',
      name: 'MarketCreated',
      inputs: [
        { type: 'string', name: 'marketId', indexed: false },
        { type: 'string', name: 'category', indexed: false },
        { type: 'uint256', name: 'resolutionTime', indexed: false },
      ],
    },
    fromBlock: 0n,
    toBlock: 'latest',
  });

  return logs.map((log) => (log.args as { marketId: string }).marketId);
}

export async function getMarketsFromChain(): Promise<Market[]> {
  if (!ARCSIGNAL_ADDRESS || !/^0x[a-fA-F0-9]{40}$/.test(ARCSIGNAL_ADDRESS)) return [];

  const marketIds = await getMarketIds();
  const markets: Market[] = [];

  for (const marketId of marketIds) {
    try {
      const data = await publicClient.readContract({
        address: ARCSIGNAL_ADDRESS as Address,
        abi: ARCSIGNAL_ABI,
        functionName: 'getMarket',
        args: [marketId],
      }) as {
        marketId: string;
        category: string;
        resolutionTime: bigint;
        followPool: bigint;
        fadePool: bigint;
        resolved: boolean;
        outcome: number;
      };

      markets.push({
        marketId: data.marketId,
        category: mapCategory(data.category),
        resolutionTime: Number(data.resolutionTime),
        followPool: data.followPool,
        fadePool: data.fadePool,
        resolved: data.resolved,
        outcome: mapOutcome(data.resolved, data.outcome),
        analysis: analysisCache.get(marketId),
        question: questionCache.get(marketId),
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
