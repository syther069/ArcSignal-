-- X sentiment on market drafts, used to rank them for review. Nullable: older drafts have none.
alter table market_drafts add column if not exists buzz text check (buzz is null or buzz in ('quiet', 'active', 'surging'))
-- statement
alter table market_drafts add column if not exists lean double precision check (lean is null or (lean >= 0 and lean <= 1))
-- statement
alter table market_drafts add column if not exists post_count integer check (post_count is null or post_count >= 0)
-- statement
alter table market_drafts add column if not exists score double precision
