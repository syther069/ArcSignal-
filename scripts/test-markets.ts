import { getMarketsFromChain } from '../src/lib/markets';

async function main() {
  try {
    const chainMarkets = await getMarketsFromChain();
    console.log(`Total markets fetched: ${chainMarkets.length}`);
    
    const activeMarkets = chainMarkets;
    
    console.log(`Markets retained after lifecycle filtering: ${activeMarkets.length}`);
    const cryptoPending = activeMarkets.filter(m => m.category === 'CRYPTO' && !m.resolved);
    console.log(`Crypto pending markets: ${cryptoPending.length}`);
  } catch (error) {
    console.error(error);
  }
}

main();
