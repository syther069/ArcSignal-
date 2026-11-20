export const SIGNAL_OPERATIONS_MIGRATION = [
  `create table if not exists ai_agents (
    id text primary key, profile jsonb not null,
    status text not null default 'active' check (status in ('active', 'paused', 'deprecated')),
    created_at timestamptz not null default now()
  )`,
  `create table if not exists ai_signals (
    id text primary key, market_id text not null references markets_index(market_id),
    agent_id text not null references ai_agents(id), analysis jsonb not null,
    analysis_hash text not null check (analysis_hash ~ '^[a-f0-9]{64}$'), generated_at timestamptz not null,
    previous_signal_id text references ai_signals(id), unique (market_id, agent_id)
  )`,
  `create table if not exists signal_sources (
    signal_id text not null references ai_signals(id), ordinal integer not null,
    name text not null, url text, accessed_at timestamptz not null, primary key (signal_id, ordinal)
  )`,
  `create table if not exists signal_scores (
    signal_id text primary key references ai_signals(id),
    status text not null default 'pending' check (status in ('pending', 'resolved', 'disputed', 'invalid', 'cancelled')),
    final_result text check (final_result in ('YES', 'NO')), resolved_at timestamptz,
    resolution_source_url text, settlement_transaction_hash text,
    accuracy smallint check (accuracy in (0, 1)), brier_score double precision check (brier_score between 0 and 1),
    log_loss double precision check (log_loss >= 0),
    check (status <> 'resolved' or (final_result is not null and resolved_at is not null and accuracy is not null and brier_score is not null and log_loss is not null))
  )`,
  'create index if not exists ai_signals_market_generated_idx on ai_signals (market_id, generated_at desc)',
  `create or replace function reject_signal_analysis_change() returns trigger language plpgsql as $$
    begin raise exception 'Signal analysis and sources are immutable'; end; $$`,
  `create or replace trigger ai_signals_immutable before update or delete on ai_signals
    for each row execute function reject_signal_analysis_change()`,
  `create or replace trigger signal_sources_immutable before update or delete on signal_sources
    for each row execute function reject_signal_analysis_change()`,
  `create table if not exists signal_generation_jobs (
    market_id text primary key references markets_index(market_id) on delete cascade,
    status text not null default 'scheduled' check (status in ('scheduled', 'running', 'retrying', 'complete', 'skipped')),
    attempt_count integer not null default 0 check (attempt_count >= 0),
    last_error text, last_attempt_at timestamptz, next_attempt_at timestamptz not null default now(),
    completed_at timestamptz, lease_token text, lease_expires_at timestamptz,
    created_at timestamptz not null default now(), updated_at timestamptz not null default now()
  )`,
  `create index if not exists signal_generation_jobs_due_idx on signal_generation_jobs (next_attempt_at, created_at)
    where status in ('scheduled', 'retrying', 'running')`,
  `insert into signal_generation_jobs (market_id, status)
    select market_id, 'scheduled' from markets_index
    where not resolved and status = 'OPEN' and resolution_time > extract(epoch from now())
      and upper(category) in ('CRYPTO', 'FOOTBALL')
    on conflict (market_id) do nothing`,
  // Mirrors db/migrations/004_signal_anchors.sql.
  `create table if not exists signal_anchor_batches (
    id text primary key, merkle_root text not null unique check (merkle_root ~ '^0x[0-9a-f]{64}$'),
    signal_count integer not null check (signal_count > 0), tx_hash text not null unique,
    block_number bigint not null, chain_id bigint not null, contract_address text not null,
    anchored_at timestamptz not null default now()
  )`,
  `create table if not exists signal_anchor_leaves (
    signal_id text primary key references ai_signals(id),
    batch_id text not null references signal_anchor_batches(id),
    leaf_index integer not null check (leaf_index >= 0), proof jsonb not null
  )`,
  `create index if not exists signal_anchor_leaves_batch_idx on signal_anchor_leaves (batch_id)`,
  // Mirrors db/migrations/005_x_pulse.sql.
  `create table if not exists x_pulse (
    id text primary key, market_id text not null references markets_index(market_id) on delete cascade,
    mood text not null check (mood in ('YES', 'NO', 'SPLIT', 'QUIET')),
    lean double precision check (lean is null or (lean >= 0 and lean <= 1)),
    volume text not null check (volume in ('quiet', 'active', 'surging')),
    summary text not null, citations jsonb not null default '[]'::jsonb, model text not null,
    created_at timestamptz not null default now()
  )`,
  `create index if not exists x_pulse_market_time_idx on x_pulse (market_id, created_at desc)`,
  // Mirrors db/migrations/006_grok_phase2.sql.
  `create table if not exists market_price_points (
    market_id text not null, p_yes double precision not null check (p_yes >= 0 and p_yes <= 1),
    observed_at timestamptz not null default now(), primary key (market_id, observed_at)
  )`,
  `create table if not exists price_move_notes (
    id text primary key, market_id text not null, from_p double precision not null, to_p double precision not null,
    window_minutes integer not null, note text not null, citations jsonb not null default '[]'::jsonb, model text not null,
    note_hash text not null check (note_hash ~ '^[a-f0-9]{64}$'), created_at timestamptz not null default now()
  )`,
  `create index if not exists price_move_notes_market_idx on price_move_notes (market_id, created_at desc)`,
  `create table if not exists note_anchor_leaves (
    note_id text primary key references price_move_notes(id),
    batch_id text not null references signal_anchor_batches(id),
    leaf_index integer not null check (leaf_index >= 0), proof jsonb not null
  )`,
  `create table if not exists ask_grok_usage (
    bucket text not null, window_start timestamptz not null, count integer not null default 0,
    primary key (bucket, window_start)
  )`,
  // Mirrors db/migrations/007_grok_phase3.sql.
  `create table if not exists market_drafts (
    id text primary key,
    status text not null default 'draft' check (status in ('draft', 'approved', 'rejected', 'published', 'failed')),
    symbol text not null, threshold double precision not null check (threshold > 0),
    horizon_hours integer not null check (horizon_hours between 1 and 72),
    reason text not null, citations jsonb not null default '[]'::jsonb, reference_price double precision not null,
    model text not null, published_market_id text, last_error text,
    created_at timestamptz not null default now(), decided_at timestamptz
  )`,
  `create index if not exists market_drafts_status_idx on market_drafts (status, created_at desc)`,
  // Mirrors db/migrations/008_draft_sentiment.sql.
  `alter table market_drafts add column if not exists buzz text check (buzz is null or buzz in ('quiet', 'active', 'surging'))`,
  `alter table market_drafts add column if not exists lean double precision check (lean is null or (lean >= 0 and lean <= 1))`,
  `alter table market_drafts add column if not exists post_count integer check (post_count is null or post_count >= 0)`,
  `alter table market_drafts add column if not exists score double precision`,
  `create table if not exists resolution_evidence (
    market_id text primary key, likely_result text not null check (likely_result in ('YES', 'NO', 'UNCLEAR')),
    summary text not null, citations jsonb not null default '[]'::jsonb, model text not null,
    evidence_hash text not null check (evidence_hash ~ '^[a-f0-9]{64}$'), created_at timestamptz not null default now()
  )`,
  // Mirrors db/migrations/009_close_observations.sql.
  `create table if not exists close_observations (
    market_id text primary key, symbol text not null, price double precision not null check (price > 0),
    observed_at bigint not null, provider text not null, close_time bigint not null,
    created_at timestamptz not null default now()
  )`,
] as const;
