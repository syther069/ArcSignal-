import dotenv from 'dotenv';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env', quiet: true });
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) throw new Error('DATABASE_URL or POSTGRES_URL is required');
const sql = neon(url);
const migrationFiles = [
  'db/migrations/001_signal_intelligence.sql',
  'db/migrations/002_signal_generation_jobs.sql',
];
const statements = migrationFiles.flatMap(file => readFileSync(file, 'utf8').split('-- statement').map(s => s.trim()).filter(Boolean));
// Isolated schema test, in one transaction. No test records survive a success or failure.
// The random identifier is generated here, never supplied by a user or environment variable.
const schema = `signal_migration_test_${randomBytes(8).toString('hex')}`;
const validation = [
  `create schema "${schema}"`,
  `set local search_path to "${schema}", public`,
  "create table markets_index (market_id text primary key, category text not null default 'CRYPTO', question text not null default '', status text not null default 'OPEN', resolved boolean not null default false, resolution_time bigint not null default 4102444800)",
  ...statements,
  "insert into markets_index values ('migration-test')",
  "insert into ai_agents (id, profile) values ('test-agent', '{}'::jsonb)",
  "insert into ai_signals (id, market_id, agent_id, analysis, analysis_hash, generated_at) values ('test-signal','migration-test','test-agent','{}'::jsonb,repeat('a',64),now())",
  "insert into signal_sources values ('test-signal',0,'Test',null,now())",
  "insert into signal_generation_jobs (market_id) values ('migration-test')",
  `do $$ begin
    begin update ai_signals set analysis = '{}'::jsonb; raise exception 'immutability test failed';
    exception when raise_exception then if sqlerrm <> 'Signal analysis and sources are immutable' then raise; end if; end;
    begin delete from signal_sources; raise exception 'source immutability test failed';
    exception when raise_exception then if sqlerrm <> 'Signal analysis and sources are immutable' then raise; end if; end;
    begin insert into signal_scores (signal_id,status) values ('test-signal','resolved'); raise exception 'score constraint test failed';
    exception when check_violation then null; end;
  end $$`,
  // Only the exact schema generated above can be dropped.
  `drop schema "${schema}" cascade`,
];
try {
  await sql.transaction(validation.map(statement => sql.query(statement)));
  console.log('PASS: isolated migration, immutable analysis/sources, resolved-score constraints, and generation queue. Test schema removed.');
  if (!process.argv.includes('--verify-only')) {
    await sql.transaction(statements.map(statement => sql.query(statement)));
    console.log('Signal Intelligence migration applied atomically. No predictions were seeded.');
  }
} catch (error) {
  console.error('Signal migration failed:', error instanceof Error ? error.message : 'Unknown database error');
  process.exitCode = 1;
}
