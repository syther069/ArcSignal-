import { QueryClient } from '@tanstack/react-query';
import { createConfig, http } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors/injected';
import { arcTestnet } from './contracts';

export { arcTestnet };

const rpcUrl =
  process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL ??
  'https://rpc.testnet.arc.io';

export const arcTestnetConfig = {
  chainId: arcTestnet.id,
  name: arcTestnet.name,
  rpcUrl,
  nativeCurrency: arcTestnet.nativeCurrency,
};

function getConnectors() {
  try {
    return [injected()];
  } catch {
    return [];
  }
}

export const wagmiConfig = createConfig({
  chains: [arcTestnet, mainnet, sepolia],
  ssr: true,
  connectors: getConnectors(),
  transports: {
    [arcTestnet.id]: http(arcTestnetConfig.rpcUrl, {
      batch: {
        batchSize: 100,
        wait: 50,
      },
      retryCount: 10,
      retryDelay: 1000,
    }),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
});

export const queryClient = new QueryClient();
