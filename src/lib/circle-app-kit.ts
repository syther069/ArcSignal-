import { AppKit, isRetryableError } from '@circle-fin/app-kit';
import type {
  BridgeEstimateResult,
  BridgeResult,
  BridgeStep,
} from '@circle-fin/app-kit';
import {
  createViemAdapterFromProvider,
  type ViemAdapter,
} from '@circle-fin/adapter-viem-v2';
import type { EIP1193Provider } from 'viem';

export const ARC_CIRCLE_CHAIN = 'Arc_Testnet' as const;

export const supportedFundingSourceChains = [
  { id: 'Ethereum_Sepolia', name: 'Ethereum Sepolia', chainId: 11155111 },
  { id: 'Base_Sepolia', name: 'Base Sepolia', chainId: 84532 },
  { id: 'Arbitrum_Sepolia', name: 'Arbitrum Sepolia', chainId: 421614 },
] as const;

export type FundingSourceChain =
  (typeof supportedFundingSourceChains)[number]['id'];

export type BrowserWalletViemAdapter = ViemAdapter;
export type CircleBridgeResult = BridgeResult;

export type CircleBridgeProgress = {
  name: string;
  state: BridgeStep['state'];
  txHash?: string;
  explorerUrl?: string;
  errorMessage?: string;
};

// Circle App Kit is stateless between calls apart from event subscriptions, so
// one shared instance is safe. Callers always unsubscribe their own handlers.
export const circleAppKit = new AppKit();

export async function createBrowserWalletViemAdapter(
  provider: EIP1193Provider,
) {
  return createViemAdapterFromProvider({ provider });
}

function normalizeProgress(payload: unknown): CircleBridgeProgress | null {
  if (!payload || typeof payload !== 'object') return null;
  const event = payload as Record<string, unknown>;
  const values =
    event.values && typeof event.values === 'object'
      ? (event.values as Record<string, unknown>)
      : event;
  const state = values.state;

  if (
    state !== 'pending' &&
    state !== 'success' &&
    state !== 'error' &&
    state !== 'noop'
  ) {
    return null;
  }

  return {
    name: String(values.name ?? event.method ?? 'bridge'),
    state,
    txHash: typeof values.txHash === 'string' ? values.txHash : undefined,
    explorerUrl:
      typeof values.explorerUrl === 'string' ? values.explorerUrl : undefined,
    errorMessage:
      typeof values.errorMessage === 'string' ? values.errorMessage : undefined,
  };
}

type BridgeInput = {
  adapter: ViemAdapter;
  sourceChain: FundingSourceChain;
  amount: string;
};

export async function estimateBridgeUsdc({
  adapter,
  sourceChain,
  amount,
}: BridgeInput): Promise<BridgeEstimateResult> {
  return circleAppKit.estimateBridge({
    from: { adapter, chain: sourceChain },
    to: { adapter, chain: ARC_CIRCLE_CHAIN },
    amount,
    token: 'USDC',
  });
}

export async function bridgeUsdcToArc(
  input: BridgeInput,
  onProgress?: (progress: CircleBridgeProgress) => void,
): Promise<BridgeResult> {
  const handler = (payload: unknown) => {
    const progress = normalizeProgress(payload);
    if (progress) onProgress?.(progress);
  };

  circleAppKit.on('*', handler);
  try {
    return await circleAppKit.bridge({
      from: { adapter: input.adapter, chain: input.sourceChain },
      to: { adapter: input.adapter, chain: ARC_CIRCLE_CHAIN },
      amount: input.amount,
      token: 'USDC',
    });
  } finally {
    circleAppKit.off('*', handler);
  }
}

export async function retryBridgeUsdc(
  result: BridgeResult,
  adapter: ViemAdapter,
  onProgress?: (progress: CircleBridgeProgress) => void,
) {
  const handler = (payload: unknown) => {
    const progress = normalizeProgress(payload);
    if (progress) onProgress?.(progress);
  };

  circleAppKit.on('*', handler);
  try {
    return await circleAppKit.retryBridge(result, { from: adapter, to: adapter });
  } finally {
    circleAppKit.off('*', handler);
  }
}

export function canRetryCircleBridge(result: BridgeResult) {
  const failedStep = result.steps.find((step) => step.state === 'error');
  if (!failedStep || failedStep.errorCategory === 'user_rejected') return false;
  return !failedStep.error || isRetryableError(failedStep.error);
}

export async function sendUsdc({
  adapter,
  recipient,
  amount,
}: {
  adapter: ViemAdapter;
  recipient: `0x${string}`;
  amount: string;
}) {
  return circleAppKit.send({
    from: { adapter, chain: ARC_CIRCLE_CHAIN },
    to: recipient,
    amount,
    token: 'USDC',
  });
}
