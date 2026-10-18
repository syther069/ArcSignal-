import { QueryClient } from '@tanstack/react-query';
import { createConfig, http } from 'wagmi';
import { arbitrum, base, mainnet, sepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors/injected';
import { arcChain, arcTestnet } from './contracts';
import { activeArcNetwork } from './arc-network';

export { arcChain, arcTestnet };

const rpcUrl = activeArcNetwork.testnet
  ? (process.env.NEXT_PUBLIC_ARC_RPC_URL ?? process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL ?? arcChain.rpcUrls.default.http[0])
  : (process.env.NEXT_PUBLIC_ARC_RPC_URL ?? arcChain.rpcUrls.default.http[0]);

export const arcChainConfig = {
  chainId: arcChain.id,
  name: arcChain.name,
  network: arcChain.network,
  nativeCurrency: arcChain.nativeCurrency,
  rpcUrl,
  blockExplorerUrl: arcChain.blockExplorers.default.url,
  cctpTokenMessenger: activeArcNetwork.cctpTokenMessenger,
  usdcAddress: activeArcNetwork.usdc,
  decimals: 6,
};
export const arcTestnetConfig = arcChainConfig;

function getConnectors() {
  try {
    return [injected()];
  } catch {
    return [];
  }
}

export const wagmiConfig = createConfig({
  chains: [arcChain, mainnet, base, arbitrum, sepolia],
  ssr: true,
  connectors: getConnectors(),
  multiInjectedProviderDiscovery: true,
  // Arc's public RPC rate-limits Multicall3 aggregate3 (`Request exceeds defined
  // limit`). Wagmi then leaves useReadContract data undefined and the UI showed 0 USDC.
  batch: { multicall: false },
  transports: {
    [arcChain.id]: http(arcChainConfig.rpcUrl, {
      retryCount: 2,
      retryDelay: 400,
    }),
    [mainnet.id]: http(),
    [base.id]: http(),
    [arbitrum.id]: http(),
    [sepolia.id]: http(),
  },
});

export const queryClient = new QueryClient();
