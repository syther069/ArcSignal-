-- AI Accuracy tracking table
create table if not exists ai_accuracy (
  id uuid default uuid_generate_v4() primary key,
  category text not null check (category in ('football', 'crypto', 'overall')),
  "totalMarkets" integer default 0,
  "correctPredictions" integer default 0,
  "lastUpdated" timestamp with time zone default now()
);

-- Seed initial rows
insert into ai_accuracy (category, "totalMarkets", "correctPredictions")
values 
  ('overall', 0, 0),
  ('football', 0, 0),
  ('crypto', 0, 0)
on conflict do nothing;

create index if not exists idx_ai_accuracy_category on ai_accuracy(category);
alter table ai_accuracy disable row level security;
