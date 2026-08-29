import MarketsClient from './MarketsClient';
import DataUnavailable from '@/components/DataUnavailable';
import { serializeMarket } from '@/lib/markets';
import { getIndexedMarkets } from '@/lib/indexed-markets';

export const dynamic = 'force-dynamic';

export default async function MarketsPage() {
  const markets = await getIndexedMarkets(160, 0)
    .then((result) => result.map(serializeMarket))
    .catch((error) => {
      console.error('Markets index unavailable:', error);
      return null;
    });

  if (!markets) {
    return <DataUnavailable />;
  }

  return <MarketsClient markets={markets} />;
}
