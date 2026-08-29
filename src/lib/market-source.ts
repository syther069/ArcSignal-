import type { Market } from './types';
import { getIndexedMarkets } from './indexed-markets';
import { getMarketsFromChain } from './markets';

export type MarketSource = 'neon' | 'arc-chain';

export interface MarketSnapshot {
  markets: Market[];
  source: MarketSource;
  complete: boolean;
  fetchedAt: string;
}

const CHAIN_SNAPSHOT_LIMIT = 60;
const CHAIN_SNAPSHOT_TTL_MS = 60_000;
const CHAIN_SNAPSHOT_TIMEOUT_MS = 12_000;

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
  try {
    const markets = await getIndexedMarkets(limit, offset);
    if (markets.length > 0) {
      return {
        markets,
        source: 'neon',
        complete: markets.length < limit,
        fetchedAt: new Date().toISOString(),
      };
    }
  } catch (error) {
    console.warn('Markets index unavailable; using ARC chain snapshot:', error);
  }

  const chainSnapshot = await getChainMarketSnapshot();
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