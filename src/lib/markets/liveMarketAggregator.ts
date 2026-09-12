import { getExternalSettlementsByLiveIds, type ExternalSettlementRecord } from './externalSettlement';
import type {
  ArcSignalLiveMarket,
  LiveMarketAggregatorResult,
  LiveMarketCategory,
  LiveMarketContextSource,
  LiveMarketRisk,
  LiveMarketSide,
  LiveMarketSource,
  LiveMarketSourceStatus,
} from './liveMarketTypes';

const POLYMARKET_MARKETS_URL = 'https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=100&order=volumeNum&ascending=false';
const KALSHI_MARKETS_URL = 'https://external-api.kalshi.com/trade-api/v2/markets?status=open&limit=100';
const MANIFOLD_MARKETS_URL = 'https://api.manifold.markets/v0/search-markets?sort=most-popular&filter=open&contractType=BINARY&limit=100';
const DEFAULT_DEMO_BALANCE = 100;
const CACHE_MS = 120_000;

const CATEGORY_KEYWORDS: Record<LiveMarketCategory, string[]> = {
  crypto: ['bitcoin', 'ethereum', 'solana', 'crypto', 'btc', 'eth', 'token', 'defi'],
  politics: [
    'election', 'president', 'senate', 'congress', 'government', 'minister', 'vote', 'poll', 'court',
    'law', 'policy', 'geopolitical', 'war', 'candidate', 'party', 'trump', 'biden', 'harris', 'parliament',
  ],
  technology: [
    'ai', 'openai', 'google', 'apple', 'microsoft', 'nvidia', 'tesla', 'spacex', 'chip', 'semiconductor',
    'llm', 'model', 'software', 'startup', 'github', 'robot', 'technology', 'iphone', 'android', 'compute',
  ],
  economics: [
    'fed', 'rate', 'rate cut', 'interest', 'inflation', 'cpi', 'gdp', 'unemployment', 'recession', 'jobs',
    'treasury', 'oil', 'gold', 'stock', 'market', 'economy', 'tariff', 'yields', 'mortgage', 'dollar',
  ],
};

type PolymarketMarket = Record<string, unknown>;
type KalshiMarket = Record<string, unknown>;
type ManifoldMarket = Record<string, unknown>;

type CacheEntry = { expiresAt: number; result: LiveMarketAggregatorResult };
let aggregateCache: CacheEntry | null = null;

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function assignLiveMarketCategory(input: { title?: string; question?: string; description?: string; tags?: string[] }): LiveMarketCategory | null {
  const primary = normalizeText([
    input.title,
    input.question,
    ...(input.tags ?? []),
  ].filter(Boolean).join(' '));
  const secondary = normalizeText(input.description ?? '');

  let winner: LiveMarketCategory | null = null;
  let score = 0;
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as Array<[LiveMarketCategory, string[]]>) {
    const hits = keywords.reduce((total, keyword) => {
      const normalizedKeyword = normalizeText(keyword);
      if (primary.includes(normalizedKeyword)) return total + 2;
      if (normalizedKeyword !== 'market' && secondary.includes(normalizedKeyword)) return total + 1;
      return total;
    }, 0);
    if (hits > score) {
      winner = category;
      score = hits;
    }
  }
  return winner;
}

function sourceUrl(source: LiveMarketSource, slugOrUrl?: string, fallbackId?: string) {
  if (slugOrUrl?.startsWith('http')) return slugOrUrl;
  if (source === 'polymarket' && slugOrUrl) return `https://polymarket.com/event/${slugOrUrl}`;
  if (source === 'kalshi' && fallbackId) return `https://kalshi.com/markets/${fallbackId}`;
  if (source === 'manifold' && slugOrUrl) return slugOrUrl;
  return '#';
}

function inferPolymarketProbability(outcomesRaw: unknown, pricesRaw: unknown) {
  const outcomes = parseJsonArray(outcomesRaw).map((outcome) => String(outcome).toUpperCase());
  const prices = parseJsonArray(pricesRaw).map((price) => asNumber(price)).filter((price): price is number => price !== undefined);
  const yesIndex = outcomes.findIndex((outcome) => outcome === 'YES');
  const noIndex = outcomes.findIndex((outcome) => outcome === 'NO');
  const yesPrice = yesIndex >= 0 ? prices[yesIndex] : prices[0];
  const noPrice = noIndex >= 0 ? prices[noIndex] : prices[1];
  if (yesPrice === undefined) return null;
  const yes = yesPrice > 1 ? yesPrice / 100 : yesPrice;
  return { probability: clamp01(yes), yesPrice: clamp01(yes), noPrice: noPrice === undefined ? clamp01(1 - yes) : clamp01(noPrice > 1 ? noPrice / 100 : noPrice) };
}

