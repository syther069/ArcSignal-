create table if not exists ai_prediction_history (
  id uuid default uuid_generate_v4() primary key,
  market_id uuid references markets(id) on delete cascade,
  prediction text not null,
  actual_result text,
  confidence integer,
  was_correct boolean,
  created_at timestamp with time zone default now()
);

create index if not exists idx_ai_history_market on ai_prediction_history(market_id);
create index if not exists idx_ai_history_correct on ai_prediction_history(was_correct);
