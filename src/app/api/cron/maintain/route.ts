import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Step 1: Resolve all expired markets
  const resolveRes = await fetch(`${appUrl}/api/cron/resolve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  const resolveData = await resolveRes.json();

  // Step 2: Generate fresh markets to replace resolved/expired ones
  const generateRes = await fetch(`${appUrl}/api/cron/generate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  const generateData = await generateRes.json();

  return NextResponse.json({
    resolved: resolveData,
    generated: generateData,
  });
}
