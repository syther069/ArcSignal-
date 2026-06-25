import { QueryClient } from '@tanstack/react-query';
import { createConfig, http } from 'wagmi';
import { arcTestnet } from './contracts';

const rpcUrl =
  process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL ??
  'https://rpc.testnet.arc.network';

export const arcTestnetConfig = {
  chainId: arcTestnet.id,
  name: arcTestnet.name,
  rpcUrl,
  nativeCurrency: arcTestnet.nativeCurrency,
  blockExplorer: arcTestnet.blockExplorers.default.url,
};

export const wagmiConfig = createConfig({
  chains: [arcTestnet],
  ssr: true,
  transports: {
    [arcTestnet.id]: http(arcTestnetConfig.rpcUrl),
  },
});

export const queryClient = new QueryClient();
