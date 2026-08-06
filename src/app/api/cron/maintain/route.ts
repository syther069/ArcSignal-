import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');

    const resolveRes = await fetch(`${baseUrl}/api/cron/resolve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` }
    });
    const resolveText = await resolveRes.text();
    const resolveData = resolveText ? JSON.parse(resolveText) : null;

    if (!resolveRes.ok) {
      return NextResponse.json({
        error: 'Resolve cron failed',
        status: resolveRes.status,
        resolved: resolveData,
      }, { status: resolveRes.status });
    }

    return NextResponse.json({
      maintenance_complete: true,
      resolved: resolveData,
      generated: {
        skipped: true,
        reason: 'Automatic maintenance resolves due markets only. New market batches are created only by explicit generation.'
      }
    });
  } catch (error) {
    console.error('Cron maintenance failed:', error);
    return NextResponse.json({
      error: 'Cron maintenance failed',
      message: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
