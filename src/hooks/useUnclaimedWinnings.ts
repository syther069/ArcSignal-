'use client';

import { useEffect, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { ARCSIGNAL_ADDRESS, ARCSIGNAL_ABI } from '@/lib/contracts';
import { parseAbiItem } from 'viem';

/**
 * Returns the count of resolved markets where the user won but hasn't claimed yet.
 * Polls every 30 seconds while mounted.
 */
export function useUnclaimedWinnings(): number {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!address || !publicClient) {
      setCount(0);
      return;
    }

    let cancelled = false;

    const check = async () => {
      try {
        const currentBlock = await publicClient.getBlockNumber();
        const DEPLOYMENT_BLOCK = 50012000n;

        let fromBlock = DEPLOYMENT_BLOCK;
        let allLogs: any[] = [];

        while (fromBlock <= currentBlock) {
          let toBlock = fromBlock + 9999n;
          if (toBlock > currentBlock) toBlock = currentBlock;
          const logs = await publicClient.getLogs({
            address: ARCSIGNAL_ADDRESS,
            event: parseAbiItem('event Staked(string marketId, address user, uint8 side, uint256 amount)'),
            fromBlock,
            toBlock,
          });
          allLogs.push(...logs);
          fromBlock = toBlock + 1n;
        }

        // Unique market+side combinations for this user
        const userPositions = new Map<string, number>();
        for (const log of allLogs) {
          const { user, marketId, side } = log.args as { user: string; marketId: string; side: number };
          if (user?.toLowerCase() !== address.toLowerCase()) continue;
          const key = `${marketId}-${side}`;
          if (!userPositions.has(key)) userPositions.set(key, Number(side));
        }

        if (userPositions.size === 0) {
          if (!cancelled) setCount(0);
          return;
        }

        // For each unique position, check market resolution + claimed status
        let unclaimed = 0;
        const uniqueMarketIds = [...new Set([...userPositions.keys()].map(k => k.split('-')[0]))];

        for (const marketId of uniqueMarketIds) {
          try {
            const [marketResult, claimedResult] = await Promise.all([
              publicClient.readContract({
                address: ARCSIGNAL_ADDRESS,
                abi: ARCSIGNAL_ABI,
                functionName: 'getMarket',
                args: [marketId],
              }) as Promise<{ resolved: boolean; outcome: number }>,
              publicClient.readContract({
                address: ARCSIGNAL_ADDRESS,
                abi: ARCSIGNAL_ABI,
                functionName: 'claimed',
                args: [marketId, address as `0x${string}`],
              }) as Promise<boolean>,
            ]);

            if (!marketResult.resolved) continue;
            if (claimedResult) continue;

            const winnerSide = marketResult.outcome; // 0=FOLLOW, 1=FADE
            const userSide = userPositions.get(`${marketId}-${winnerSide}`);
            if (userSide !== undefined) {
              unclaimed += 1;
            }
          } catch {
            // skip markets that fail
          }
        }

        if (!cancelled) setCount(unclaimed);
      } catch {
        // silently fail — don't disrupt the UI
      }
    };

    check();
    const interval = setInterval(check, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [address, publicClient]);

  return count;
}
