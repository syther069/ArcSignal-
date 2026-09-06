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
  // Arc's public RPC rate-limits Multicall3 aggregate3 (`Request exceeds defined
  // limit`). Wagmi then leaves useReadContract data undefined and the UI showed 0 USDC.
  batch: { multicall: false },
  transports: {
    [arcTestnet.id]: http(arcTestnetConfig.rpcUrl, {
      retryCount: 2,
      retryDelay: 400,
    }),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
});

export const queryClient = new QueryClient();
