create table if not exists sync_state (
  id text primary key,
  last_block numeric(78, 0) not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists indexed_events (
  transaction_hash text not null,
  log_index integer not null,
  event_name text not null,
  block_number numeric(78, 0) not null,
  created_at timestamptz not null default now(),
  primary key (transaction_hash, log_index)
);

create table if not exists markets_index (
  market_id text primary key,
  category text not null,
  question text not null,
  analysis_json jsonb,
  resolution_time numeric(78, 0) not null,
  follow_pool numeric(78, 0) not null default 0,
  fade_pool numeric(78, 0) not null default 0,
  resolved boolean not null default false,
  outcome smallint not null default 0,
  status text not null default 'OPEN',
  opened_at numeric(78, 0),
  closed_at numeric(78, 0),
  resolved_at numeric(78, 0),
  void_reason text,
  created_block numeric(78, 0),
  updated_block numeric(78, 0),
  updated_at timestamptz not null default now()
);

create index if not exists markets_index_active_idx
  on markets_index (resolved, resolution_time desc);

create table if not exists positions_index (
  market_id text not null references markets_index(market_id) on delete cascade,
  wallet_address text not null,
  side smallint not null check (side in (0, 1)),
  amount numeric(78, 0) not null default 0,
  first_staked_block numeric(78, 0),
  last_staked_block numeric(78, 0),
  primary key (market_id, wallet_address, side)
);

create index if not exists positions_index_wallet_idx
  on positions_index (lower(wallet_address));

create table if not exists claims_index (
  market_id text not null,
  wallet_address text not null,
  amount numeric(78, 0) not null default 0,
  claimed_block numeric(78, 0),
  primary key (market_id, wallet_address)
);

create table if not exists refunds_index (
  market_id text not null,
  wallet_address text not null,
  amount numeric(78, 0) not null default 0,
  refunded_block numeric(78, 0),
  primary key (market_id, wallet_address)
);

create table if not exists oracle_attempts (
  id bigserial primary key,
  market_id text not null references markets_index(market_id) on delete cascade,
  attempted_at timestamptz not null default now(),
  outcome smallint,
  status text not null,
  transaction_hash text,
  error_message text
);

alter table markets_index add column if not exists status text not null default 'OPEN';
alter table markets_index add column if not exists opened_at numeric(78, 0);
alter table markets_index add column if not exists closed_at numeric(78, 0);
alter table markets_index add column if not exists resolved_at numeric(78, 0);
alter table markets_index add column if not exists void_reason text;
