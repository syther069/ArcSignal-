-- On-chain anchoring of AI signal hashes. ai_signals stays immutable; anchors live beside it.
create table if not exists signal_anchor_batches (
  id text primary key,
  merkle_root text not null unique check (merkle_root ~ '^0x[0-9a-f]{64}$'),
  signal_count integer not null check (signal_count > 0),
  tx_hash text not null unique,
  block_number bigint not null,
  chain_id bigint not null,
  contract_address text not null,
  anchored_at timestamptz not null default now()
);
-- statement
create table if not exists signal_anchor_leaves (
  signal_id text primary key references ai_signals(id),
  batch_id text not null references signal_anchor_batches(id),
  leaf_index integer not null check (leaf_index >= 0),
  proof jsonb not null
);
-- statement
create index if not exists signal_anchor_leaves_batch_idx on signal_anchor_leaves (batch_id)
