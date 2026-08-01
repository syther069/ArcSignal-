import { NextResponse } from 'next/server';
import { getMarketsFromChain, serializeMarket, type SerializableMarket } from '@/lib/markets';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 160), 1), 300);
  const offset = Math.max(Number(url.searchParams.get('offset') ?? 0), 0);

  try {
    const markets = (await getMarketsFromChain(false, { limit, offset })).map(serializeMarket);
    return NextResponse.json({ markets });
  } catch (error) {
    console.error('[/api/markets]', error);
    // Return empty array instead of error so UI shows empty state
    return NextResponse.json({ markets: [] });
  }
}
