import { formatUnits } from 'viem';
import type { SerializableMarket } from './types';
import type { Market as UiMarket } from '@/types';

function usdcToNumber(value: string) {
  try {
    return Number(formatUnits(BigInt(value), 6));
  } catch {
    return 0;
  }
}

const UI_CATEGORY_BY_CANONICAL = {
  CRYPTO: 'crypto',
  FOOTBALL: 'football',
  SPORTS: 'sports',
  POLITICS: 'politics',
  TECHNOLOGY: 'technology',
  ECONOMICS: 'economics',
  CULTURE: 'culture',
} as const;

function parseFootballTeams(question: string) {
  const match = question.match(/^Will (.+?) beat (.+?) on /);
  return {
    homeTeam: match?.[1],
    awayTeam: match?.[2],
  };
}

export function toUiMarket(market: SerializableMarket): UiMarket {
  const category = UI_CATEGORY_BY_CANONICAL[market.category] ?? 'crypto';
  const title = (market.question ?? market.marketId).replace(/\s*\[fixtureId:\d+\]\s*$/, '');
  const pools = {
    followPool: usdcToNumber(market.followPool),
    fadePool: usdcToNumber(market.fadePool),
  };
  const teams = category === 'football' ? parseFootballTeams(title) : {};

  return {
    marketId: market.marketId,
    protocolVersion: market.protocolVersion ?? 1,
    contractAddress: market.contractAddress,
    proof: market.proof,
    category,
    subType: category === 'crypto' ? 'price' : undefined,
    title,
    description: market.analysis?.summary ?? title,
    agentPick: market.analysis?.prediction ?? 'YES',
    agentId: 'arcsignal-agent',
    confidence: market.analysis?.confidence ?? 50,
    probability: market.analysis?.probability ?? 50,
    summary: market.analysis?.summary,
    bull_case: market.analysis?.bullCase,
    bear_case: market.analysis?.bearCase,
    keyFactors: market.analysis?.keyFactors ?? [],
    data_sources: market.analysis?.sources,
    volume: pools.followPool + pools.fadePool,
    participants: 0,
    followPool: pools.followPool,
    fadePool: pools.fadePool,
    followPoolRaw: market.followPool,
    fadePoolRaw: market.fadePool,
    resolutionTime: market.resolutionTime,
    resolved: market.resolved,
    outcome: market.outcome,
    status: market.status,
    resolution_source: market.proof?.resolutionSourceHash
      ? `Committed source ${market.proof.resolutionSourceHash.slice(0, 10)}...`
      : category === 'football' ? 'API-Football' : 'CoinGecko',
    resolution_timestamp: market.resolvedAt,
    resolution_reason: market.resolutionReason,
    createdAt: market.analysis?.generatedAt ?? new Date().toISOString(),
    ...teams,
  };
}
