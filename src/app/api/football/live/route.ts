import { NextResponse } from 'next/server';
import { fetchLiveMatches } from '@/lib/apifootball';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const liveMatches = await fetchLiveMatches();
    return NextResponse.json({ matches: liveMatches });
  } catch (err) {
    return NextResponse.json({ matches: [] });
  }
}
