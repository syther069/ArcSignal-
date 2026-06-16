export interface LiveMatch {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  minute: number;
}

const FALLBACK_MATCHES: LiveMatch[] = [
  { homeTeam: 'Man City', awayTeam: 'Real Madrid', homeScore: 2, awayScore: 1, minute: 72 },
  { homeTeam: 'Chelsea', awayTeam: 'Arsenal', homeScore: 0, awayScore: 0, minute: 15 },
  { homeTeam: 'Barcelona', awayTeam: 'Bayern Munich', homeScore: 3, awayScore: 2, minute: 88 },
];

export async function fetchLiveMatches(): Promise<LiveMatch[]> {
  const apiKey = process.env.API_FOOTBALL_KEY || process.env.NEXT_PUBLIC_API_FOOTBALL_KEY;
  if (!apiKey) {
    // Return high quality mock live football matches that simulate progress
    return getSimulatedMatches();
  }

  try {
    // API-Football endpoint: e.g., v3.football.api-sports.io or api-football-v1.p.rapidapi.com
    const res = await fetch('https://v3.football.api-sports.io/fixtures?live=all', {
      headers: {
        'x-apisports-key': apiKey,
      },
      next: { revalidate: 30 }
    });
    if (!res.ok) {
      throw new Error('API-Football fetch failed');
    }
    const json = await res.json();
    if (!json.response || !Array.isArray(json.response)) {
      throw new Error('Invalid API-Football response format');
    }

    return json.response.slice(0, 5).map((item: any) => ({
      homeTeam: item.teams.home.name,
      awayTeam: item.teams.away.name,
      homeScore: item.goals.home ?? 0,
      awayScore: item.goals.away ?? 0,
      minute: item.fixture.status.elapsed ?? 0,
    }));
  } catch (error) {
    console.warn('Failed to fetch live matches from API-Football, using fallback', error);
    return getSimulatedMatches();
  }
}

function getSimulatedMatches(): LiveMatch[] {
  // Let's simulate minute and occasionally scores changing based on current time
  const seconds = Math.floor(Date.now() / 1000);
  return [
    {
      homeTeam: 'Man City',
      awayTeam: 'Real Madrid',
      homeScore: 2 + (seconds % 300 > 250 ? 1 : 0),
      awayScore: 1,
      minute: 70 + Math.floor((seconds % 1200) / 60),
    },
    {
      homeTeam: 'Chelsea',
      awayTeam: 'Arsenal',
      homeScore: 1,
      awayScore: 1 + (seconds % 400 > 350 ? 1 : 0),
      minute: 35 + Math.floor((seconds % 1800) / 60),
    },
    {
      homeTeam: 'Barcelona',
      awayTeam: 'Bayern Munich',
      homeScore: 3,
      awayScore: 2,
      minute: 80 + Math.floor((seconds % 600) / 60),
    },
  ];
}
