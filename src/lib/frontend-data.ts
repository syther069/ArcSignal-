import { formatUnits } from 'viem';
import { getMarketsFromChain } from './markets';
import type { LeaderboardEntry, Market, MarketCategory, Stake, UserProfile } from '@/types';

function toLegacyCategory(category: 'CRYPTO' | 'FOOTBALL'): MarketCategory {
  return category === 'CRYPTO' ? 'crypto' : 'football';
}

export async function getOpenMarkets(): Promise<Market[]> {
  const markets = await getMarketsFromChain();

  return markets
    .filter((market) => !market.resolved)
    .map((market) => ({
      id: market.id.toString(),
      category: toLegacyCategory(market.category),
      subType: market.subType as Market['subType'],
      title: market.question,
      description: market.analysis.summary,
      agentPick: market.analysis.prediction,
      agentId: 'gemini-2.5-flash',
      confidence: market.analysis.confidence,
      probability: market.analysis.probability,
      summary: market.analysis.summary,
      bull_case: market.analysis.bullCase,
      bear_case: market.analysis.bearCase,
      keyFactors: market.analysis.keyFactors,
      data_sources: market.analysis.sources,
      followPool: Number(formatUnits(market.followPool, 6)),
      fadePool: Number(formatUnits(market.fadePool, 6)),
      resolutionTime: market.resolutionTime,
      resolved: market.resolved,
      outcome: market.outcome,
      createdAt: market.analysis.generatedAt,
    }));
}

export async function getMarketById(id: string): Promise<Market | null> {
  const markets = await getOpenMarkets();
  return markets.find((market) => market.id === id) ?? null;
}

export async function getMarketsByCategory(category: MarketCategory): Promise<Market[]> {
  const markets = await getOpenMarkets();
  return markets.filter((market) => market.category === category);
}

export async function getRecentStakes(_limit = 20): Promise<Stake[]> {
  return [];
}

export async function getLeaderboard(_filter = 'profit', _limit = 50): Promise<LeaderboardEntry[]> {
  return [];
}

export async function getUserProfile(_walletAddress: string): Promise<UserProfile | null> {
  return null;
}

export async function getUserStakes(_walletAddress: string): Promise<Stake[]> {
  return [];
}

export async function updateUserProfile(
  _walletAddress: string,
  _updates: Partial<Omit<UserProfile, 'walletAddress'>>,
): Promise<void> {
  throw new Error('Profiles are not available without a database');
}
