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

function assertCryptoData(value: unknown): CryptoData[] {
  if (!Array.isArray(value)) {
    throw new Error('Invalid CoinGecko response format');
  }

  return value.map((item) => {
    const data = item as Partial<CryptoData>;
    if (
      typeof data.id !== 'string' ||
      typeof data.symbol !== 'string' ||
      typeof data.current_price !== 'number' ||
      typeof data.price_change_percentage_24h !== 'number' ||
      typeof data.market_cap !== 'number' ||
      typeof data.market_cap_rank !== 'number' ||
      typeof data.total_volume !== 'number' ||
      typeof data.high_24h !== 'number' ||
      typeof data.low_24h !== 'number'
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
    };
  });
}

export async function fetchCryptoMarkets(): Promise<CryptoData[]> {
  const now = Date.now();
  if (cachedCryptoData && now - cachedAt < CACHE_TTL_MS) {
    return cachedCryptoData;
  }

  const url = `${BASE_URL}/coins/markets?vs_currency=usd&ids=${MARKET_IDS}`;
  const response = await fetch(url, {
    headers: getHeaders(),
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`CoinGecko fetch failed with status ${response.status}`);
  }

  const data = assertCryptoData(await response.json());
  cachedCryptoData = data;
  cachedAt = now;
  return data;
}

export async function fetchTickerPrices(): Promise<TickerPrice[]> {
  const markets = await fetchCryptoMarkets();
  return markets.map((market) => ({
    symbol: market.symbol.toUpperCase(),
    price: market.current_price,
    change: market.price_change_percentage_24h,
  }));
}
