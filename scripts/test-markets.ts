import { getMarketsFromChain, serializeMarket } from '../src/lib/markets';

async function main() {
  try {
    const chainMarkets = await getMarketsFromChain();
    console.log(`Total markets fetched: ${chainMarkets.length}`);
    
    const now = Date.now() / 1000;
    
    const activeMarkets = chainMarkets.filter(m => {
      if (!m.resolved && m.resolutionTime <= now) return false;
      if (m.resolved && m.resolutionTime < now - 86400) return false;
      return true;
    });
    
    console.log(`Active markets after filter: ${activeMarkets.length}`);
    const cryptoPending = activeMarkets.filter(m => m.category === 'CRYPTO' && !m.resolved);
    console.log(`Crypto pending markets: ${cryptoPending.length}`);
  } catch (error) {
    console.error(error);
  }
}

main();
