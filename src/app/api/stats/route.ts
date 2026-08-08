import { NextResponse } from 'next/server';
import { getMarketsFromChain } from '@/lib/markets';
import { formatUnits } from 'viem';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const markets = await getMarketsFromChain();
    
    let totalVolumeUsdc = 0;
    let activeMarkets = 0;
    
    markets.forEach(market => {
      const followVol = Number(formatUnits(market.followPool, 6));
      const fadeVol = Number(formatUnits(market.fadePool, 6));
      
      totalVolumeUsdc += followVol + fadeVol;
      
      if (!market.resolved) {
        activeMarkets++;
      }
    });

    return NextResponse.json({
      totalVolume: totalVolumeUsdc,
      activeMarkets: activeMarkets,
      totalMarkets: markets.length,
      accuracy: computeAccuracy(markets),
    });
  } catch (error) {
    console.error('Stats API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

function computeAccuracy(markets: any[]) {
  const resolved = markets.filter(m => m.resolved && (m.outcome === 'FOLLOW' || m.outcome === 'FADE'));
  if (resolved.length === 0) return null;

  const correct = resolved.filter(m => m.outcome === 'FOLLOW').length;
  
  const realAccuracy = (correct / resolved.length) * 100;
  return Math.round(realAccuracy * 10) / 10;
}
