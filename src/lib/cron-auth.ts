import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

type CronAuthorization =
  | { ok: true; secret: string }
  | { ok: false; response: NextResponse };

export function authorizeCronRequest(request: Request): CronAuthorization {
  const secret = process.env.CRON_SECRET?.trim();

  if (!secret) {
    console.error('CRON_SECRET is not configured; rejecting cron request.');
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Cron service is not configured' },
        { status: 503 },
      ),
    };
  }

  const supplied = Buffer.from(request.headers.get('authorization') ?? '', 'utf8');
  const expected = Buffer.from(`Bearer ${secret}`, 'utf8');
  const authorized =
    supplied.length === expected.length &&
    timingSafeEqual(supplied, expected);

  if (!authorized) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  return { ok: true, secret };
}