export function normalizePolymarketMarket(raw: PolymarketMarket): ArcSignalLiveMarket | null {
  const question = asString(raw.question) ?? asString(raw.title);
  if (!question) return null;
  const category = assignLiveMarketCategory({
    title: asString(raw.title),
    question,
    description: asString(raw.description),
    tags: [asString(raw.category), asString(raw.subcategory)].filter(Boolean) as string[],
  });
  if (!category) return null;
  const probability = inferPolymarketProbability(raw.outcomes, raw.outcomePrices);
  if (!probability) return null;
  const id = asString(raw.conditionId) ?? asString(raw.condition_id) ?? asString(raw.id);
  if (!id) return null;
  return attachLiveSignal({
    id: `polymarket:${id}`,
    source: 'polymarket',
    category,
    title: asString(raw.title) ?? question,
    question,
    description: asString(raw.description),
    outcomes: ['YES', 'NO'],
    marketProbability: probability.probability,
    yesPrice: probability.yesPrice,
    noPrice: probability.noPrice,
    volume: asNumber(raw.volumeNum) ?? asNumber(raw.volume) ?? asNumber(raw.volume24hr),
    liquidity: asNumber(raw.liquidityNum) ?? asNumber(raw.liquidity),
    endDate: asString(raw.endDate) ?? asString(raw.end_date_iso),
    resolutionDate: asString(raw.resolutionDate),
    resolutionSource: asString(raw.resolutionSource),
    sourceUrl: sourceUrl('polymarket', asString(raw.slug), id),
    externalMarketId: asString(raw.id) ?? id,
  });
}

function normalizeKalshiMarket(raw: KalshiMarket): ArcSignalLiveMarket | null {
  const ticker = asString(raw.ticker);
  const question = asString(raw.title) ?? asString(raw.subtitle) ?? asString(raw.yes_sub_title);
  if (!ticker || !question) return null;
  const category = assignLiveMarketCategory({ question, description: asString(raw.rules_primary) ?? asString(raw.settlement_timer_seconds) });
  if (!category || (category !== 'economics' && category !== 'politics')) return null;
  const yesBid = asNumber(raw.yes_bid);
  const yesAsk = asNumber(raw.yes_ask);
  const lastPrice = asNumber(raw.last_price);
  const probabilityCents = yesBid !== undefined && yesAsk !== undefined ? (yesBid + yesAsk) / 2 : lastPrice;
  if (probabilityCents === undefined) return null;
  const probability = probabilityCents > 1 ? probabilityCents / 100 : probabilityCents;
  return attachLiveSignal({
    id: `kalshi:${ticker}`,
    source: 'kalshi',
    category,
    title: question,
    question,
    description: asString(raw.rules_primary),
    outcomes: ['YES', 'NO'],
    marketProbability: clamp01(probability),
    yesPrice: clamp01(probability),
    noPrice: clamp01(1 - probability),
    volume: asNumber(raw.volume) ?? asNumber(raw.volume_24h),
    liquidity: asNumber(raw.open_interest),
    endDate: asString(raw.close_time),
    resolutionDate: asString(raw.expected_expiration_time) ?? asString(raw.expiration_time),
    resolutionSource: asString(raw.settlement_source) ?? asString(raw.rules_primary),
    sourceUrl: sourceUrl('kalshi', undefined, ticker),
    externalMarketId: ticker,
  });
}

