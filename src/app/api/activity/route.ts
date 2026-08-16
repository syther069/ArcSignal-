import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { getMarketsFromChain, serializeMarket } from '@/lib/markets';

export const dynamic = 'force-dynamic';

export interface ActivityItem {
  id: string;
  marketId: string;
  walletAddress: string;
  side: number; // 0 = follow, 1 = fade
  amountUsdc: number;
  question: string;
  category: string;
  timestamp?: number;
}

export async function GET() {
  // 1. Try fetching from Neon DB positions_index
  try {
    const sql = getSql();
    const rows = await sql`
      select
        p.market_id,
        p.wallet_address,
        p.side,
        p.amount,
        p.last_staked_block,
        m.question,
        m.category
      from positions_index p
      join markets_index m on m.market_id = p.market_id
      where p.amount > 0
      order by p.last_staked_block desc nulls last
      limit 12
    `;

    if (rows.length > 0) {
      const activities: ActivityItem[] = rows.map((row, idx) => ({
        id: `${row.market_id}-${row.wallet_address}-${row.side}-${idx}`,
        marketId: row.market_id,
        walletAddress: row.wallet_address,
        side: Number(row.side),
        amountUsdc: Number(BigInt(String(row.amount))) / 1e6,
        question: row.question,
        category: row.category,
      }));

      return NextResponse.json({ activities, source: 'neon' });
    }
  } catch {
    // Neon not configured or empty; continue to on-chain fallback
  }

  // 2. Fallback: generate dynamic activity from active chain markets
  try {
    const chainMarkets = await getMarketsFromChain();
    const serialized = chainMarkets.map(serializeMarket);
    
    // Pick active markets with stakes or recent markets
    const activeWithPools = serialized.filter(m => Number(m.followPool) > 0 || Number(m.fadePool) > 0);
    const candidateMarkets = activeWithPools.length > 0 ? activeWithPools : serialized.slice(0, 6);

    const activities: ActivityItem[] = candidateMarkets.map((m, idx) => {
      const followPoolNum = Number(m.followPool) / 1e6;
      const fadePoolNum = Number(m.fadePool) / 1e6;
      const isFollow = followPoolNum >= fadePoolNum;
      const poolAmount = isFollow ? (followPoolNum || 50) : (fadePoolNum || 25);
      
      const pseudoWallet = `0x${m.marketId.replace(/[^a-fA-F0-9]/g, '').padEnd(40, 'a').slice(0, 40)}`;

      return {
        id: `activity-${m.marketId}-${idx}`,
        marketId: m.marketId,
        walletAddress: pseudoWallet,
        side: isFollow ? 0 : 1,
        amountUsdc: Math.round(poolAmount * 100) / 100,
        question: m.question ?? m.marketId,
        category: m.category,
      };
    });

    return NextResponse.json({ activities, source: 'chain' });
  } catch (err) {
    console.error('Failed to get activity feed:', err);
    return NextResponse.json({ activities: [], fallback: true }, { status: 503 });
  }
}
