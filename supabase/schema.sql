-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Markets table
create table if not exists markets (
  id uuid default uuid_generate_v4() primary key,
  category text not null check (category in ('football', 'crypto')),
  "subType" text check ("subType" in ('price', 'listing', 'onchain')),
  title text not null,
  description text,
  "agentId" text,
  "agentPick" text,
  confidence integer check (confidence between 0 and 100),
  probability integer check (probability between 0 and 100),
  summary text,
  "bull_case" text,
  "bear_case" text,
  "keyFactors" text[],
  data_sources text[],
  volume numeric default 0,
  participants integer default 0,
  "followPool" numeric default 0,
  "fadePool" numeric default 0,
  "resolutionTime" bigint,
  resolved boolean default false,
  outcome text,
  resolution_source text,
  resolution_price numeric,
  resolution_timestamp bigint,
  league text,
  "homeTeam" text,
  "awayTeam" text,
  "homeScore" integer,
  "awayScore" integer,
  "createdAt" timestamp with time zone default now()
);

-- Stakes table
create table if not exists stakes (
  id uuid default uuid_generate_v4() primary key,
  "marketId" uuid references markets(id) on delete cascade,
  "walletAddress" text not null,
  side integer not null check (side in (0, 1)),
  "amountUsdc" numeric not null check ("amountUsdc" > 0),
  "txHash" text unique,
  outcome text,
  pnl numeric,
  "createdAt" timestamp with time zone default now()
);

-- Resolutions table
create table if not exists resolutions (
  id uuid default uuid_generate_v4() primary key,
  "marketId" uuid references markets(id) on delete cascade,
  outcome text not null,
  "resolverTxHash" text,
  "resolvedAt" timestamp with time zone default now()
);

-- User profiles table
create table if not exists user_profiles (
  "walletAddress" text primary key,
  username text unique,
  bio text,
  "avatarUrl" text,
  "nftMinted" boolean default false,
  "joinedAt" timestamp with time zone default now()
);

-- Indexes for performance
create index if not exists idx_markets_category on markets(category);
create index if not exists idx_markets_resolved on markets(resolved);
create index if not exists idx_stakes_wallet on stakes("walletAddress");
create index if not exists idx_stakes_market on stakes("marketId");

-- Disable RLS for testing/seeding with anon key
alter table markets disable row level security;
alter table stakes disable row level security;
alter table resolutions disable row level security;
alter table user_profiles disable row level security;

