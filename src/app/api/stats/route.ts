import { NextResponse } from 'next/server';
import { getPlatformStats } from '@/lib/platform-stats';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const payload = await getPlatformStats();

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=45',
      },
    });
  } catch (error) {
    console.error('Stats API Error:', error);
    return NextResponse.json(
      {
        error: 'Stats are temporarily unavailable',
        source: 'unavailable',
      },
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

