-- X Pulse: Grok's periodic read of what X is saying about each open market.
create table if not exists x_pulse (
  id text primary key,
  market_id text not null references markets_index(market_id) on delete cascade,
  mood text not null check (mood in ('YES', 'NO', 'SPLIT', 'QUIET')),
  lean double precision check (lean is null or (lean >= 0 and lean <= 1)),
  volume text not null check (volume in ('quiet', 'active', 'surging')),
  summary text not null,
  citations jsonb not null default '[]'::jsonb,
  model text not null,
  created_at timestamptz not null default now()
);
-- statement
create index if not exists x_pulse_market_time_idx on x_pulse (market_id, created_at desc)
