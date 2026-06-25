import { fetchUpcomingFixtures, type Fixture } from './apifootball';
import { fetchCryptoMarkets, type CryptoData } from './coingecko';
import type { LeaderboardEntry, Market, MarketCategory, Stake, UserProfile } from '@/types';

type MarketCategoryFilter = MarketCategory | 'all';

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function mapCryptoMarket(coin: CryptoData): Market {
  const symbol = coin.symbol.toUpperCase();
  const change = coin.price_change_percentage_24h;
  const direction = change >= 0 ? 'higher' : 'lower';
  const probability = clampPercent(50 + change);
  const confidence = clampPercent(
    Math.min(85, 35 + Math.abs(change) * 4 + (coin.total_volume / Math.max(coin.market_cap, 1)) * 100),
  );
  const resolutionTime = Math.floor(Date.now() / 1000) + 24 * 60 * 60;

  return {
    id: `crypto-${coin.id}`,
    category: 'crypto',
    subType: 'price',
    title: `${symbol} trades ${direction} over the next 24 hours`,
    description: `${symbol} is trading at $${coin.current_price.toLocaleString()} with a ${change.toFixed(2)}% 24h move.`,
    agentPick: change >= 0 ? 'Yes' : 'No',
    agentId: 'coingecko-live',
    confidence,
    probability,
    summary: `${symbol} live market data shows a 24h range of $${coin.low_24h.toLocaleString()} to $${coin.high_24h.toLocaleString()} with $${coin.total_volume.toLocaleString()} in volume.`,
    bull_case: `Momentum supports a higher close if ${symbol} holds above its current 24h range midpoint and volume remains firm.`,
    bear_case: `The setup weakens if ${symbol} retraces toward its 24h low or broad crypto volume fades.`,
    keyFactors: [
      `Current price: $${coin.current_price.toLocaleString()}`,
      `24h change: ${change.toFixed(2)}%`,
      `24h volume: $${coin.total_volume.toLocaleString()}`,
    ],
    data_sources: ['CoinGecko markets API'],
    volume: coin.total_volume,
    followPool: 0,
    fadePool: 0,
    resolutionTime,
    resolved: false,
    createdAt: new Date().toISOString(),
  };
}

function mapFootballMarket(fixture: Fixture): Market {
  const hoursUntilKickoff = Math.max(
    0,
    (fixture.kickoffTime - Math.floor(Date.now() / 1000)) / 3600,
  );
  const confidence = clampPercent(25 + Math.min(35, hoursUntilKickoff / 2));

  return {
    id: `football-${fixture.fixtureId}`,
    category: 'football',
    title: `${fixture.homeTeam} defeats ${fixture.awayTeam}`,
    description: `${fixture.homeTeam} faces ${fixture.awayTeam} in ${fixture.leagueName}, ${fixture.round}.`,
    agentPick: fixture.homeTeam,
    agentId: 'api-football-live',
    confidence,
    probability: confidence,
    summary: `${fixture.leagueName} fixture data lists ${fixture.homeTeam} vs ${fixture.awayTeam} with kickoff at ${new Date(fixture.kickoffTime * 1000).toISOString()}.`,
    bull_case: `${fixture.homeTeam} has the listed home-side position for this fixture.`,
    bear_case: `${fixture.awayTeam} can fade the home-side prediction if match conditions or team quality favor the away side.`,
    keyFactors: [
      `Fixture ID: ${fixture.fixtureId}`,
      `Round: ${fixture.round}`,
      `Status: ${fixture.status}`,
    ],
    data_sources: ['API-Football fixtures API'],
    followPool: 0,
    fadePool: 0,
    resolutionTime: fixture.kickoffTime,
    resolved: false,
    league: fixture.leagueName,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    homeScore: fixture.homeScore ?? undefined,
    awayScore: fixture.awayScore ?? undefined,
    createdAt: new Date().toISOString(),
  };
}

export async function getOpenMarkets(): Promise<Market[]> {
  return getMarketsByCategory('all');
}

export async function getMarketById(id: string): Promise<Market | null> {
  const markets = await getOpenMarkets();
  return markets.find((market) => market.id === id) ?? null;
}

export async function getMarketsByCategory(category: MarketCategoryFilter): Promise<Market[]> {
  if (category === 'football') {
    try {
      const fixtures = await fetchUpcomingFixtures();
      return fixtures.map(mapFootballMarket);
    } catch {
      return [];
    }
  }

  if (category === 'crypto') {
    try {
      const coins = await fetchCryptoMarkets();
      return coins.map(mapCryptoMarket);
    } catch {
      return [];
    }
  }

  const [footballMarkets, cryptoMarkets] = await Promise.all([
    getMarketsByCategory('football'),
    getMarketsByCategory('crypto'),
  ]);
  return [...footballMarkets, ...cryptoMarkets];
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
