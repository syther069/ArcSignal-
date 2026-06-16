import { getOpenMarkets } from '@/lib/supabase';
import DashboardClient from './DashboardClient';
import { Market } from '@/types';

// Fallback demo markets in case Supabase is not configured
const DEMO_MARKETS: Market[] = [
  {
    id: '1',
    category: 'football',
    title: 'Man City vs Real Madrid — UCL Quarter Final',
    description: 'AI Agent X-1 predicts Manchester City to advance based on home form, xG differential, and Haaland fitness data.',
    agentPick: 'Man City Win',
    agentId: 'X-1',
    confidence: 78,
    keyFactors: [
      'Haaland has scored in 8 of last 10 home UCL games',
      'City xG differential +1.8 vs top-6 opponents this season',
      'Real Madrid missing Courtois — backup GK concedes 40% more',
    ],
    followPool: 14500,
    fadePool: 8200,
    resolutionTime: Math.floor(Date.now() / 1000) + 9900,
    resolved: false,
    league: 'UCL',
    homeTeam: 'Man City',
    awayTeam: 'Real Madrid',
    homeScore: 2,
    awayScore: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    category: 'crypto',
    subType: 'price',
    title: 'BTC Price > $70,000 by End of Week',
    description: 'Agent Q-BIT analyzes on-chain flows, ETF inflows, and funding rates to predict Bitcoin clearing $70K.',
    agentPick: 'Above $70K',
    agentId: 'Q-BIT',
    confidence: 62,
    keyFactors: [
      'ETF net inflows +$340M over last 3 days',
      'Funding rates turning positive after 2-week neutral',
      'Exchange reserves at 5-year low — supply shock forming',
    ],
    followPool: 28900,
    fadePool: 31200,
    resolutionTime: Math.floor(Date.now() / 1000) + 86400 * 3,
    resolved: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    category: 'football',
    title: 'Liverpool vs Chelsea — Premier League',
    description: 'Agent STRIKE has low confidence in Liverpool cover based on defensive injury crisis and recent away form.',
    agentPick: 'Chelsea Draw or Win',
    agentId: 'STRIKE',
    confidence: 45,
    keyFactors: [
      'Liverpool missing Van Dijk and Konaté — 3rd choice CB pairing',
      'Chelsea unbeaten in last 6 away PL games',
      'xGA for Liverpool jumped to 2.1 in last 4 without Van Dijk',
    ],
    followPool: 6800,
    fadePool: 12400,
    resolutionTime: Math.floor(Date.now() / 1000) + 3900,
    resolved: false,
    league: 'PL',
    homeTeam: 'Liverpool',
    awayTeam: 'Chelsea',
    homeScore: 0,
    awayScore: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: '4',
    category: 'crypto',
    subType: 'onchain',
    title: 'ETH Gas Fees Drop Below 10 Gwei in 24h',
    description: 'Agent FLUX monitors mempool congestion, L2 adoption rates, and blob usage to forecast mainnet gas.',
    agentPick: 'Below 10 Gwei',
    agentId: 'FLUX',
    confidence: 83,
    keyFactors: [
      'L2 transaction share hit 78% — mainnet activity declining',
      'EIP-4844 blobs absorbing 60% of former calldata',
      'Weekend pattern: gas drops 40% avg on Sat/Sun',
    ],
    followPool: 19200,
    fadePool: 4100,
    resolutionTime: Math.floor(Date.now() / 1000) + 43200,
    resolved: false,
    createdAt: new Date().toISOString(),
  },
];

export const revalidate = 60; // revalidate this page every 60 seconds

export default async function DashboardPage() {
  let initialMarkets: Market[] = [];
  try {
    initialMarkets = await getOpenMarkets();
  } catch (error) {
    console.error('Failed to fetch markets, falling back to demo data', error);
  }

  // Use demo data if Supabase is empty or unconfigured
  if (!initialMarkets || initialMarkets.length === 0) {
    initialMarkets = DEMO_MARKETS;
  }

  return <DashboardClient initialMarkets={initialMarkets} />;
}
