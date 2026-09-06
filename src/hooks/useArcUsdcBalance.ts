'use client';

import { useQuery } from '@tanstack/react-query';

export type ArcWalletUsdcSnapshot = {
  nativeWei: string;
  erc20Raw: string;
  allowanceRaw: string;
  usdc: string;
  nativeUsdc: string;
};

async function fetchArcWalletUsdc(address: string): Promise<ArcWalletUsdcSnapshot> {
  const response = await fetch(`/api/wallet/balance?address=${encodeURIComponent(address)}`);
  const body = await response.json().catch(() => ({ error: 'USDC balance is temporarily unavailable' }));
  if (!response.ok) {
    throw new Error(typeof body.error === 'string' ? body.error : 'USDC balance is temporarily unavailable');
  }
  return body as ArcWalletUsdcSnapshot;
}

export function useArcUsdcBalance(address?: string) {
  const query = useQuery({
    queryKey: ['arc-usdc-balance', address?.toLowerCase()],
    queryFn: () => fetchArcWalletUsdc(address!),
    enabled: !!address,
    staleTime: 10_000,
    retry: 1,
  });

  return {
    snapshot: query.data,
    erc20Raw: query.data ? BigInt(query.data.erc20Raw) : undefined,
    allowanceRaw: query.data ? BigInt(query.data.allowanceRaw) : undefined,
    display: query.data ? Number(query.data.usdc).toFixed(2) : null,
    error: query.error instanceof Error ? query.error.message : null,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
