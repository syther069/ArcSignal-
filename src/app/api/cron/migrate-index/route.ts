import { NextResponse } from 'next/server';
import { authorizeCronRequest } from '@/lib/cron-auth';
import { getSql } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 15;

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
    for (const statement of MIGRATION_STATEMENTS) {
      await sql.query(statement);
    }

    return NextResponse.json({ migrated: true, statements: MIGRATION_STATEMENTS.length });
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