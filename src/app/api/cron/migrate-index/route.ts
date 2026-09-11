import { NextResponse } from 'next/server';
import { authorizeCronRequest } from '@/lib/cron-auth';
import { getSql } from '@/lib/db';
import { SIGNAL_OPERATIONS_MIGRATION } from '@/lib/signal-intelligence/schema';
import { V2_INDEX_MIGRATION } from '@/lib/v2-schema';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 45;

const MIGRATION_STATEMENTS = [
  'alter table sync_state add column if not exists lease_token text',
  'alter table sync_state add column if not exists lease_expires_at timestamptz',
  'create index if not exists sync_state_lease_expiry_idx on sync_state (lease_expires_at)',
  'create index if not exists indexed_events_block_number_idx on indexed_events (block_number)',
  'create index if not exists indexed_events_event_block_idx on indexed_events (event_name, block_number desc)',
  'create index if not exists claims_index_wallet_idx on claims_index (lower(wallet_address))',
] as const;

export async function POST(request: Request) {
  const authorization = authorizeCronRequest(request);
  if (!authorization.ok) return authorization.response;

  try {
    const sql = getSql();
    const statements = [...MIGRATION_STATEMENTS, ...SIGNAL_OPERATIONS_MIGRATION, ...V2_INDEX_MIGRATION];
    for (const statement of statements) {
      await sql.query(statement);
    }

    return NextResponse.json({ migrated: true, statements: statements.length });
  } catch (error) {
    console.error('Indexer schema migration failed:', error);
    return NextResponse.json(
      {
        error: 'Indexer schema migration failed',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
