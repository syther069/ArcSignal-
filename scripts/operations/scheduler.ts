import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { fetchTickerPrices } from '../../src/lib/coingecko';
import { fetchLiveMatches } from '../../src/lib/apifootball';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

async function runHourlyTasks() {
  console.log(`[${new Date().toISOString()}] Running hourly data checks...`);
  const prices = await fetchTickerPrices();
  console.log(`Fetched ${prices.length} crypto prices.`);
  const matches = await fetchLiveMatches();
  console.log(`Fetched ${matches.length} live matches.`);
}

async function runDailyTasks() {
  console.log(`[${new Date().toISOString()}] Daily scheduler check complete.`);
  // Market history is append-only. Never archive or delete expired markets here.
}

async function main() {
  await runHourlyTasks();
  await runDailyTasks();
}

main().catch((error) => {
  console.error('Scheduler check failed:', error);
  process.exitCode = 1;
});