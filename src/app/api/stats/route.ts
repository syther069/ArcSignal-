import { NextResponse } from 'next/server';
import { getMarketsFromChain } from '@/lib/markets';
import { getIndexedMarkets } from '@/lib/indexed-markets';
import { formatUnits } from 'viem';
import type { Market } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let markets: Market[] = [];
    try {
      markets = await getIndexedMarkets(160, 0);
    } catch {
      markets = [];
    }

    if (markets.length === 0) {
      markets = await getMarketsFromChain(false, { limit: 24, offset: 0 });
    }

    let totalVolumeUsdc = 0;
    let activeMarkets = 0;

    for (let i = 0; i < markets.length; i++) {
      const market = markets[i];
      const followVol = Number(formatUnits(market.followPool, 6));
      const fadeVol = Number(formatUnits(market.fadePool, 6));

      totalVolumeUsdc += followVol + fadeVol;

      if (!market.resolved) {
        activeMarkets++;
      }
    }

    const payload = {
      totalVolume: Math.round(totalVolumeUsdc * 100) / 100,
      activeMarkets,
      totalMarkets: markets.length,
      accuracy: computeAccuracy(markets),
    };

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=45',
      },
    });
  } catch (error) {
    console.error('Stats API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

function computeAccuracy(markets: Market[]) {
  const resolved = markets.filter((m) => m.resolved && (m.outcome === 'FOLLOW' || m.outcome === 'FADE'));
  if (resolved.length === 0) return null;

  const correct = resolved.filter((m) => m.outcome === 'FOLLOW').length;
  const realAccuracy = (correct / resolved.length) * 100;
  return Math.round(realAccuracy * 10) / 10;
}

