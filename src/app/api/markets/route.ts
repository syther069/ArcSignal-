import { NextResponse } from 'next/server';
import { serializeMarket } from '@/lib/markets';
import { getMarketSnapshot } from '@/lib/market-source';

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
    const snapshot = await getMarketSnapshot(limit, offset);
    const markets = snapshot.markets.map(serializeMarket);

    return NextResponse.json(
      {
        markets,
        source: snapshot.source,
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

