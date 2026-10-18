import { describe, expect, it } from 'vitest';
import { ARC_NETWORKS, getArcNetwork, resolveArcNetworkId } from '@/lib/arc-network';

describe('Arc network profile', () => {
  it('resolves testnet when specified explicitly', () => {
    expect(resolveArcNetworkId('testnet')).toBe('testnet');
    expect(resolveArcNetworkId('TESTNET')).toBe('testnet');
    expect(getArcNetwork('testnet').chainId).toBe(5042002);
    expect(getArcNetwork('testnet').rpcUrl).toBe('https://rpc.testnet.arc.io');
    expect(getArcNetwork('testnet').arcsignal).toBe('0x4f33115a18fe6a181be98610ddde3fab71efabed');
    expect(getArcNetwork('testnet').circleChain).toBe('Arc_Testnet');
  });

  it('selects mainnet 5042 with Circle bridge support and without reusing the testnet market contract', () => {
    expect(resolveArcNetworkId(undefined)).toBe('mainnet');
    expect(resolveArcNetworkId('')).toBe('mainnet');
    expect(resolveArcNetworkId('mainnet')).toBe('mainnet');
    expect(resolveArcNetworkId('MAINNET')).toBe('mainnet');
    const mainnet = getArcNetwork('mainnet');
    expect(mainnet.chainId).toBe(5042);
    expect(mainnet.rpcUrl).toBe('https://rpc.mainnet.arc.io');
    expect(mainnet.explorer).toBe('https://explorer.arc.io');
    expect(mainnet.usdc).toBe('0x3600000000000000000000000000000000000000');
    expect(mainnet.arcsignal).toBeNull();
    expect(mainnet.circleChain).toBe('Arc');
    expect(mainnet.testnet).toBe(false);
    expect(mainnet.arcsignal).not.toBe(ARC_NETWORKS.testnet.arcsignal);
  });

  it('validates chain readiness and rejects chain mismatch', async () => {
    const { arcChain, assertArcChainReady } = await import('@/lib/contracts');
    expect(arcChain).toBeDefined();
    expect(arcChain.id).toBe(getArcNetwork('mainnet').chainId);

    const validClient = { getChainId: async () => arcChain.id };
    await expect(assertArcChainReady(validClient)).resolves.toBe(true);

    const wrongClient = { getChainId: async () => 1 };
    await expect(assertArcChainReady(wrongClient)).rejects.toThrow('Chain ID mismatch');
  });
});
