-- Durable, bounded Signal Intelligence generation queue.
create table if not exists signal_generation_jobs (
  market_id text primary key references markets_index(market_id) on delete cascade,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'running', 'retrying', 'complete', 'skipped')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text,
  last_attempt_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  completed_at timestamptz,
  lease_token text,
  lease_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- statement
create index if not exists signal_generation_jobs_due_idx
  on signal_generation_jobs (next_attempt_at, created_at)
  where status in ('scheduled', 'retrying', 'running');
-- statement
insert into signal_generation_jobs (market_id, status)
select market_id, 'scheduled'
from markets_index
where not resolved and status = 'OPEN' and resolution_time > extract(epoch from now())
  and upper(category) in ('CRYPTO', 'FOOTBALL')
on conflict (market_id) do nothing;
