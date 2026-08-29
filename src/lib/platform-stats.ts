import { unstable_cache } from 'next/cache';
import { formatUnits } from 'viem';
import { getMarketSnapshot, type MarketSource } from './market-source';

export interface PlatformStats {
  totalVolume: number;
  activeMarkets: number;
  totalMarkets: number;
  accuracy: number | null;
  source: MarketSource;
  complete: boolean;
}

export async function loadPlatformStats(): Promise<PlatformStats> {
  const snapshot = await getMarketSnapshot(160, 0);
  const { markets } = snapshot;

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
    source: snapshot.source,
    complete: snapshot.complete,
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
