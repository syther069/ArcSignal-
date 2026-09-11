import MarketsClient from './MarketsClient';
import DataUnavailable from '@/components/DataUnavailable';
import { serializeMarket } from '@/lib/markets';
import { getMarketSnapshot } from '@/lib/market-source';
import { getSignalCoverage } from '@/lib/signal-intelligence/repository';
import { getV2Markets, v2Availability } from '@/lib/v2-repository';
import { toSerializableV2Markets } from '@/lib/v2-market-adapter';

export const dynamic = 'force-dynamic';

export default async function MarketsPage() {
  const [v1Markets, v2Markets, coverage] = await Promise.all([getMarketSnapshot(160, 0)
    .then((snapshot) => snapshot.markets.map(serializeMarket))
    .catch((error) => {
      console.error('Markets index unavailable:', error);
      return null;
    }),
    v2Availability().enabled
      ? getV2Markets(160, 0).then(toSerializableV2Markets).catch((error) => {
        console.warn('V2 markets unavailable; continuing with V1 markets:', error);
        return [];
      })
      : Promise.resolve([]),
    getSignalCoverage(undefined, 320).catch(() => [])]);

  if (!v1Markets && v2Markets.length === 0) {
    return <DataUnavailable />;
  }

  const markets = [...v2Markets, ...(v1Markets ?? []).map((market) => ({ ...market, protocolVersion: market.protocolVersion ?? 1 as const }))];

  return <MarketsClient markets={markets} signalCoverage={Object.fromEntries(coverage.map(record => [record.marketId, record]))} />;
}