function normalizeManifoldMarket(raw: ManifoldMarket): ArcSignalLiveMarket | null {
  const id = asString(raw.id);
  const question = asString(raw.question);
  if (!id || !question) return null;
  if (asString(raw.outcomeType) !== 'BINARY') return null;
  const category = assignLiveMarketCategory({ question, description: asString(raw.description), tags: parseJsonArray(raw.groupSlugs).map(String) });
  if (!category) return null;
  const probability = asNumber(raw.probability);
  if (probability === undefined) return null;
  return attachLiveSignal({
    id: `manifold:${id}`,
    source: 'manifold',
    category,
    title: question,
    question,
    description: asString(raw.description),
    outcomes: ['YES', 'NO'],
    marketProbability: clamp01(probability > 1 ? probability / 100 : probability),
    yesPrice: clamp01(probability > 1 ? probability / 100 : probability),
    noPrice: clamp01(1 - (probability > 1 ? probability / 100 : probability)),
    volume: asNumber(raw.volume) ?? asNumber(raw.volume24Hours),
    liquidity: asNumber(raw.totalLiquidity) ?? asNumber(raw.subsidy),
    endDate: typeof raw.closeTime === 'number' ? new Date(raw.closeTime).toISOString() : undefined,
    resolutionDate: typeof raw.resolutionTime === 'number' ? new Date(raw.resolutionTime).toISOString() : undefined,
    resolutionSource: asString(raw.resolution) ?? asString(raw.description),
    sourceUrl: sourceUrl('manifold', asString(raw.url), id),
    externalMarketId: id,
  });
}

export function attachLiveSignal(market: Omit<ArcSignalLiveMarket, 'aiConfidence' | 'signalEdge' | 'aiSuggestedSide' | 'aiSuggestedWager' | 'aiRiskLevel' | 'aiReason'>): ArcSignalLiveMarket {
  const probabilityPercent = market.marketProbability * 100;
  const activity = Math.min(20, Math.log10(Math.max((market.volume ?? 0) + (market.liquidity ?? 0), 1)) * 4);
  const closingPenalty = market.endDate && Date.parse(market.endDate) - Date.now() < 36 * 60 * 60 * 1000 ? 8 : 0;
  const missingPenalty = market.volume === undefined || market.liquidity === undefined ? 10 : 0;
  const directionalBias = keywordSignalBias(market);
  const aiProbability = clamp01(market.marketProbability + directionalBias) * 100;
  const signalEdge = Math.round(Math.abs(aiProbability - probabilityPercent) * 10) / 10;
  const riskLevel = riskForMarket(market, signalEdge, closingPenalty + missingPenalty);
  const suggestedSide: LiveMarketSide = aiProbability >= probabilityPercent ? 'YES' : 'NO';
  const confidence = Math.round(Math.min(92, Math.max(35, 50 + activity + signalEdge / 2 - closingPenalty - missingPenalty)));
  const wager = suggestedWager(DEFAULT_DEMO_BALANCE, riskLevel, Math.max(signalEdge, 4));
  return {
    ...market,
    aiConfidence: confidence,
    signalEdge,
    aiSuggestedSide: suggestedSide,
    aiSuggestedWager: wager,
    aiRiskLevel: riskLevel,
    aiReason: reasonForMarket(market, suggestedSide, signalEdge, riskLevel),
  };
}

function keywordSignalBias(market: Pick<ArcSignalLiveMarket, 'question' | 'description' | 'category'>) {
  const text = normalizeText(`${market.question} ${market.description ?? ''}`);
  let bias = 0;
  if (/record|all time high|above|win|pass|approve|launch/.test(text)) bias += 0.04;
  if (/delay|ban|recession|shutdown|lawsuit|war|miss|below|fail/.test(text)) bias -= 0.04;
  if (market.category === 'technology' && /ai|nvidia|chip|github/.test(text)) bias += 0.03;
  if (market.category === 'economics' && /recession|unemployment|inflation/.test(text)) bias -= 0.02;
  return Math.max(-0.18, Math.min(0.18, bias));
}

function riskForMarket(market: Pick<ArcSignalLiveMarket, 'liquidity' | 'endDate'>, signalEdge: number, penalties: number): LiveMarketRisk {
  const closesSoon = market.endDate ? Date.parse(market.endDate) - Date.now() < 36 * 60 * 60 * 1000 : false;
  if ((market.liquidity ?? 0) < 2_500 || closesSoon || penalties >= 10) return 'HIGH';
  if (signalEdge >= 15 && (market.liquidity ?? 0) >= 10_000) return 'LOW';
  return 'MEDIUM';
}

function suggestedWager(balance: number, risk: LiveMarketRisk, signalEdge: number) {
  const cap = risk === 'LOW' ? 0.05 : risk === 'MEDIUM' ? 0.025 : 0.01;
  const scaled = balance * cap * Math.min(1, signalEdge / 20);
  return Math.round(scaled * 100) / 100;
}

