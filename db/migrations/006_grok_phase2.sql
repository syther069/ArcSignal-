-- Grok Phase 2: price-move notes, their on-chain anchors, and Ask Grok usage limits.
create table if not exists market_price_points (
  market_id text not null,
  p_yes double precision not null check (p_yes >= 0 and p_yes <= 1),
  observed_at timestamptz not null default now(),
  primary key (market_id, observed_at)
);
-- statement
create table if not exists price_move_notes (
  id text primary key,
  market_id text not null,
  from_p double precision not null,
  to_p double precision not null,
  window_minutes integer not null,
  note text not null,
  citations jsonb not null default '[]'::jsonb,
  model text not null,
  note_hash text not null check (note_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now()
);
-- statement
create index if not exists price_move_notes_market_idx on price_move_notes (market_id, created_at desc)
-- statement
create table if not exists note_anchor_leaves (
  note_id text primary key references price_move_notes(id),
  batch_id text not null references signal_anchor_batches(id),
  leaf_index integer not null check (leaf_index >= 0),
  proof jsonb not null
);
-- statement
create table if not exists ask_grok_usage (
  bucket text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (bucket, window_start)
)
