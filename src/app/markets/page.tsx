import MarketsClient from './MarketsClient';
import { getMarketsFromChain, serializeMarket, type SerializableMarket } from '@/lib/markets';

export const dynamic = 'force-dynamic';

export default async function MarketsPage() {
  let markets: SerializableMarket[] = [];
  try {
    const chainMarkets = await getMarketsFromChain();
    const now = Date.now() / 1000;
    
    // Filter to active markets only (not resolved, and resolution time is in the future or very recently passed)
    const activeMarkets = chainMarkets.filter(m => {
      if (!m.resolved && m.resolutionTime <= now) return false; // Hide expired pending
      if (m.resolved && m.resolutionTime < now - 86400) return false; // Hide old resolved
      return true;
    });
    markets = activeMarkets.map(serializeMarket);

    // Automation: Check if we need to run maintenance (resolve expired and generate new)
    const pendingActive = activeMarkets.filter(m => !m.resolved);
    const cryptoPending = pendingActive.filter(m => m.category === 'CRYPTO');
    const timeframes = ['5m', '15m', '1h', '4h', '24h'];
    
    // Always trigger maintain if there are zero markets on the chain or if we have any expired markets waiting to be resolved
    const hasExpiredPending = chainMarkets.some(m => !m.resolved && m.resolutionTime <= now);
    let needsMaintenance = hasExpiredPending || chainMarkets.length === 0;

    if (!needsMaintenance) {
      // Check if any crypto timeframe is completely depleted
      if (cryptoPending.length === 0) {
        needsMaintenance = true;
      } else {
        for (const tf of timeframes) {
          const tfCount = cryptoPending.filter(m => m.marketId.includes(`-PRICE-${tf}-`)).length;
          if (tfCount === 0) {
            needsMaintenance = true;
            break;
          }
        }
      }
    }

    if (needsMaintenance) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
      fetch(`${appUrl}/api/cron/maintain`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET}`
        }
      }).catch(err => console.error('Failed to trigger background maintenance:', err));
    }
  } catch (error) {
    console.error("Error fetching markets from chain:", error);
    markets = [];
  }

  return <MarketsClient markets={markets} />;
}
