export interface CryptoData {
  id: string;
  symbol: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_source: 'coingecko' | 'binance';
  price_observed_at: number;
}

export interface TickerPrice {
  symbol: string;
  price: number;
  change: number;
}

const BASE_URL = 'https://api.coingecko.com/api/v3';
const CACHE_TTL_MS = 60_000;
const MARKET_IDS = 'bitcoin,ethereum,solana,sui,ripple,avalanche-2';

let cachedAt = 0;
let cachedCryptoData: CryptoData[] | null = null;

function getHeaders(): HeadersInit {
  const apiKey = process.env.COINGECKO_API_KEY;
  return apiKey ? { 'x-cg-demo-api-key': apiKey } : {};
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}

export function assertCryptoData(value: unknown): CryptoData[] {
  if (!Array.isArray(value)) {
    throw new Error('Invalid CoinGecko response format');
  }

  return value.map((item) => {
    const data = item as Partial<CryptoData>;
    if (
      typeof data.id !== 'string' ||
      data.id.trim().length === 0 ||
      typeof data.symbol !== 'string' ||
      data.symbol.trim().length === 0 ||
      !isPositiveFiniteNumber(data.current_price) ||
      !isFiniteNumber(data.price_change_percentage_24h) ||
      !isNonNegativeFiniteNumber(data.market_cap) ||
      !Number.isInteger(data.market_cap_rank) ||
      !isPositiveFiniteNumber(data.market_cap_rank) ||
      !isNonNegativeFiniteNumber(data.total_volume) ||
      !isPositiveFiniteNumber(data.high_24h) ||
      !isPositiveFiniteNumber(data.low_24h) ||
      data.high_24h < data.low_24h ||
      (data.price_source !== 'coingecko' && data.price_source !== 'binance') ||
      !Number.isInteger(data.price_observed_at) ||
      !isPositiveFiniteNumber(data.price_observed_at)
    ) {
      throw new Error('CoinGecko returned incomplete market data');
    }

    return {
      id: data.id,
      symbol: data.symbol,
      current_price: data.current_price,
      price_change_percentage_24h: data.price_change_percentage_24h,
      market_cap: data.market_cap,
      market_cap_rank: data.market_cap_rank,
      total_volume: data.total_volume,
      high_24h: data.high_24h,
      low_24h: data.low_24h,
      price_source: data.price_source,
      price_observed_at: data.price_observed_at,
    };
  });
}

async function fetchBinanceFallback(): Promise<CryptoData[]> {
  const symbols = [
    { id: 'bitcoin', symbol: 'btc', pair: 'BTCUSDT' },
    { id: 'ethereum', symbol: 'eth', pair: 'ETHUSDT' },
    { id: 'solana', symbol: 'sol', pair: 'SOLUSDT' },
    { id: 'ripple', symbol: 'xrp', pair: 'XRPUSDT' },
    { id: 'sui', symbol: 'sui', pair: 'SUIUSDT' },
    { id: 'avalanche-2', symbol: 'avax', pair: 'AVAXUSDT' },
  ];

  const pairsParam = JSON.stringify(symbols.map((s) => s.pair));
  const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(pairsParam)}`, {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`Binance fallback failed with status ${res.status}`);
  }

  const data = (await res.json()) as Array<{
    symbol: string;
    lastPrice: string;
    priceChangePercent: string;
    quoteVolume: string;
    highPrice: string;
    lowPrice: string;
    closeTime: number;
  }>;

  if (!Array.isArray(data)) {
    throw new Error('Invalid Binance ticker response');
  }

  const tickerMap = new Map(data.map((t) => [t.symbol, t]));

  return assertCryptoData(symbols.map((s, idx) => {
    const t = tickerMap.get(s.pair);
    if (!t) throw new Error(`Missing ticker data for ${s.pair}`);
    return {
      id: s.id,
      symbol: s.symbol,
      current_price: parseFloat(t.lastPrice),
      price_change_percentage_24h: parseFloat(t.priceChangePercent),
      market_cap: 0,
      market_cap_rank: idx + 1,
      total_volume: parseFloat(t.quoteVolume),
      high_24h: parseFloat(t.highPrice),
      low_24h: parseFloat(t.lowPrice),
      price_source: 'binance' as const,
      price_observed_at: Math.floor(t.closeTime / 1000),
    };
  }));
}

export async function fetchCryptoMarkets(): Promise<CryptoData[]> {
  const now = Date.now();
  if (cachedCryptoData && now - cachedAt < CACHE_TTL_MS) {
    return cachedCryptoData;
  }

  try {
    const url = `${BASE_URL}/coins/markets?vs_currency=usd&ids=${MARKET_IDS}`;
    const response = await fetch(url, {
      headers: getHeaders(),
      next: { revalidate: 60 },
    });

    if (response.ok) {
      const raw = await response.json();
      if (!Array.isArray(raw)) {
        throw new Error('Invalid CoinGecko response format');
      }
      const data = assertCryptoData(raw.map((item) => {
        const value = item as Record<string, unknown>;
        const observedAt = typeof value.last_updated === 'string'
          ? Math.floor(Date.parse(value.last_updated) / 1000)
          : Number.NaN;
        return {
          ...value,
          price_source: 'coingecko',
          price_observed_at: observedAt,
        };
      }));
      cachedCryptoData = data;
      cachedAt = now;
      return data;
    }
  } catch (cgError) {
    console.warn('CoinGecko fetch failed; attempting Binance fallback:', cgError);
  }

  // Secondary fallback provider: Binance public ticker
  const fallbackData = await fetchBinanceFallback();
  cachedCryptoData = fallbackData;
  cachedAt = now;
  return fallbackData;
}

export async function fetchTickerPrices(): Promise<TickerPrice[]> {
  const markets = await fetchCryptoMarkets();
  return markets.map((market) => ({
    symbol: market.symbol.toUpperCase(),
    price: market.current_price,
    change: market.price_change_percentage_24h,
  }));
}
