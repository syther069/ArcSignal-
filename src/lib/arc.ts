import { QueryClient } from '@tanstack/react-query';
import { createConfig, http } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';
import { arcTestnet } from './contracts';

export { arcTestnet };

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

function getConnectors() {
  try {
    const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
    const connectorValues = [
      injected(),
      projectId ? walletConnect({ projectId }) : null,
      coinbaseWallet({ appName: 'ArcSignal' }),
    ];

    if (connectorValues == null) {
      return [];
    }

    return Object.values(connectorValues).filter(
      (connector): connector is NonNullable<typeof connector> => connector != null,
    );
  } catch {
    return [];
  }
}

export const wagmiConfig = createConfig({
  chains: [arcTestnet, mainnet, sepolia],
  ssr: true,
  connectors: getConnectors(),
  transports: {
    [arcTestnet.id]: http(arcTestnetConfig.rpcUrl),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
});

export const queryClient = new QueryClient();
