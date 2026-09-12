import { NextRequest, NextResponse } from 'next/server';
import { filterLiveMarkets, getLiveMarketIntelligence, LIVE_MARKET_CATEGORIES } from '@/lib/markets/liveMarketAggregator';
import type { LiveMarketCategory } from '@/lib/markets/liveMarketTypes';

export const dynamic = 'force-dynamic';
export const revalidate = 120;

function parseCategory(value: string | null): LiveMarketCategory | 'all' | null {
  if (!value || value === 'all') return 'all';
  const normalized = value.toLowerCase();
  return (LIVE_MARKET_CATEGORIES as readonly string[]).includes(normalized)
    ? normalized as LiveMarketCategory
    : null;
}

export async function GET(request: NextRequest) {
  const category = parseCategory(request.nextUrl.searchParams.get('category'));
  if (!category) {
    return NextResponse.json({ error: 'Invalid category. Use politics, technology, economics, crypto, or all.' }, { status: 400 });
  }

  const result = await getLiveMarketIntelligence();
  return NextResponse.json({
    ...result,
    category,
    markets: filterLiveMarkets(result.markets, category),
  }, {
    headers: {
      'Cache-Control': 's-maxage=120, stale-while-revalidate=300',
    },
  });
}
