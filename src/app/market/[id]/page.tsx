import MarketDetailClient from './MarketDetailClient';
import { getSingleMarketFromChain, serializeMarket } from '@/lib/markets';
import { getIndexedMarketById } from '@/lib/indexed-markets';
import { toUiMarket } from '@/lib/ui-market';
import { notFound } from 'next/navigation';
import { getResolutionEvidence } from '@/lib/oracle-evidence';
import { getSignalCoverage, getSignals } from '@/lib/signal-intelligence/repository';
import { validMarketId } from '@/lib/v2-api';
import { getV2Market, v2Availability } from '@/lib/v2-repository';
import { toSerializableV2Markets } from '@/lib/v2-market-adapter';

export const dynamic = 'force-dynamic';

export default async function MarketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const v2Record = v2Availability().enabled && validMarketId(id)
    ? await getV2Market(id).catch((error) => {
      console.warn('V2 market index unavailable; falling back to V1 lookup:', error);
      return null;
    })
    : null;

  let rawMarket = await getIndexedMarketById(id).catch((error) => {
    console.warn('Market index unavailable; reading market from ARC chain:', error);
    return null;
  });

  if (!rawMarket) {
    rawMarket = await getSingleMarketFromChain(id);
  }

  if (!rawMarket && !v2Record) {
    notFound();
  }

  const serialized = v2Record
    ? (await toSerializableV2Markets([v2Record]))[0]
    : serializeMarket(rawMarket!);
  const market = toUiMarket(serialized);
  const [resolutionEvidence, initialSignals, signalCoverage] = await Promise.all([
    market.resolved ? getResolutionEvidence(id) : Promise.resolve(null),
    getSignals(id).catch(() => undefined),
    getSignalCoverage(id).then(rows => rows[0]).catch(() => undefined),
  ]);

  return <MarketDetailClient market={market} resolutionEvidence={resolutionEvidence} initialSignals={initialSignals} signalCoverage={signalCoverage} />;
}

