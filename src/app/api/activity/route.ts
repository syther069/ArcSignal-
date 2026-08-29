import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

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

    const activities: ActivityItem[] = rows.map((row, idx) => ({
      id: `${row.market_id}-${row.wallet_address}-${row.side}-${idx}`,
      marketId: String(row.market_id),
      walletAddress: String(row.wallet_address),
      side: Number(row.side),
      amountUsdc: Number(BigInt(String(row.amount))) / 1e6,
      question: String(row.question),
      category: String(row.category),
    }));

    return NextResponse.json(
      { activities, source: 'neon' },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=40',
        },
      }
    );
  } catch (error) {
    console.error('Activity index unavailable:', error);
    return NextResponse.json(
      { activities: [], source: 'unavailable', error: 'Activity is temporarily unavailable' },
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
