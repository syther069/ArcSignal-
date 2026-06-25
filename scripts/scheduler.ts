import * as dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
dotenv.config({ path: resolve(process.cwd(), '.env') })

import { fetchTickerPrices } from '../src/lib/coingecko';
import { fetchLiveMatches } from '../src/lib/apifootball';

console.log("Scheduler initialized.");

// This would ideally be run by a cron job or a persistent node process
async function runHourlyTasks() {
  console.log(`[${new Date().toISOString()}] Running hourly tasks...`);
  try {
    const prices = await fetchTickerPrices();
    console.log(`[Hourly] Fetched ${prices.length} crypto prices.`);
    
    const matches = await fetchLiveMatches();
    console.log(`[Hourly] Fetched ${matches.length} live matches.`);

    // Note: Here we would run Gemini analysis and store prediction history, 
    // and resolve markets that have reached their resolution time.
    
  } catch (error) {
    console.error(`[Hourly Task Error]`, error);
  }
}

async function runDailyTasks() {
  console.log(`[${new Date().toISOString()}] Running daily tasks...`);
  // Note: Here we would generate new markets and archive expired markets.
}

// If run directly, perform one run or mock cron behavior
if (require.main === module) {
  runHourlyTasks().then(() => runDailyTasks());
}
