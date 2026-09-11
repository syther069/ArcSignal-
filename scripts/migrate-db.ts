import * as dotenv from 'dotenv';
import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { getSql } from '../src/lib/db';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

async function main() {
  const sql = getSql();
  const schema = readFileSync(resolve(process.cwd(), 'db/schema.sql'), 'utf8');
  // Neon’s HTTP driver accepts one statement per request; schema.sql is kept
  // semicolon-delimited so migrations remain reviewable and rerunnable.
  for (const statement of schema.split(';').map((part) => part.trim()).filter(Boolean)) {
    await sql.query(statement);
  }
  const migrationDirectory = resolve(process.cwd(), 'db/migrations');
  for (const filename of readdirSync(migrationDirectory).filter((name) => name.endsWith('.sql')).sort()) {
    const migration = readFileSync(resolve(migrationDirectory, filename), 'utf8');
    const statements = migration.includes('-- statement')
      ? migration.split('-- statement')
      : migration.split(';');
    for (const statement of statements.map((part) => part.trim()).filter(Boolean)) {
      await sql.query(statement);
    }
    console.log(`Applied ${filename}.`);
  }
  console.log('Neon schema applied successfully.');
}

main().catch((error) => {
  console.error('Neon migration failed:', error);
  process.exit(1);
});
