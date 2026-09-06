import { beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  bridge: vi.fn(),
  estimate: vi.fn(),
  off: vi.fn(),
  on: vi.fn(),
}));

vi.mock('@circle-fin/bridge-kit', () => ({
  BridgeKit: class MockBridgeKit {
    bridge = sdk.bridge;
    estimate = sdk.estimate;
    off = sdk.off;
    on = sdk.on;
  },
  isRetryableError: vi.fn(),
}));

vi.mock('@circle-fin/adapter-viem-v2', () => ({
  createViemAdapterFromProvider: vi.fn(),
}));

import { bridgeUsdcToArc, estimateBridgeUsdc } from '@/lib/circle-app-kit';

describe('Circle Arc bridge requests', () => {
  const adapter = {} as never;
  const input = {
    adapter,
    sourceChain: 'Base_Sepolia' as const,
    amount: '2',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sdk.estimate.mockResolvedValue({});
    sdk.bridge.mockResolvedValue({ state: 'success', steps: [] });
  });

  it('includes forwarding in estimates so the quoted fee matches execution', async () => {
    await estimateBridgeUsdc(input);

    expect(sdk.estimate).toHaveBeenCalledWith(expect.objectContaining({
      from: { adapter, chain: 'Base_Sepolia' },
      to: { adapter, chain: 'Arc_Testnet', useForwarder: true },
      amount: '2',
      token: 'USDC',
    }));
  });

  it('uses Circle forwarding for the destination mint', async () => {
    await bridgeUsdcToArc(input);

    expect(sdk.bridge).toHaveBeenCalledWith(expect.objectContaining({
      to: { adapter, chain: 'Arc_Testnet', useForwarder: true },
    }));
  });
});
