import { NextResponse } from 'next/server';
import { getMarketsFromChain, serializeMarket, type SerializableMarket } from '@/lib/markets';

export const dynamic = 'force-dynamic';

let marketsCache: SerializableMarket[] = [];
let lastRefreshed = 0;

export async function GET(req: Request) {
  const now = Date.now();
  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 160), 1), 300);
  const offset = Math.max(Number(url.searchParams.get('offset') ?? 0), 0);

  if (offset === 0 && limit === 160 && marketsCache.length > 0 && now - lastRefreshed < 30_000) {
    return NextResponse.json({ markets: marketsCache });
  }

  try {
    const markets = (await getMarketsFromChain(false, { limit, offset })).map(serializeMarket);
    if (offset === 0 && limit === 160) {
      marketsCache = markets;
      lastRefreshed = now;
    }
    return NextResponse.json({ markets });
  } catch (error) {
    console.error('[/api/markets]', error);
    // Return empty array instead of error so UI shows empty state
    return NextResponse.json({ markets: [] });
  }
}
