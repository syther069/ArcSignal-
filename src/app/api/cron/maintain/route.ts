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

    const v2IndexRes = await fetch(`${baseUrl}/api/cron/index-v2`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authorization.secret}` },
    });
    const v2IndexText = await v2IndexRes.text();
    let v2IndexData: unknown = null;
    try {
      v2IndexData = v2IndexText ? JSON.parse(v2IndexText) : null;
    } catch {
      v2IndexData = { raw: v2IndexText.slice(0, 500) };
    }
    if (!v2IndexRes.ok) {
      return NextResponse.json({
        error: 'V2 indexer failed',
        status: v2IndexRes.status,
        resolved: resolveData,
        v2Indexer: v2IndexData,
      }, { status: v2IndexRes.status });
    }

    const v2Res = await fetch(`${baseUrl}/api/cron/maintain-v2`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authorization.secret}` },
    });
    const v2Text = await v2Res.text();
    let v2Data: unknown = null;
    try {
      v2Data = v2Text ? JSON.parse(v2Text) : null;
    } catch {
      v2Data = { raw: v2Text.slice(0, 500) };
    }
    if (!v2Res.ok) {
      return NextResponse.json({
        error: 'V2 maintenance failed',
        status: v2Res.status,
        resolved: resolveData,
        v2: v2Data,
      }, { status: v2Res.status });
    }

    return NextResponse.json({
      maintenance_complete: true,
      resolved: resolveData,
      v2Indexer: v2IndexData,
      v2: v2Data,
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
