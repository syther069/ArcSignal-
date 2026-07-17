import { getMarketsFromChain } from '../src/lib/markets';

async function main() {
  console.log("Starting test-markets...");
  const chainMarkets = await getMarketsFromChain();
  console.log(`Total markets successfully returned: ${chainMarkets.length}`);
}
main();
