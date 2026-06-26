import { GoogleGenerativeAI } from '@google/generative-ai';
import { fetchUpcomingFixtures, type Fixture } from './apifootball';
import { fetchCryptoMarkets, type CryptoData } from './coingecko';
import type { LeaderboardEntry, Market, MarketCategory, Stake, UserProfile } from '@/types';

async function generateWithGemini(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelNames = ['gemini-1.5-flash', 'gemini-2.0-flash-lite'];
  const retryDelays = [1000, 2000, 4000];
  let lastError: unknown;

  for (const modelName of modelNames) {
    const model = genAI.getGenerativeModel({ model: modelName });

    for (let attempt = 0; attempt < retryDelays.length; attempt += 1) {
      try {
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.4,
          },
        });

        const raw = result.response.text();
        const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
        return JSON.parse(cleaned);
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('404 Not Found')) break;
        if (attempt < retryDelays.length - 1) {
          await delay(retryDelays[attempt]);
        }
      }
    }
  }
  throw new Error(`Gemini analysis failed: ${lastError instanceof Error ? lastError.message : 'Unknown error'}`);
}

type MarketCategoryFilter = MarketCategory | 'all';

type GeminiMarketData = {
  title: string;
  probability: number;
  confidence: number;
  summary: string;
  bull_case: string;
  bear_case: string;
  keyFactors: string[];
  followPool: number;
  fadePool: number;
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function assertMarketArray(value: unknown): GeminiMarketData[] {
  if (!Array.isArray(value)) {
    throw new Error('Gemini returned a non-array market response');
  }

  return value as GeminiMarketData[];
}

async function mapCryptoMarkets(coins: CryptoData[]): Promise<Market[]> {
  if (coins.length === 0) return [];

  const resolutionDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const resolutionTime = Math.floor(resolutionDate.getTime() / 1000);
  const resolutionDateStr = resolutionDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  const coinPromptData = coins.map((coin) => ({
    id: coin.id,
    symbol: coin.symbol.toUpperCase(),
    current_price: coin.current_price,
    price_change_24h: coin.price_change_percentage_24h,
    price_change_7d: null,
    market_cap: coin.market_cap,
    total_volume: coin.total_volume,
  }));

  const prompt = `You are a cryptocurrency prediction AI with deep knowledge of market trends and momentum.
Analyze these ${coins.length} crypto coins and return ONLY a raw JSON array with no markdown, no backticks.
Each item must have:
title, probability, confidence, summary, bull_case, bear_case, keyFactors (array of 3 strings), followPool, fadePool

Coins data: ${JSON.stringify(coinPromptData)}

For each coin generate a meaningful prediction market title like:
'Will BTC close above $[price*1.05] by ${resolutionDateStr}?'

Return array of exactly ${coins.length} objects in same order as input coins.`;

  const aiMarkets = assertMarketArray(await generateWithGemini(prompt));

  return coins.map((coin, index) => {
    const aiData = aiMarkets[index];
    if (!aiData) return null;

    const market: Market = {
      id: `crypto-${coin.id}`,
      category: 'crypto',
      subType: 'price',
      title: aiData.title,
      description: aiData.summary,
      agentPick: aiData.probability >= 50 ? 'Yes' : 'No',
      agentId: 'gemini-crypto-analyst',
      confidence: aiData.confidence,
      probability: aiData.probability,
      summary: aiData.summary,
      bull_case: aiData.bull_case,
      bear_case: aiData.bear_case,
      keyFactors: aiData.keyFactors,
      data_sources: ['Gemini AI Analysis', 'CoinGecko'],
      volume: coin.total_volume,
      followPool: aiData.followPool,
      fadePool: aiData.fadePool,
      resolutionTime,
      resolved: false,
      outcome: undefined,
      createdAt: new Date().toISOString(),
    };
    return market;
  }).filter((market): market is Market => market !== null);
}

async function mapFootballMarkets(fixtures: Fixture[]): Promise<Market[]> {
  if (fixtures.length === 0) return [];

  const fixturePromptData = fixtures.map((fixture) => ({
    fixtureId: fixture.fixtureId,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    leagueName: fixture.leagueName,
    round: fixture.round,
    kickoffTime: new Date(fixture.kickoffTime * 1000).toISOString(),
  }));

  const prompt = `You are a football prediction AI with deep knowledge of teams, leagues, 
and match statistics. Analyze these ${fixtures.length} fixtures and return ONLY a raw JSON array with no markdown, no backticks.
Each item must have:
title, probability, confidence, summary, bull_case, bear_case, keyFactors (array of 3 strings), followPool, fadePool

Fixtures data: ${JSON.stringify(fixturePromptData)}

For each fixture generate a meaningful prediction market title like:
'Will [homeTeam] beat [awayTeam]?'

Return array of exactly ${fixtures.length} objects in same order as input fixtures.`;

  const aiMarkets = assertMarketArray(await generateWithGemini(prompt));

  return fixtures.map((fixture, index) => {
    const aiData = aiMarkets[index];
    if (!aiData) return null;

    const market: Market = {
      id: `football-${fixture.homeTeam}-${fixture.awayTeam}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      category: 'football',
      subType: 'match-winner' as any,
      title: aiData.title,
      description: aiData.summary,
      agentPick: fixture.homeTeam,
      agentId: 'gemini-football-analyst',
      confidence: aiData.confidence,
      probability: aiData.probability,
      summary: aiData.summary,
      bull_case: aiData.bull_case,
      bear_case: aiData.bear_case,
      keyFactors: aiData.keyFactors,
      data_sources: ['Gemini AI Analysis', 'API-Football'],
      followPool: aiData.followPool,
      fadePool: aiData.fadePool,
      resolutionTime: fixture.kickoffTime + 7200,
      resolved: false,
      outcome: undefined,
      league: fixture.leagueName,
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      homeScore: fixture.homeScore ?? undefined,
      awayScore: fixture.awayScore ?? undefined,
      createdAt: new Date().toISOString(),
    };
    return market;
  }).filter((market): market is Market => market !== null);
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
      return await mapFootballMarkets(fixtures);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('API_FOOTBALL_KEY')) {
        console.warn('[ArcSignal] Football markets skipped: API_FOOTBALL_KEY is not configured.');
      } else {
        console.error('[ArcSignal] Football markets fetch error:', msg);
      }
      return [];
    }
  }

  if (category === 'crypto') {
    try {
      const coins = await fetchCryptoMarkets();
      return await mapCryptoMarkets(coins);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('GEMINI_API_KEY') || msg.includes('COINGECKO')) {
        console.warn('[ArcSignal] Crypto markets skipped:', msg);
      } else {
        console.error('[ArcSignal] Crypto markets fetch error:', msg);
      }
      return [];
    }
  }

  const [footballMarkets, cryptoMarkets] = await Promise.all([
    getMarketsByCategory('football'),
    delay(1000).then(() => getMarketsByCategory('crypto')),
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
