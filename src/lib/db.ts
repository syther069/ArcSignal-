import { neon } from '@neondatabase/serverless';

export function getSql() {
  const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error('Neon database is not configured. Set DATABASE_URL or POSTGRES_URL.');
  }
  return neon(connectionString);
}
