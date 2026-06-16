import { headers } from 'next/headers';
import { cookieToInitialState } from 'wagmi';
import { wagmiConfig } from '@/lib/arc';
import { Web3ProviderClient } from './Web3ProviderClient';

export function Web3Provider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialState = cookieToInitialState(
    wagmiConfig,
    headers().get('cookie'),
  );

  return (
    <Web3ProviderClient initialState={initialState}>
      {children}
    </Web3ProviderClient>
  );
}
