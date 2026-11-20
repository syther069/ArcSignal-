-- Grok Phase 3: market drafts from X trends (operator-approved) and resolution evidence packs.
create table if not exists market_drafts (
  id text primary key,
  status text not null default 'draft' check (status in ('draft', 'approved', 'rejected', 'published', 'failed')),
  symbol text not null,
  threshold double precision not null check (threshold > 0),
  horizon_hours integer not null check (horizon_hours between 1 and 72),
  reason text not null,
  citations jsonb not null default '[]'::jsonb,
  reference_price double precision not null,
  model text not null,
  published_market_id text,
  last_error text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
-- statement
create index if not exists market_drafts_status_idx on market_drafts (status, created_at desc)
-- statement
create table if not exists resolution_evidence (
  market_id text primary key,
  likely_result text not null check (likely_result in ('YES', 'NO', 'UNCLEAR')),
  summary text not null,
  citations jsonb not null default '[]'::jsonb,
  model text not null,
  evidence_hash text not null check (evidence_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now()
)
