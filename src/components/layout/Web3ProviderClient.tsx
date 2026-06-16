'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, type State } from 'wagmi';
import { queryClient, wagmiConfig } from '@/lib/arc';

export function Web3ProviderClient({
  children,
  initialState,
}: Readonly<{
  children: React.ReactNode;
  initialState?: State;
}>) {
  return (
    <WagmiProvider config={wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
