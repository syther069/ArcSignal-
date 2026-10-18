import { describe, expect, it } from 'vitest';
import { assertMainnetRpcHealthy, validateArcNetworkConfig } from '@/lib/network-validation';
import { ARC_NETWORKS } from '@/lib/arc-network';

describe('Network validation fail-closed checks', () => {
  it('validates testnet profile safely', () => {
    const result = validateArcNetworkConfig(ARC_NETWORKS.testnet);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('validates mainnet profile cleanly', () => {
    const result = validateArcNetworkConfig(ARC_NETWORKS.mainnet);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails closed if mainnet has testnet chain ID or testnet RPC', () => {
    const corruptedMainnet = {
      ...ARC_NETWORKS.mainnet,
      chainId: 5042002,
      rpcUrl: 'https://rpc.testnet.arc.io',
      explorer: 'https://explorer.testnet.arc.io',
      arcsignal: '0x4f33115a18fe6a181be98610ddde3fab71efabed' as `0x${string}`,
    };
    const result = validateArcNetworkConfig(corruptedMainnet);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(4);
    expect(result.errors.some((e) => e.includes('testnet chain ID'))).toBe(true);
    expect(result.errors.some((e) => e.includes('testnet RPC'))).toBe(true);
    expect(result.errors.some((e) => e.includes('testnet Explorer'))).toBe(true);
    expect(result.errors.some((e) => e.includes('V1 testnet contract'))).toBe(true);
  });

  it('assertMainnetRpcHealthy validates matching chain ID', async () => {
    const mainnetClient = { getChainId: async () => 5042 };
    await expect(assertMainnetRpcHealthy(mainnetClient)).resolves.toBeUndefined();

    const wrongClient = { getChainId: async () => 1 };
    await expect(assertMainnetRpcHealthy(wrongClient)).rejects.toThrow('Mainnet fail-closed check');
  });
});
