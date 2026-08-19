'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';

/**
 * Returns the count of resolved markets where the user won but hasn't claimed yet.
 * Uses lightweight indexed API query instead of expensive on-chain log scans.
 * Throttles polling and pauses when the tab is hidden.
 */
export function useUnclaimedWinnings(): number {
  const { address } = useAccount();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!address) {
      setCount(0);
      return;
    }

    let cancelled = false;

    const check = async () => {
      // Skip background polling if tab is not visible
      if (typeof document !== 'undefined' && document.hidden) return;

      try {
        const res = await fetch(`/api/portfolio?address=${encodeURIComponent(address)}`);
        if (!res.ok) return;

        const data = await res.json();
        if (cancelled || !data.positions) return;

        // Count positions where market is resolved, user won, and not yet claimed
        const unclaimed = data.positions.filter(
          (p: { isResolved: boolean; userWon: boolean; claimed: boolean }) =>
            p.isResolved && p.userWon && !p.claimed
        ).length;

        setCount(unclaimed);
      } catch {
        // Silently fail to avoid UI disruption
      }
    };

    check();
    const interval = setInterval(check, 60_000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        check();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [address]);

  return count;
}

