import { fetchUpcomingFixtures, fetchLiveMatches } from '@/lib/apifootball';
import { getMarketsByCategory } from '@/lib/frontend-data';
import { Market } from '@/types';
import WorldCupClient from './WorldCupClient';

export const revalidate = 60;

export default async function WorldCupPage() {
  let upcomingFixtures: { homeTeam: string; awayTeam: string; league: string }[] = [];
  let liveMatches: { homeTeam: string; awayTeam: string; homeScore: number; awayScore: number; minute: number }[] = [];
  let footballMarkets: Market[] = [];

  try {
    [upcomingFixtures, liveMatches, footballMarkets] = await Promise.all([
      fetchUpcomingFixtures(),
      fetchLiveMatches(),
      getMarketsByCategory('football'),
    ]);
  } catch (error) {
    console.error('Failed to fetch World Cup data:', error);
  }

  return (
    <WorldCupClient
      upcomingFixtures={upcomingFixtures}
      liveMatches={liveMatches}
      footballMarkets={footballMarkets}
    />
  );
}
