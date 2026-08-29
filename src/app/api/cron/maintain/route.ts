import { NextResponse } from 'next/server';
import { authorizeCronRequest } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const authorization = authorizeCronRequest(req);
  if (!authorization.ok) return authorization.response;

  try {
    const baseUrl = new URL(req.url).origin;

    const resolveRes = await fetch(`${baseUrl}/api/cron/resolve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authorization.secret}` },
    });
    const resolveText = await resolveRes.text();
    let resolveData: unknown = null;
    try {
      resolveData = resolveText ? JSON.parse(resolveText) : null;
    } catch {
      resolveData = { raw: resolveText.slice(0, 500) };
    }

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
