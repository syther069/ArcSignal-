import { NextResponse } from 'next/server';
import { getMarketsFromChain, serializeMarket, type SerializableMarket } from '@/lib/markets';

export const dynamic = 'force-dynamic';

let marketsCache: SerializableMarket[] = [];
let lastRefreshed = 0;

export async function GET() {
  const now = Date.now();
  if (marketsCache.length > 0 && now - lastRefreshed < 30_000) {
    return NextResponse.json({ markets: marketsCache });
  }

  try {
    const markets = (await getMarketsFromChain()).map(serializeMarket);
    marketsCache = markets;
    lastRefreshed = now;
    return NextResponse.json({ markets });
  } catch (error) {
    console.error('[/api/markets]', error);
    return NextResponse.json({ error: 'Failed to fetch markets' }, { status: 500 });
  }
}
