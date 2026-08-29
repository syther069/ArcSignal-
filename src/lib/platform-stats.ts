import { unstable_cache } from 'next/cache';
import { formatUnits } from 'viem';
import { getIndexedMarkets } from './indexed-markets';
import type { Market } from './types';

export interface PlatformStats {
  totalVolume: number;
  activeMarkets: number;
  totalMarkets: number;
  accuracy: number | null;
}

async function loadPlatformStats(): Promise<PlatformStats> {
  let markets: Market[];
  try {
    markets = await getIndexedMarkets(160, 0);
  } catch {
    markets = [];
  }

  let totalVolumeUsdc = 0;
  let activeMarkets = 0;
  let resolvedMarkets = 0;
  let correctMarkets = 0;
  for (const market of markets) {
    totalVolumeUsdc += Number(formatUnits(market.followPool, 6));
    totalVolumeUsdc += Number(formatUnits(market.fadePool, 6));
    if (!market.resolved) activeMarkets++;
    if (market.resolved && (market.outcome === 'FOLLOW' || market.outcome === 'FADE')) {
      resolvedMarkets++;
      if (market.outcome === 'FOLLOW') correctMarkets++;
    }
  }

  return {
    totalVolume: Math.round(totalVolumeUsdc * 100) / 100,
    activeMarkets,
    totalMarkets: markets.length,
    accuracy: resolvedMarkets > 0
      ? Math.round((correctMarkets / resolvedMarkets) * 1_000) / 10
      : null,
  };
}

export const getPlatformStats = unstable_cache(
  loadPlatformStats,
  ['platform-stats-v2-index-only'],
  { revalidate: 15 },
);
