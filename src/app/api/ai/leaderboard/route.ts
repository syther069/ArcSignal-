import { NextResponse } from 'next/server';
import { getAILeaderboard } from '@/lib/signal-intelligence/repository';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    return NextResponse.json({ leaderboard: await getAILeaderboard() }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  }
  catch { return NextResponse.json({ error: 'AI leaderboard is temporarily unavailable.' }, { status: 503 }); }
}
