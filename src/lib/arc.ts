import { QueryClient } from '@tanstack/react-query';
import { createConfig, http } from 'wagmi';
import type { Chain } from 'viem';

const rpcUrl =
  process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL ??
  'https://rpc.testnet.arc.network';

export const arcTestnetConfig = {
  chainId: 5042002,
  name: 'ARC Testnet',
  rpcUrl,
  nativeCurrency: {
    name: 'ARC',
    symbol: 'ARC',
    decimals: 18,
  },
  blockExplorer: 'https://explorer.testnet.arc.network',
};

export const arcTestnet = {
  id: arcTestnetConfig.chainId,
  name: arcTestnetConfig.name,
  nativeCurrency: arcTestnetConfig.nativeCurrency,
  rpcUrls: {
    default: {
      http: [arcTestnetConfig.rpcUrl],
    },
  },
  blockExplorers: {
    default: {
      name: 'ARC Explorer',
      url: arcTestnetConfig.blockExplorer,
    },
  },
  testnet: true,
} as const satisfies Chain;

export const wagmiConfig = createConfig({
  chains: [arcTestnet],
  ssr: true,
  transports: {
    [arcTestnet.id]: http(arcTestnetConfig.rpcUrl),
  },
});

export const queryClient = new QueryClient();
