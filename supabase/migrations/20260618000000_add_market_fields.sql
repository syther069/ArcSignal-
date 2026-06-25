ALTER TABLE markets 
ADD COLUMN IF NOT EXISTS probability integer check (probability between 0 and 100),
ADD COLUMN IF NOT EXISTS summary text,
ADD COLUMN IF NOT EXISTS bull_case text,
ADD COLUMN IF NOT EXISTS bear_case text,
ADD COLUMN IF NOT EXISTS data_sources text[],
ADD COLUMN IF NOT EXISTS volume numeric default 0,
ADD COLUMN IF NOT EXISTS participants integer default 0,
ADD COLUMN IF NOT EXISTS resolution_source text,
ADD COLUMN IF NOT EXISTS resolution_price numeric,
ADD COLUMN IF NOT EXISTS resolution_timestamp bigint;
