import type { Address } from 'viem';
import { ARCSIGNAL_ABI, ARCSIGNAL_ADDRESS, publicClient } from './contracts';
import { parseGeminiJson } from './gemini';
import type { AIAnalysis, Market, MarketCategory, MarketOutcome } from './types';

interface ContractMarket {
  id: bigint;
  question: string;
  category: string;
  subType: string;
  followPool: bigint;
  fadePool: bigint;
  resolutionTime: bigint;
  resolved: boolean;
  outcome: number;
  analysisJson: string;
}

export interface SerializableMarket extends Omit<Market, 'followPool' | 'fadePool'> {
  followPool: string;
  fadePool: string;
}

function isAddress(value: string | undefined): value is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(value ?? '');
}

function mapCategory(category: string): MarketCategory {
  if (category === 'CRYPTO' || category === 'FOOTBALL') {
    return category;
  }

  throw new Error(`Unsupported market category: ${category}`);
}

function mapOutcome(resolved: boolean, outcome: number): MarketOutcome {
  if (!resolved) {
    return 'PENDING';
  }

  if (outcome === 0) {
    return 'FOLLOW';
  }

  if (outcome === 1) {
    return 'FADE';
  }

  if (outcome === 2) {
    return 'CANCELLED';
  }

  throw new Error(`Unsupported market outcome: ${outcome}`);
}

export function mapContractMarket(data: ContractMarket, analysis: AIAnalysis): Market {
  return {
    id: Number(data.id),
    question: data.question,
    category: mapCategory(data.category),
    subType: data.subType,
    resolutionTime: Number(data.resolutionTime),
    analysis,
    followPool: data.followPool,
    fadePool: data.fadePool,
    resolved: data.resolved,
    outcome: mapOutcome(data.resolved, data.outcome),
  };
}

export function serializeMarket(market: Market): SerializableMarket {
  return {
    ...market,
    followPool: market.followPool.toString(),
    fadePool: market.fadePool.toString(),
  };
}

export async function getMarketsFromChain(): Promise<Market[]> {
  if (!isAddress(ARCSIGNAL_ADDRESS)) {
    return [];
  }

  const count = await publicClient.readContract({
    address: ARCSIGNAL_ADDRESS,
    abi: ARCSIGNAL_ABI,
    functionName: 'marketCount',
  });

  const markets: Market[] = [];

  for (let i = 0; i < Number(count); i += 1) {
    const data = (await publicClient.readContract({
      address: ARCSIGNAL_ADDRESS,
      abi: ARCSIGNAL_ABI,
      functionName: 'getMarket',
      args: [BigInt(i)],
    })) as ContractMarket;

    markets.push(mapContractMarket(data, parseGeminiJson(data.analysisJson)));
  }

  return markets;
}
