import { getMarketById } from '@/lib/supabase';
import MarketDetailClient from './MarketDetailClient';
import { notFound } from 'next/navigation';
import { Market } from '@/types';

// Fallback demo market in case Supabase is not configured or id is missing
const DEMO_MARKET: Market = {
  id: '1',
  category: 'football',
  title: 'Man City vs Real Madrid — UCL Quarter Final',
  description: 'AI Agent X-1 predicts Manchester City to advance based on home form, xG differential, and Haaland fitness data.',
  agentPick: 'Man City Win',
  agentId: 'X-1',
  confidence: 88.4,
  keyFactors: [
    'Man City\'s high-press intensity has increased by 14% in the last 15 minutes. Real Madrid\'s transitions are being bottled in the midfield pivot, leading to a 0.85 xG advantage for the home side.',
    'Real Madrid\'s substitute choice (Camavinga) indicates a defensive pivot. Analysis of historical substitution data suggests a 65% chance of Madrid dropping deeper into a low block for the remaining 20 minutes.',
    'In 8 out of 10 previous encounters where City led by 1 goal at the 70th minute, they successfully closed the game with a 2+ goal margin. Madrid\'s "late goal" variance is currently trending lower than seasonal average.'
  ],
  followPool: 840412,
  fadePool: 420206,
  resolutionTime: Math.floor(Date.now() / 1000) + 9900,
  resolved: false,
  league: 'UCL',
  homeTeam: 'Man City',
  awayTeam: 'Real Madrid',
  homeScore: 2,
  awayScore: 1,
  createdAt: new Date().toISOString(),
};

export const revalidate = 60;

export default async function MarketDetailPage({
  params,
}: {
  params: { id: string };
}) {
  let market: Market | null = null;
  
  try {
    market = await getMarketById(params.id);
  } catch (error) {
    console.error('Failed to fetch market details', error);
  }

  if (!market) {
    // If we're in demo mode or the market doesn't exist, try the fallback
    if (params.id === DEMO_MARKET.id || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      market = { ...DEMO_MARKET, id: params.id };
    } else {
      notFound();
    }
  }

  return <MarketDetailClient market={market} />;
}
