import { formatUnits } from 'viem';
import type { SerializableMarket } from './markets';
import type { Market as UiMarket } from '@/types';

function usdcToNumber(value: string) {
  try {
    return Number(formatUnits(BigInt(value), 6));
  } catch {
    return 0;
  }
}

function parseFootballTeams(question: string) {
  const match = question.match(/^Will (.+?) beat (.+?) on /);
  return {
    homeTeam: match?.[1],
    awayTeam: match?.[2],
  };
}

export function toUiMarket(market: SerializableMarket): UiMarket {
  const category = market.category === 'FOOTBALL' ? 'football' : 'crypto';
  const pools = {
    followPool: usdcToNumber(market.followPool),
    fadePool: usdcToNumber(market.fadePool),
  };
  const teams = category === 'football' ? parseFootballTeams(market.question) : {};

  return {
    id: String(market.id),
    category,
    subType: category === 'crypto' ? 'price' : undefined,
    title: market.question,
    description: market.analysis.summary,
    agentPick: market.analysis.prediction,
    agentId: 'arcsignal-agent',
    confidence: market.analysis.confidence,
    probability: market.analysis.probability,
    summary: market.analysis.summary,
    bull_case: market.analysis.bullCase,
    bear_case: market.analysis.bearCase,
    keyFactors: market.analysis.keyFactors,
    data_sources: market.analysis.sources,
    volume: pools.followPool + pools.fadePool,
    participants: 0,
    followPool: pools.followPool,
    fadePool: pools.fadePool,
    resolutionTime: market.resolutionTime,
    resolved: market.resolved,
    outcome: market.outcome,
    resolution_source: category === 'football' ? 'API-Football' : 'CoinGecko',
    createdAt: market.analysis.generatedAt,
    ...teams,
  };
}
