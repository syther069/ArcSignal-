import { getRecentStakes } from '@/lib/supabase';
import FeedClient from './FeedClient';
import { Stake } from '@/types';

// Demo data for fallback
const DEMO_STAKES: Stake[] = [
  {
    id: 's1',
    marketId: '1',
    walletAddress: '0x8a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b',
    side: 0,
    amountUsdc: 12450.0,
    txHash: '0xabc123',
    createdAt: new Date(Date.now() - 60000).toISOString(),
    // @ts-ignore
    market: {
      title: 'Man City vs Real Madrid — UCL Quarter Final',
      category: 'football',
      agentPick: 'Man City Win',
      confidence: 78,
    }
  },
  {
    id: 's2',
    marketId: '2',
    walletAddress: '0x112233445566778899aabbccddeeff0011223344',
    side: 1,
    amountUsdc: 450.0,
    txHash: '0xdef456',
    createdAt: new Date(Date.now() - 180000).toISOString(),
    // @ts-ignore
    market: {
      title: 'BTC Price > $70,000 by End of Week',
      category: 'crypto',
      agentPick: 'Above $70K',
      confidence: 62,
    }
  },
  {
    id: 's3',
    marketId: '1',
    walletAddress: '0x99887766554433221100ffeeddccbbaa99887766',
    side: 0,
    amountUsdc: 89201.12,
    txHash: '0xghi789',
    createdAt: new Date(Date.now() - 360000).toISOString(),
    // @ts-ignore
    market: {
      title: 'Man City vs Real Madrid — UCL Quarter Final',
      category: 'football',
      agentPick: 'Man City Win',
      confidence: 78,
    }
  },
  {
    id: 's4',
    marketId: '3',
    walletAddress: '0x5555555555555555555555555555555555555555',
    side: 1,
    amountUsdc: 250000.0,
    txHash: '0xjkl012',
    createdAt: new Date(Date.now() - 720000).toISOString(),
    // @ts-ignore
    market: {
      title: 'Liverpool vs Chelsea — Premier League',
      category: 'football',
      agentPick: 'Chelsea Draw or Win',
      confidence: 45,
    }
  },
  {
    id: 's5',
    marketId: '4',
    walletAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    side: 0,
    amountUsdc: 5400.0,
    txHash: '0xmno345',
    createdAt: new Date(Date.now() - 1440000).toISOString(),
    // @ts-ignore
    market: {
      title: 'ETH Gas Fees Drop Below 10 Gwei in 24h',
      category: 'crypto',
      agentPick: 'Below 10 Gwei',
      confidence: 83,
    }
  }
];

export const revalidate = 10;

export default async function FeedPage() {
  let initialStakes: Stake[] = [];
  
  try {
    // Fetch up to 100 recent stakes for client-side pagination/filtering
    initialStakes = await getRecentStakes(100);
  } catch (error) {
    console.error('Failed to fetch recent stakes', error);
  }

  if (!initialStakes || initialStakes.length === 0) {
    initialStakes = DEMO_STAKES;
  }

  return <FeedClient initialStakes={initialStakes} />;
}