function reasonForMarket(market: Pick<ArcSignalLiveMarket, 'source' | 'volume' | 'liquidity' | 'resolutionSource'>, side: LiveMarketSide, edge: number, risk: LiveMarketRisk) {
  const productSide = side === 'YES' ? 'FOLLOW' : 'FADE';
  const convictionNote = edge < 8 ? ' Confidence is shown because the edge is narrow.' : '';
  const liquidityNote = (market.liquidity ?? 0) < 2_500 ? ' Thin liquidity raises execution risk.' : '';
  const resolutionNote = market.resolutionSource ? ' Resolution source is available from the original market.' : ' Resolution source was not published by the source API.';
  return `${productSide} has a ${edge.toFixed(1)} point simulated signal edge on ${market.source}. Risk is ${risk.toLowerCase()}.${liquidityNote}${convictionNote} ${resolutionNote}`;
}

function dedupeMarkets(markets: ArcSignalLiveMarket[]) {
  const seen = new Set<string>();
  const result: ArcSignalLiveMarket[] = [];
  for (const market of markets) {
    const key = normalizeText(market.question).replace(/\b(will|the|a|an|by|on|in|at|to)\b/g, '').replace(/\s+/g, ' ').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(market);
  }
  return result;
}

function sortMarkets(markets: ArcSignalLiveMarket[]) {
  return [...markets].sort((a, b) => {
    const scoreA = (a.volume ?? 0) * 1.5 + (a.liquidity ?? 0) + (a.signalEdge ?? 0) * 1_000;
    const scoreB = (b.volume ?? 0) * 1.5 + (b.liquidity ?? 0) + (b.signalEdge ?? 0) * 1_000;
    return scoreB - scoreA;
  });
}

async function fetchJson<T>(url: string, revalidate = 120): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json', 'user-agent': 'ArcSignal live-market-intelligence/1.0' },
      next: { revalidate },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return await response.json() as T;
  } finally {
    clearTimeout(timer);
  }
}

async function readSource<T>(source: LiveMarketSource, fetcher: () => Promise<T[]>): Promise<{ markets: T[]; status: LiveMarketSourceStatus }> {
  try {
    const markets = await fetcher();
    return { markets, status: { source: source as Exclude<LiveMarketSource, 'internal'>, ok: true, count: markets.length } };
  } catch (error) {
    return { markets: [], status: { source: source as Exclude<LiveMarketSource, 'internal'>, ok: false, count: 0, error: error instanceof Error ? error.message : String(error) } };
  }
}

async function fetchPolymarket() {
  const raw = await fetchJson<PolymarketMarket[]>(POLYMARKET_MARKETS_URL);
  return raw.map(normalizePolymarketMarket).filter((market): market is ArcSignalLiveMarket => market !== null);
}

async function fetchKalshi() {
  const raw = await fetchJson<{ markets?: KalshiMarket[] }>(KALSHI_MARKETS_URL);
  return (raw.markets ?? []).map(normalizeKalshiMarket).filter((market): market is ArcSignalLiveMarket => market !== null);
}

async function fetchManifold() {
  const raw = await fetchJson<ManifoldMarket[]>(MANIFOLD_MARKETS_URL);
  return raw.map(normalizeManifoldMarket).filter((market): market is ArcSignalLiveMarket => market !== null);
}

