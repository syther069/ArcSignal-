import { NextResponse } from 'next/server';
import { getMarketsFromChain, serializeMarket, type SerializableMarket } from '@/lib/markets';
import { getIndexedMarkets } from '@/lib/indexed-markets';

export const dynamic = 'force-dynamic';

const CHAIN_FALLBACK_LIMIT = 24;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 160), 1), 300);
  const offset = Math.max(Number(url.searchParams.get('offset') ?? 0), 0);

  try {
    let markets;
    try {
      // The index is the fast application read model; chain reads remain the
      // authoritative fallback while the indexer catches up or is unavailable.
      const indexed = await getIndexedMarkets(limit, offset);
      markets = indexed.length > 0
        ? indexed.map(serializeMarket)
        : (await getMarketsFromChain(false, {
            limit: Math.min(limit, CHAIN_FALLBACK_LIMIT),
            offset,
          })).map(serializeMarket);
    } catch (indexError) {
      console.warn('[/api/markets] index unavailable; falling back to chain:', indexError);
      markets = (await getMarketsFromChain(false, {
        limit: Math.min(limit, CHAIN_FALLBACK_LIMIT),
        offset,
      })).map(serializeMarket);
    }
    return NextResponse.json(
      { markets },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=50',
        },
      }
    );
  } catch (error) {
    console.error('[/api/markets]', error);
    return NextResponse.json(
      { error: 'Failed to fetch markets', markets: [], fallback: true },
      { status: 503 }
    );
  }
}

