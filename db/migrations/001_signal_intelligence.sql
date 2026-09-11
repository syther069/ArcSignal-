-- Additive migration. scripts/migrate-signals.mjs validates in an isolated schema before applying.
create table if not exists ai_agents (
  id text primary key,
  profile jsonb not null,
  status text not null default 'active' check (status in ('active', 'paused', 'deprecated')),
  created_at timestamptz not null default now()
);
-- statement
create table if not exists ai_signals (
  id text primary key,
  market_id text not null references markets_index(market_id),
  agent_id text not null references ai_agents(id),
  analysis jsonb not null,
  analysis_hash text not null check (analysis_hash ~ '^[a-f0-9]{64}$'),
  generated_at timestamptz not null,
  previous_signal_id text references ai_signals(id),
  unique (market_id, agent_id)
);
-- statement
create table if not exists signal_sources (
  signal_id text not null references ai_signals(id),
  ordinal integer not null,
  name text not null,
  url text,
  accessed_at timestamptz not null,
  primary key (signal_id, ordinal)
);
-- statement
create table if not exists signal_scores (
  signal_id text primary key references ai_signals(id),
  status text not null default 'pending' check (status in ('pending', 'resolved', 'disputed', 'invalid', 'cancelled')),
  final_result text check (final_result in ('YES', 'NO')),
  resolved_at timestamptz,
  resolution_source_url text,
  settlement_transaction_hash text,
  accuracy smallint check (accuracy in (0, 1)),
  brier_score double precision check (brier_score between 0 and 1),
  log_loss double precision check (log_loss >= 0),
  check (status <> 'resolved' or (final_result is not null and resolved_at is not null and accuracy is not null and brier_score is not null and log_loss is not null))
);
-- statement
create index if not exists ai_signals_market_generated_idx on ai_signals (market_id, generated_at desc);
-- statement
create or replace function reject_signal_analysis_change() returns trigger language plpgsql as $$
begin
  raise exception 'Signal analysis and sources are immutable';
end;
$$;
-- statement
create or replace trigger ai_signals_immutable before update or delete on ai_signals
for each row execute function reject_signal_analysis_change();
-- statement
create or replace trigger signal_sources_immutable before update or delete on signal_sources
for each row execute function reject_signal_analysis_change();
