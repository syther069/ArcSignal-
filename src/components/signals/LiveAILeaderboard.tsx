'use client';
import { useQuery } from '@tanstack/react-query';
import type { AgentLeaderboardEntry } from '@/lib/signal-intelligence/types';
import AILeaderboard from './AILeaderboard';

export default function LiveAILeaderboard({ initialEntries }: { initialEntries: AgentLeaderboardEntry[] | null }) {
  const query = useQuery({ queryKey: ['ai-leaderboard'], initialData: initialEntries ?? undefined,
    queryFn: async () => {
      const response = await fetch('/api/ai/leaderboard', { cache: 'no-store' });
      if (!response.ok) throw new Error('Agent history is temporarily unavailable');
      return (await response.json() as { leaderboard: AgentLeaderboardEntry[] }).leaderboard;
    }, staleTime: 15_000, refetchInterval: 15_000, retry: 1 });
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#b0abb5]">
      <p role="status">{query.isFetching ? 'Refreshing verified scores…' : 'Scores refresh every 15 seconds.'}</p>
      <button className="text-[#ddb7ff] underline disabled:opacity-50" disabled={query.isFetching} onClick={() => void query.refetch()}>Refresh scores</button>
    </div>
    {query.isError ? <p role="alert" className="text-sm text-[#b0abb5]">Agent history is temporarily unavailable.{query.data ? ' Showing the last successfully loaded scores.' : ''} Use Refresh scores to retry.</p> : null}
    {query.data ? <AILeaderboard entries={query.data} /> : query.isPending ? <p role="status">Loading agent records…</p> : null}
  </div>;
}