export async function getLiveMarketContext(market: Pick<ArcSignalLiveMarket, 'category' | 'question'>): Promise<LiveMarketContextSource[]> {
  const query = encodeURIComponent(market.question.slice(0, 90));
  const providers: Array<Promise<LiveMarketContextSource>> = [];

  if (market.category === 'politics') {
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=ArtList&format=json&maxrecords=3&sort=HybridRel`;
    providers.push(fetchJson<Record<string, unknown>>(url, 300)
      .then(() => ({ provider: 'gdelt' as const, label: 'GDELT news context', url, status: 'available' as const, summary: 'Recent global news coverage is available for this query.' }))
      .catch((error) => ({ provider: 'gdelt' as const, label: 'GDELT news context', url, status: 'unavailable' as const, summary: error instanceof Error ? error.message : String(error) })));
  }

  if (market.category === 'economics') {
    const fredKey = process.env.FRED_API_KEY;
    const series = /unemployment|jobs/i.test(market.question) ? 'UNRATE' : /gdp/i.test(market.question) ? 'GDP' : 'CPIAUCSL';
    const url = fredKey
      ? `https://api.stlouisfed.org/fred/series/observations?series_id=${series}&api_key=${fredKey}&file_type=json&sort_order=desc&limit=1`
      : 'https://fred.stlouisfed.org/';
    providers.push(fredKey
      ? fetchJson<Record<string, unknown>>(url, 900)
        .then(() => ({ provider: 'fred' as const, label: `FRED ${series}`, url: 'https://fred.stlouisfed.org/', status: 'available' as const, summary: 'Latest macro indicator snapshot available.' }))
        .catch((error) => ({ provider: 'fred' as const, label: `FRED ${series}`, url: 'https://fred.stlouisfed.org/', status: 'unavailable' as const, summary: error instanceof Error ? error.message : String(error) }))
      : Promise.resolve({ provider: 'fred' as const, label: `FRED ${series}`, url, status: 'skipped' as const, summary: 'Set FRED_API_KEY to attach live FRED indicator observations.' }));
  }

  if (market.category === 'crypto' || /bitcoin|ethereum|crypto/i.test(market.question)) {
    const url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true';
    providers.push(fetchJson<Record<string, unknown>>(url, 120)
      .then(() => ({ provider: 'coingecko' as const, label: 'CoinGecko market data', url: 'https://www.coingecko.com/', status: 'available' as const, summary: 'Crypto price context available.' }))
      .catch((error) => ({ provider: 'coingecko' as const, label: 'CoinGecko market data', url: 'https://www.coingecko.com/', status: 'unavailable' as const, summary: error instanceof Error ? error.message : String(error) })));
  }

  if (market.category === 'technology') {
    const url = `https://api.github.com/search/repositories?q=${query}&sort=stars&order=desc&per_page=3`;
    providers.push(fetchJson<Record<string, unknown>>(url, 900)
      .then(() => ({ provider: 'github' as const, label: 'GitHub adoption signal', url: 'https://github.com/search', status: 'available' as const, summary: 'Repository adoption context available.' }))
      .catch((error) => ({ provider: 'github' as const, label: 'GitHub adoption signal', url: 'https://github.com/search', status: 'unavailable' as const, summary: error instanceof Error ? error.message : String(error) })));
  }

  return Promise.all(providers);
}

export async function getLiveMarketIntelligence(): Promise<LiveMarketAggregatorResult> {
  if (aggregateCache && aggregateCache.expiresAt > Date.now()) return aggregateCache.result;

  const [polymarket, kalshi, manifold] = await Promise.all([
    readSource('polymarket', fetchPolymarket),
    readSource('kalshi', fetchKalshi),
    readSource('manifold', fetchManifold),
  ]);

  const combined = sortMarkets(dedupeMarkets([
    ...polymarket.markets,
    ...kalshi.markets,
    ...manifold.markets,
  ])).slice(0, 90);

  const contextTargets = combined.slice(0, 12);
  const contexts = await Promise.all(contextTargets.map((market) => getLiveMarketContext(market).catch(() => [])));
  const contextById = new Map(contextTargets.map((market, index) => [market.id, contexts[index]]));

  let settlements = new Map<string, ExternalSettlementRecord>();
  try {
    settlements = await getExternalSettlementsByLiveIds(combined.map((market) => market.id));
  } catch (error) {
    console.warn('External settlement status unavailable:', error);
  }

  const result: LiveMarketAggregatorResult = {
    markets: combined.map((market) => {
      const settlement = settlements.get(market.id);
      return {
        ...market,
        contextSources: contextById.get(market.id) ?? [],
        arcSettlement: settlement ? {
          marketId: settlement.arcMarketId,
          marketAddress: settlement.arcMarketAddress,
          ammAddress: settlement.ammAddress,
          status: settlement.status,
          sourceOutcome: settlement.sourceOutcome,
          sourceOutcomeObservedAt: settlement.sourceOutcomeObservedAt,
          createTxHash: settlement.createTxHash,
          errorMessage: settlement.errorMessage,
        } : undefined,
      };
    }),
    statuses: [polymarket.status, kalshi.status, manifold.status],
    generatedAt: new Date().toISOString(),
    disclaimer: 'Live prediction market intelligence aggregated from external markets.',
  };
  aggregateCache = { expiresAt: Date.now() + CACHE_MS, result };
  return result;
}

export function filterLiveMarkets(markets: ArcSignalLiveMarket[], category: LiveMarketCategory | 'all') {
  return category === 'all' ? markets : markets.filter((market) => market.category === category);
}

export const LIVE_MARKET_CATEGORIES = ['crypto', 'politics', 'technology', 'economics'] as const;

