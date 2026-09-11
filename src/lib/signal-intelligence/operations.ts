import { randomUUID } from 'node:crypto';
import { getSql } from '@/lib/db';
import { generateMarketSignals } from './generation';

const MAX_ERROR_LENGTH = 240;
function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Unknown provider failure';
  return message.replace(/(bearer|key|token|secret)\s+[^\s]+/gi, '$1 [redacted]').slice(0, MAX_ERROR_LENGTH);
}

export async function generateScheduledSignals(options: { maxMarkets?: number; deadline?: number } = {}) {
  const maxMarkets = Math.max(1, Math.min(3, Math.floor(options.maxMarkets ?? 1)));
  const deadline = options.deadline ?? Date.now() + 240_000;
  const leaseToken = randomUUID();
  const claimed = await getSql()`
    update signal_generation_jobs j set status = 'running', attempt_count = attempt_count + 1,
      last_attempt_at = now(), lease_token = ${leaseToken}, lease_expires_at = now() + interval '4 minutes', updated_at = now()
    where market_id in (
      select market_id from signal_generation_jobs
      where next_attempt_at <= now()
        and (status in ('scheduled', 'retrying') or (status = 'running' and lease_expires_at < now()))
      order by next_attempt_at, created_at
      for update skip locked limit ${maxMarkets}
    )
    returning market_id, attempt_count
  `;
  const completed: string[] = [];
  const retrying: { marketId: string; error: string }[] = [];
  const skipped: string[] = [];
  for (const job of claimed) {
    const marketId = String(job.market_id);
    if (Date.now() + 10_000 >= deadline) break;
    try {
      const results = await generateMarketSignals(marketId);
      if (results.every(result => result.status === 'recorded' || result.status === 'already recorded')) {
        await getSql()`update signal_generation_jobs set status = 'complete', completed_at = now(), last_error = null,
          lease_token = null, lease_expires_at = null, updated_at = now()
          where market_id = ${marketId} and lease_token = ${leaseToken}`;
        completed.push(marketId);
      }
    } catch (error) {
      const message = safeError(error);
      const rows = await getSql()`update signal_generation_jobs j set
        status = case when m.resolved or m.status <> 'OPEN' or m.resolution_time <= extract(epoch from now()) then 'skipped' else 'retrying' end,
        last_error = ${message}, next_attempt_at = now() + make_interval(secs => least(3600, 30 * power(2, least(j.attempt_count, 7)))::int),
        lease_token = null, lease_expires_at = null, updated_at = now()
        from markets_index m where j.market_id = ${marketId} and j.lease_token = ${leaseToken} and m.market_id = j.market_id
        returning j.status`;
      if (rows[0]?.status === 'skipped') skipped.push(marketId);
      else retrying.push({ marketId, error: message });
    }
  }
  return { claimed: claimed.length, completed, retrying, skipped, maxMarkets };
}
