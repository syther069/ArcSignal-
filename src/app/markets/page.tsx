import MarketsClient from './MarketsClient';
import { getMarketsFromChain, serializeMarket, type SerializableMarket } from '@/lib/markets';

export const dynamic = 'force-dynamic';

export default async function MarketsPage() {
  let markets: SerializableMarket[] = [];
  try {
    const chainMarkets = await getMarketsFromChain();
    const now = Date.now() / 1000;
    
    // Only show resolved markets or markets that haven't expired yet
    const activeMarkets = chainMarkets.filter(m => m.resolved || m.resolutionTime > now);
    markets = activeMarkets.map(serializeMarket);

    // If there are very few active markets left, trigger generation in the background
    if (activeMarkets.length < 2 && chainMarkets.length > 0) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      fetch(`${appUrl}/api/cron/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET}`
        }
      }).catch(err => console.error('Failed to trigger background generation:', err));
    }
  } catch (error) {
    console.error("Error fetching markets from chain:", error);
    markets = [];
  }

  return <MarketsClient markets={markets} />;
}
