export type ArcNetworkId = 'testnet' | 'mainnet';

const USDC = '0x3600000000000000000000000000000000000000' as const;
const TESTNET_ARCSIGNAL = '0x4f33115a18fe6a181be98610ddde3fab71efabed' as const;

const MAINNET_ARCSIGNAL = '0x0b2ffef100152f94a7924830056b05dc60d88c4d' as const;

export const ARC_NETWORKS = {
  testnet: {
    id: 'testnet' as const,
    chainId: 5042002,
    name: 'ARC Testnet',
    network: 'arc-testnet',
    rpcUrl: 'https://rpc.testnet.arc.io',
    explorer: 'https://explorer.testnet.arc.io',
    usdc: USDC,
    arcsignal: TESTNET_ARCSIGNAL as `0x${string}` | null,
    circleChain: 'Arc_Testnet' as const,
    cctpTokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA' as const,
    testnet: true,
  },
  mainnet: {
    id: 'mainnet' as const,
    chainId: 5042,
    name: 'Arc',
    network: 'arc',
    rpcUrl: 'https://rpc.mainnet.arc.io',
    explorer: 'https://explorer.arc.io',
    usdc: USDC,
    arcsignal: (() => {
      const addr = process.env.NEXT_PUBLIC_ARCSIGNAL_CONTRACT_ADDRESS as `0x${string}` | undefined;
      if (addr && addr.toLowerCase() !== TESTNET_ARCSIGNAL.toLowerCase()) return addr;
      return MAINNET_ARCSIGNAL;
    })(),
    v2Factory: (process.env.NEXT_PUBLIC_ARCSIGNAL_V2_FACTORY_ADDRESS as `0x${string}`) || null,
    // Arc Mainnet registered in @circle-fin/bridge-kit >=1.15.0
    circleChain: 'Arc' as const,
    cctpTokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d' as const,
    multicall3: '0xca11bde05977b3631167028862be2a173976ca11' as const,
    testnet: false,
  },
} as const;

export type ArcNetwork = (typeof ARC_NETWORKS)[ArcNetworkId];

export function resolveArcNetworkId(value: string | undefined): ArcNetworkId {
  if (value) {
    return value.trim().toLowerCase() === 'testnet' ? 'testnet' : 'mainnet';
  }
  const rpc = process.env.ARC_RPC_URL ?? process.env.NEXT_PUBLIC_ARC_RPC_URL ?? '';
  if (rpc.includes('testnet')) return 'testnet';
  return 'mainnet';
}

export function getArcNetwork(id: ArcNetworkId): (typeof ARC_NETWORKS)[ArcNetworkId] {
  return ARC_NETWORKS[id];
}

export const activeArcNetworkId = resolveArcNetworkId(process.env.NEXT_PUBLIC_ARC_NETWORK ?? 'mainnet');
export const activeArcNetwork = getArcNetwork(activeArcNetworkId);

export function resolveArcRpcUrl() {
  if (activeArcNetworkId === 'mainnet') {
    return process.env.ARC_RPC_URL
      ?? process.env.NEXT_PUBLIC_ARC_RPC_URL
      ?? activeArcNetwork.rpcUrl;
  }

  return process.env.ARC_RPC_URL
    ?? process.env.ARC_TESTNET_RPC_URL
    ?? process.env.NEXT_PUBLIC_ARC_RPC_URL
    ?? process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL
    ?? activeArcNetwork.rpcUrl;
}
