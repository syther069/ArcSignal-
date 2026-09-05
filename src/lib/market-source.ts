import type { Market } from './types';
import { getIndexedMarkets, getMarketIndexHealth } from './indexed-markets';
import { getMarketsFromChain } from './markets';

export type MarketSource = 'neon' | 'arc-chain';

export interface MarketSnapshot {
  markets: Market[];
  source: MarketSource;
  complete: boolean;
  fetchedAt: string;
}

const CHAIN_SNAPSHOT_LIMIT = 160;
const CHAIN_SNAPSHOT_TTL_MS = 60_000;
const CHAIN_SNAPSHOT_TIMEOUT_MS = 12_000;
const INDEX_FRESHNESS_TTL_MS = 10 * 60_000;

let cachedChainSnapshot: MarketSnapshot | null = null;
let chainSnapshotInFlight: Promise<MarketSnapshot> | null = null;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout>;
  const timer = new Promise<never>((_, reject) => {
    timeout = setTimeout(
      () => reject(new Error('ARC market snapshot timed out')),
      timeoutMs,
    );
  });

  return Promise.race([promise, timer]).finally(() => clearTimeout(timeout!));
}

async function loadChainSnapshot(): Promise<MarketSnapshot> {
  const markets = await getMarketsFromChain(false, {
    limit: CHAIN_SNAPSHOT_LIMIT,
    offset: 0,
  });
  if (markets.length === 0) {
    throw new Error('ARC market snapshot returned no markets');
  }

  const snapshot = {
    markets,
    source: 'arc-chain' as const,
    complete: markets.length < CHAIN_SNAPSHOT_LIMIT,
    fetchedAt: new Date().toISOString(),
  };
  cachedChainSnapshot = snapshot;
  return snapshot;
}

export async function getChainMarketSnapshot(): Promise<MarketSnapshot> {
  if (
    cachedChainSnapshot &&
    Date.now() - Date.parse(cachedChainSnapshot.fetchedAt) < CHAIN_SNAPSHOT_TTL_MS
  ) {
    return cachedChainSnapshot;
  }

  if (!chainSnapshotInFlight) {
    const request = loadChainSnapshot();
    chainSnapshotInFlight = request;
    request.then(
      () => {
        if (chainSnapshotInFlight === request) chainSnapshotInFlight = null;
      },
      () => {
        if (chainSnapshotInFlight === request) chainSnapshotInFlight = null;
      },
    );
  }

  return withTimeout(chainSnapshotInFlight, CHAIN_SNAPSHOT_TIMEOUT_MS);
}

export async function getMarketSnapshot(
  limit: number,
  offset: number,
): Promise<MarketSnapshot> {
  const requestedCount = Math.min(offset + limit, 10_300);
  const [indexedResult, healthResult] = await Promise.allSettled([
    getIndexedMarkets(requestedCount, 0),
    getMarketIndexHealth(),
  ]);

  const indexedMarkets = indexedResult.status === 'fulfilled' ? indexedResult.value : [];
  const indexHealth = healthResult.status === 'fulfilled' ? healthResult.value : null;
  const indexIsFresh = indexHealth !== null
    && Date.now() - indexHealth.updatedAtMs <= INDEX_FRESHNESS_TTL_MS;

  if (indexedResult.status === 'rejected') {
    console.warn('Markets index unavailable; using ARC chain snapshot:', indexedResult.reason);
  }
  if (healthResult.status === 'rejected') {
    console.warn('Market index health unavailable; verifying against ARC chain:', healthResult.reason);
  }

  if (indexedMarkets.length > 0 && indexIsFresh) {
    return {
      markets: indexedMarkets.slice(offset, offset + limit),
      source: 'neon',
      complete: indexedMarkets.length < requestedCount,
      fetchedAt: new Date().toISOString(),
    };
  }

  let chainSnapshot: MarketSnapshot | null = null;
  try {
    chainSnapshot = await getChainMarketSnapshot();
  } catch (error) {
    console.warn('ARC chain snapshot unavailable; using markets index:', error);
  }

  if (indexedMarkets.length > 0 && chainSnapshot) {
    // Chain values override indexed rows for the newest bounded window. This
    // prevents a lagging index cursor from hiding newly generated markets.
    const merged = new Map(indexedMarkets.map((market) => [market.marketId, market]));
    for (const market of chainSnapshot.markets) merged.set(market.marketId, market);
    const markets = [...merged.values()]
      .sort((a, b) => b.resolutionTime - a.resolutionTime)
      .slice(offset, offset + limit);

    return {
      markets,
      source: 'neon',
      complete: indexedMarkets.length < requestedCount && chainSnapshot.complete,
      fetchedAt: new Date().toISOString(),
    };
  }

  if (indexedMarkets.length > 0) {
    return {
      markets: indexedMarkets.slice(offset, offset + limit),
      source: 'neon',
      complete: indexedMarkets.length < requestedCount,
      fetchedAt: new Date().toISOString(),
    };
  }

  if (!chainSnapshot) {
    throw indexedResult.status === 'rejected'
      ? indexedResult.reason
      : new Error('No market data source is available');
  }

  return {
    ...chainSnapshot,
    markets: chainSnapshot.markets.slice(offset, offset + limit),
    complete: chainSnapshot.complete && offset + limit >= chainSnapshot.markets.length,
  };
}

export function clearChainMarketSnapshotCache() {
  cachedChainSnapshot = null;
  chainSnapshotInFlight = null;
}
