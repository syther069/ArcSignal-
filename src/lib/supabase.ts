import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Market,
  MarketCategory,
  Stake,
  LeaderboardEntry,
  UserProfile,
} from '@/types';

// ---------------------------------------------------------------------------
// Client initialisation
// ---------------------------------------------------------------------------

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

if (!supabase) {
  console.warn(
    'Supabase credentials missing — running in demo/offline mode. ' +
      'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env'
  );
}

// ---------------------------------------------------------------------------
// Helper – guards against null client & throws typed errors
// ---------------------------------------------------------------------------

function client(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Please set environment variables.'
    );
  }
  return supabase;
}

// ---------------------------------------------------------------------------
// Markets
// ---------------------------------------------------------------------------

/**
 * Fetch all open (unresolved) markets, ordered by creation date desc.
 */
export async function getOpenMarkets(): Promise<Market[]> {
  const { data, error } = await client()
    .from('markets')
    .select('*')
    .eq('resolved', false)
    .order('createdAt', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Market[];
}

/**
 * Fetch a single market by its ID.
 */
export async function getMarketById(id: string): Promise<Market | null> {
  const { data, error } = await client()
    .from('markets')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return (data as Market) ?? null;
}

/**
 * Fetch markets filtered by category (football | crypto).
 */
export async function getMarketsByCategory(
  category: MarketCategory
): Promise<Market[]> {
  const { data, error } = await client()
    .from('markets')
    .select('*')
    .eq('category', category)
    .order('createdAt', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Market[];
}

/**
 * Insert a new market row.
 */
export async function insertMarket(
  market: Omit<Market, 'id' | 'createdAt'>
): Promise<Market> {
  const { data, error } = await client()
    .from('markets')
    .insert(market)
    .select()
    .single();

  if (error) throw error;
  return data as Market;
}

// ---------------------------------------------------------------------------
// Stakes
// ---------------------------------------------------------------------------

/**
 * Fetch all stakes for a given wallet address, newest first.
 */
export async function getUserStakes(walletAddress: string): Promise<Stake[]> {
  const { data, error } = await client()
    .from('stakes')
    .select('*')
    .eq('walletAddress', walletAddress.toLowerCase())
    .order('createdAt', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Stake[];
}

/**
 * Insert a new stake record after a successful on-chain tx.
 */
export async function insertStake(
  stake: Omit<Stake, 'id' | 'createdAt'>
): Promise<Stake> {
  const payload = {
    ...stake,
    walletAddress: stake.walletAddress.toLowerCase(),
  };

  const { data, error } = await client()
    .from('stakes')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as Stake;
}

/**
 * Fetch the most recent N stakes across all users (for activity feed).
 */
export async function getRecentStakes(limit = 20): Promise<Stake[]> {
  const { data, error } = await client()
    .from('stakes')
    .select('*, markets(*)')
    .order('createdAt', { ascending: false })
    .limit(limit);

  if (error) throw error;
  
  // Format the joined data to attach market as a property
  return (data ?? []).map((s: any) => ({
    ...s,
    market: s.markets,
  })) as Stake[];
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

export type LeaderboardFilter = 'profit' | 'winRate' | 'volume';

/**
 * Fetch the leaderboard, sorted by the chosen metric.
 * The `leaderboard` view is expected to pre-aggregate per-wallet stats.
 * If the view doesn't exist yet, falls back to computing from stakes.
 */
export async function getLeaderboard(
  filter: LeaderboardFilter = 'profit',
  limit = 50
): Promise<LeaderboardEntry[]> {
  const orderCol: Record<LeaderboardFilter, string> = {
    profit: 'netProfit',
    winRate: 'winRate',
    volume: 'totalStaked',
  };

  const { data, error } = await client()
    .from('leaderboard')
    .select('*')
    .order(orderCol[filter], { ascending: false })
    .limit(limit);

  if (error) {
    // If leaderboard view doesn't exist, return empty gracefully
    console.warn('Leaderboard query failed:', error.message);
    return [];
  }

  // Attach rank based on returned order
  return ((data ?? []) as Omit<LeaderboardEntry, 'rank'>[]).map(
    (entry, idx) => ({
      ...entry,
      rank: idx + 1,
    })
  ) as LeaderboardEntry[];
}

// ---------------------------------------------------------------------------
// User Profiles
// ---------------------------------------------------------------------------

/**
 * Fetch a user profile by wallet address.
 */
export async function getUserProfile(
  walletAddress: string
): Promise<UserProfile | null> {
  const { data, error } = await client()
    .from('profiles')
    .select('*')
    .eq('walletAddress', walletAddress.toLowerCase())
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as UserProfile) ?? null;
}

/**
 * Upsert (update or create) a user profile.
 */
export async function updateUserProfile(
  walletAddress: string,
  updates: Partial<Omit<UserProfile, 'walletAddress'>>
): Promise<void> {
  const { error } = await client()
    .from('profiles')
    .upsert(
      {
        walletAddress: walletAddress.toLowerCase(),
        ...updates,
      },
      { onConflict: 'walletAddress' }
    );

  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Real-time subscriptions (optional — for LiveActivityPanel etc.)
// ---------------------------------------------------------------------------

/**
 * Subscribe to new stakes inserted in real-time.
 * Returns an unsubscribe function.
 */
export function onNewStake(
  callback: (stake: Stake) => void
): () => void {
  if (!supabase) {
    return () => {};
  }

  const channel = supabase
    .channel('stakes-realtime')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'stakes' },
      (payload: any) => {
        callback(payload.new as Stake);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to market updates (pool changes, resolution).
 * Returns an unsubscribe function.
 */
export function onMarketUpdate(
  callback: (market: Market) => void
): () => void {
  if (!supabase) {
    return () => {};
  }

  const channel = supabase
    .channel('markets-realtime')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'markets' },
      (payload: any) => {
        callback(payload.new as Market);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
