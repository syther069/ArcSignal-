import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
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
  console.log('Neon schema applied successfully.');
}

main().catch((error) => {
  console.error('Neon migration failed:', error);
  process.exit(1);
});
