import { beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  bridge: vi.fn(),
  estimateBridge: vi.fn(),
  off: vi.fn(),
  on: vi.fn(),
}));

vi.mock('@circle-fin/app-kit', () => ({
  AppKit: class MockAppKit {
    bridge = sdk.bridge;
    estimateBridge = sdk.estimateBridge;
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
    sdk.estimateBridge.mockResolvedValue({});
    sdk.bridge.mockResolvedValue({ state: 'success', steps: [] });
  });

  it('includes forwarding in estimates so the quoted fee matches execution', async () => {
    await estimateBridgeUsdc(input);

    expect(sdk.estimateBridge).toHaveBeenCalledWith(expect.objectContaining({
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
