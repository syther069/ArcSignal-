import { createHash } from 'node:crypto';
import { getSql } from '@/lib/db';
import type { AskContext } from '@/lib/ask-grok-shared';

const PER_IP_PER_HOUR = 10;

function dailyLimit(): number {
  const n = Number(process.env.XAI_ASK_DAILY_LIMIT ?? 300);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 300;
}

/** Hash the IP so raw addresses are never stored. */
export function ipBucket(ip: string): string {
  return `ip:${createHash('sha256').update(`ask-grok:${ip}`).digest('hex').slice(0, 32)}`;
}

export function clientIp(request: Request): string {
  return request.headers.get('x-real-ip')
    ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? 'unknown';
}

/**
 * Counts one question against the per-IP hourly and the global daily limit.
 * Returns a reason when over a limit (nothing else is counted in that case).
 */
export async function consumeAskQuota(ip: string): Promise<string | null> {
  const sql = getSql();
  const [hour] = await sql`
    insert into ask_grok_usage (bucket, window_start, count) values (${ipBucket(ip)}, date_trunc('hour', now()), 1)
    on conflict (bucket, window_start) do update set count = ask_grok_usage.count + 1
    returning count`;
  if (Number(hour.count) > PER_IP_PER_HOUR) return `You can ask ${PER_IP_PER_HOUR} questions per hour. Please try again later.`;
  const [day] = await sql`
    insert into ask_grok_usage (bucket, window_start, count) values ('global', date_trunc('day', now()), 1)
    on conflict (bucket, window_start) do update set count = ask_grok_usage.count + 1
    returning count`;
  if (Number(day.count) > dailyLimit()) return 'Ask Grok has reached today\'s limit. Please try again tomorrow.';
  // Housekeeping: keep only recent windows.
  await sql`delete from ask_grok_usage where window_start < now() - interval '3 days'`.catch(() => undefined);
  return null;
}

export async function loadAskContext(marketId: string): Promise<AskContext | null> {
  const rows = await getSql()`select question, category, resolution_time, analysis_json from markets_index where market_id = ${marketId}`;
  const r = rows[0];
  if (!r) return null;
  const analysis = (r.analysis_json ?? {}) as Record<string, unknown>;
  const rules = typeof analysis.resolutionCriteria === 'string' ? analysis.resolutionCriteria : null;
  const [median] = await getSql()`
    select percentile_cont(0.5) within group (order by (analysis->>'probability')::double precision) as m
    from ai_signals where market_id = ${marketId} and agent_id not like 'baseline-%'`;
  return {
    question: String(r.question), category: String(r.category), closesAt: Number(r.resolution_time), rules,
    aiMedian: median?.m === null || median?.m === undefined ? null : Number(median.m),
  };
}
