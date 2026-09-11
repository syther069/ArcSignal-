import { NextResponse } from 'next/server';
import { serializeMarket } from '@/lib/markets';
import { getMarketSnapshot } from '@/lib/market-source';
import { getV2Markets, v2Availability } from '@/lib/v2-repository';
import { toSerializableV2Markets } from '@/lib/v2-market-adapter';

export const dynamic = 'force-dynamic';

function boundedInteger(value: string | null, fallback: number, minimum: number, maximum: number) {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, minimum), maximum);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = boundedInteger(url.searchParams.get('limit'), 160, 1, 300);
  const offset = boundedInteger(url.searchParams.get('offset'), 0, 0, 10_000);

  try {
    const [snapshot, v2Markets] = await Promise.all([
      getMarketSnapshot(limit, offset),
      v2Availability().enabled
        ? getV2Markets(limit, offset).then(toSerializableV2Markets).catch((error) => {
          console.warn('V2 markets unavailable in combined markets API:', error);
          return [];
        })
        : Promise.resolve([]),
    ]);
    const markets = [
      ...v2Markets,
      ...snapshot.markets.map((market) => ({ ...serializeMarket(market), protocolVersion: market.protocolVersion ?? 1 as const })),
    ];

    return NextResponse.json(
      {
        markets,
        source: v2Markets.length > 0 ? `${snapshot.source}+v2` : snapshot.source,
        complete: snapshot.complete,
        fetchedAt: snapshot.fetchedAt,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=50',
        },
      }
    );
  } catch (error) {
    console.error('Markets index unavailable:', error);
    return NextResponse.json(
      { error: 'Markets are temporarily unavailable', markets: [], source: 'unavailable' },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store',
          'Retry-After': '30',
        },
      },
    );
  }
}

