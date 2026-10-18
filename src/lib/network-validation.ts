import { activeArcNetwork, type ArcNetwork } from './arc-network';

export interface MainnetValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface NetworkCandidate {
  chainId: number;
  testnet: boolean;
  rpcUrl: string;
  explorer: string;
  arcsignal?: string | null;
  usdc: string;
}

const TESTNET_CHAIN_ID = 5042002;
const TESTNET_RPC_INDICATORS = ['testnet.arc.io', 'testnet.arcscan.app'];
const TESTNET_CONTRACT = '0x4f33115a18fe6a181be98610ddde3fab71efabed';

/**
 * Validates the current runtime environment for Arc Mainnet safety.
 * Returns errors if testnet contamination or missing mainnet configurations are detected.
 */
export function validateArcNetworkConfig(network: NetworkCandidate = activeArcNetwork): MainnetValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!network.testnet) {
    const rawChainId = Number(network.chainId);
    // 1. Chain ID check
    if (rawChainId === TESTNET_CHAIN_ID) {
      errors.push(`Mainnet environment has testnet chain ID ${TESTNET_CHAIN_ID}`);
    }
    if (rawChainId !== 5042) {
      errors.push(`Mainnet expected chain ID 5042, got ${rawChainId}`);
    }

    // 2. RPC check
    for (const indicator of TESTNET_RPC_INDICATORS) {
      if (network.rpcUrl.toLowerCase().includes(indicator)) {
        errors.push(`Mainnet configured with testnet RPC: ${network.rpcUrl}`);
      }
      if (network.explorer.toLowerCase().includes(indicator)) {
        errors.push(`Mainnet configured with testnet Explorer: ${network.explorer}`);
      }
    }

    // 3. Prohibit testnet contract reuse
    if (network.arcsignal?.toLowerCase() === TESTNET_CONTRACT.toLowerCase()) {
      errors.push(`Mainnet configured with V1 testnet contract ${TESTNET_CONTRACT}`);
    }

    // 4. Testnet environment variable presence
    if (process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL) {
      warnings.push('NEXT_PUBLIC_ARC_TESTNET_RPC_URL is present in mainnet environment; ignored.');
    }
    if (process.env.ARC_TESTNET_RPC_URL) {
      warnings.push('ARC_TESTNET_RPC_URL is present in mainnet environment; ignored.');
    }

    // 5. USDC Canonical Address check
    const canonicalUsdc = '0x3600000000000000000000000000000000000000';
    if (network.usdc.toLowerCase() !== canonicalUsdc.toLowerCase()) {
      errors.push(`Canonical USDC mismatch on Arc Mainnet: expected ${canonicalUsdc}, got ${network.usdc}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Asserts that the connected RPC matches expected chain ID and environment.
 * Throws an explicit error if validation fails.
 */
export async function assertMainnetRpcHealthy(client: {
  getChainId: () => Promise<number>;
  getBytecode?: (args: { address: `0x${string}` }) => Promise<string | undefined>;
}): Promise<void> {
  const currentChainId = await client.getChainId();
  if (!activeArcNetwork.testnet) {
    if (currentChainId !== 5042) {
      throw new Error(
        `Mainnet fail-closed check: Connected RPC reported chain ID ${currentChainId}, expected 5042 (Arc Mainnet). All writes halted.`,
      );
    }
  } else {
    if (currentChainId !== TESTNET_CHAIN_ID) {
      throw new Error(
        `Testnet fail-closed check: Connected RPC reported chain ID ${currentChainId}, expected ${TESTNET_CHAIN_ID} (Arc Testnet).`,
      );
    }
  }
}
