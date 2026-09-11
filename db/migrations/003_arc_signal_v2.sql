-- ArcSignal V2 is indexed alongside V1. V1 rows and claims remain untouched.
alter table markets_index add column if not exists protocol_version smallint not null default 1;
-- statement
alter table markets_index add column if not exists contract_address text;
-- statement
alter table markets_index add column if not exists category_id integer;
-- statement
alter table markets_index add column if not exists category_version integer;
-- statement
alter table markets_index add column if not exists oracle_policy_id integer;
-- statement
alter table markets_index add column if not exists oracle_policy_version integer;
-- statement
alter table markets_index add column if not exists terms_hash text;
-- statement
alter table markets_index add column if not exists resolution_source_hash text;
-- statement
create table if not exists protocol_deployments (
  chain_id numeric(78, 0) not null,
  protocol_version integer not null,
  factory_address text not null check (factory_address ~ '^0x[a-fA-F0-9]{40}$'),
  deployment_block numeric(78, 0) not null,
  deployment_tx_hash text not null check (deployment_tx_hash ~ '^0x[a-fA-F0-9]{64}$'),
  bytecode_manifest jsonb not null,
  active_for_creation boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (chain_id, protocol_version)
);
-- statement
create table if not exists indexed_events_v2 (
  chain_id numeric(78, 0) not null,
  contract_address text not null check (contract_address ~ '^0x[a-fA-F0-9]{40}$'),
  transaction_hash text not null check (transaction_hash ~ '^0x[a-fA-F0-9]{64}$'),
  log_index integer not null,
  block_number numeric(78, 0) not null,
  block_hash text not null check (block_hash ~ '^0x[a-fA-F0-9]{64}$'),
  event_name text not null,
  payload jsonb not null,
  canonical boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (chain_id, contract_address, transaction_hash, log_index)
);
-- statement
create index if not exists indexed_events_v2_reorg_idx
  on indexed_events_v2 (chain_id, block_number, block_hash, canonical);
-- statement
create table if not exists v2_index_checkpoints (
  chain_id numeric(78, 0) not null,
  block_number numeric(78, 0) not null,
  block_hash text not null check (block_hash ~ '^0x[a-fA-F0-9]{64}$'),
  created_at timestamptz not null default now(),
  primary key (chain_id, block_number)
);
-- statement
create table if not exists markets_v2 (
  chain_id numeric(78, 0) not null,
  market_id text not null check (market_id ~ '^0x[a-fA-F0-9]{64}$'),
  market_address text not null check (market_address ~ '^0x[a-fA-F0-9]{40}$'),
  amm_address text not null check (amm_address ~ '^0x[a-fA-F0-9]{40}$'),
  yes_token_address text not null check (yes_token_address ~ '^0x[a-fA-F0-9]{40}$'),
  no_token_address text not null check (no_token_address ~ '^0x[a-fA-F0-9]{40}$'),
  collateral_address text not null check (collateral_address ~ '^0x[a-fA-F0-9]{40}$'),
  oracle_adapter_address text not null check (oracle_adapter_address ~ '^0x[a-fA-F0-9]{40}$'),
  protocol_version integer not null,
  metadata_schema_version integer not null,
  category_id integer not null,
  category_version integer not null,
  oracle_policy_id integer not null,
  oracle_policy_version integer not null,
  fee_version integer not null,
  close_time bigint not null,
  liveness bigint not null,
  void_after bigint not null,
  terms_hash text not null check (terms_hash ~ '^0x[a-fA-F0-9]{64}$'),
  resolution_source_hash text not null check (resolution_source_hash ~ '^0x[a-fA-F0-9]{64}$'),
  ancillary_data_hash text not null check (ancillary_data_hash ~ '^0x[a-fA-F0-9]{64}$'),
  metadata_uri text not null,
  market_state text not null check (market_state in ('OPEN', 'CLOSED', 'RESOLVED', 'VOIDED')),
  oracle_state text not null check (oracle_state in ('NONE', 'REQUESTED', 'PROPOSED', 'DISPUTED', 'SETTLED')),
  outcome text check (outcome in ('YES', 'NO', 'UNDETERMINED')),
  oracle_request_key text,
  resolution_requested_at bigint,
  collateral_liability numeric(78, 0) not null default 0,
  created_block numeric(78, 0) not null,
  updated_block numeric(78, 0) not null,
  updated_at timestamptz not null default now(),
  primary key (chain_id, market_id),
  unique (chain_id, market_address)
);
-- statement
create index if not exists markets_v2_lifecycle_idx
  on markets_v2 (chain_id, market_state, close_time);
-- statement
create table if not exists outcome_transfers_v2 (
  chain_id numeric(78, 0) not null,
  market_id text not null,
  token_address text not null,
  transaction_hash text not null,
  log_index integer not null,
  block_number numeric(78, 0) not null,
  from_address text not null,
  to_address text not null,
  amount numeric(78, 0) not null,
  primary key (chain_id, token_address, transaction_hash, log_index)
);
-- statement
create index if not exists outcome_transfers_v2_wallet_idx
  on outcome_transfers_v2 (chain_id, lower(from_address), lower(to_address), block_number);
-- statement
create table if not exists market_reconciliation_v2 (
  chain_id numeric(78, 0) not null,
  market_address text not null,
  checked_block numeric(78, 0) not null,
  collateral_balance numeric(78, 0) not null,
  collateral_liability numeric(78, 0) not null,
  surplus numeric(78, 0) not null,
  oracle_state text not null,
  market_state text not null,
  is_solvent boolean not null,
  checked_at timestamptz not null default now(),
  primary key (chain_id, market_address, checked_block)
);
