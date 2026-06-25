export interface Fixture {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  homeTeamLogo: string;
  awayTeamLogo: string;
  kickoffTime: number;
  status: 'NS' | '1H' | 'HT' | '2H' | 'FT' | 'AET' | 'PEN' | 'CANC' | 'PST';
  homeScore: number | null;
  awayScore: number | null;
  round: string;
  leagueName: string;
}

export interface LiveMatch {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  minute: number;
}

const BASE_URL = 'https://v3.football.api-sports.io';

type ApiFootballStatus = Fixture['status'];

interface ApiFootballFixtureResponse {
  fixture: {
    id: number;
    date: string;
    status: {
      short: ApiFootballStatus;
    };
  };
  teams: {
    home: {
      name: string;
      logo: string;
    };
    away: {
      name: string;
      logo: string;
    };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  league: {
    round: string;
    name: string;
  };
}

function getHeaders() {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) {
    throw new Error('API_FOOTBALL_KEY is not configured');
  }

  return { 'x-apisports-key': apiKey };
}

function mapFixture(item: ApiFootballFixtureResponse): Fixture {
  return {
    fixtureId: item.fixture.id,
    homeTeam: item.teams.home.name,
    awayTeam: item.teams.away.name,
    homeTeamLogo: item.teams.home.logo,
    awayTeamLogo: item.teams.away.logo,
    kickoffTime: Math.floor(new Date(item.fixture.date).getTime() / 1000),
    status: item.fixture.status.short,
    homeScore: item.goals.home,
    awayScore: item.goals.away,
    round: item.league.round,
    leagueName: item.league.name,
  };
}

async function fetchFixtures(url: string): Promise<Fixture[]> {
  const response = await fetch(url, {
    headers: getHeaders(),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`API-Football fetch failed with status ${response.status}`);
  }

  const json = (await response.json()) as { response?: ApiFootballFixtureResponse[] };
  if (!Array.isArray(json.response)) {
    throw new Error('Invalid API-Football response format');
  }

  return json.response.map(mapFixture);
}

export async function fetchUpcomingFixtures(
  leagueId = 1,
  season = 2026,
): Promise<Fixture[]> {
  const today = new Date().toISOString().slice(0, 10);
  return fetchFixtures(
    `${BASE_URL}/fixtures?league=${leagueId}&season=${season}&from=${today}&to=${season}-12-31&status=NS`,
  );
}

export async function fetchCompletedFixtures(
  leagueId: number,
  season: number,
  fromDate: string,
  toDate: string,
): Promise<Fixture[]> {
  return fetchFixtures(
    `${BASE_URL}/fixtures?league=${leagueId}&season=${season}&from=${fromDate}&to=${toDate}&status=FT`,
  );
}

export async function fetchLiveMatches(): Promise<LiveMatch[]> {
  const response = await fetch(`${BASE_URL}/fixtures?live=all&league=1&season=2026`, {
    headers: getHeaders(),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`API-Football live fetch failed with status ${response.status}`);
  }

  const json = (await response.json()) as { response?: ApiFootballFixtureResponse[] };
  if (!Array.isArray(json.response)) {
    throw new Error('Invalid API-Football live response format');
  }

  return json.response.map((fixture) => ({
    homeTeam: fixture.teams.home.name,
    awayTeam: fixture.teams.away.name,
    homeScore: fixture.goals.home ?? 0,
    awayScore: fixture.goals.away ?? 0,
    minute: 0,
  }));
}
