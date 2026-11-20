-- Price observed right at a V2 market's close, used to propose its result. First valid row wins.
create table if not exists close_observations (
  market_id text primary key,
  symbol text not null,
  price double precision not null check (price > 0),
  observed_at bigint not null,
  provider text not null,
  close_time bigint not null,
  created_at timestamptz not null default now()
)
