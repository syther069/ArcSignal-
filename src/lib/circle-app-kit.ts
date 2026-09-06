import { BridgeKit, isRetryableError } from '@circle-fin/bridge-kit';
import type {
  BridgeEstimateResult,
  BridgeResult,
} from '@circle-fin/bridge-kit';
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
  state: BridgeResult['steps'][number]['state'];
  txHash?: string;
  explorerUrl?: string;
  errorMessage?: string;
};

// Circle Bridge Kit is stateless between calls apart from event subscriptions,
// so one shared instance is safe. Callers unsubscribe their own handlers.
export const circleBridgeKit = new BridgeKit({
  disableErrorReporting: true,
});

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

function createBridgeParams({ adapter, sourceChain, amount }: BridgeInput) {
  return {
    from: { adapter, chain: sourceChain },
    to: {
      adapter,
      chain: ARC_CIRCLE_CHAIN,
      // Arc uses USDC for gas. Forwarding lets a new Arc wallet receive its
      // first USDC without already needing USDC to submit the destination mint.
      useForwarder: true,
    },
    amount,
    token: 'USDC' as const,
  };
}

export async function estimateBridgeUsdc({
  adapter,
  sourceChain,
  amount,
}: BridgeInput): Promise<BridgeEstimateResult> {
  return circleBridgeKit.estimate(
    createBridgeParams({ adapter, sourceChain, amount }),
  );
}

export async function bridgeUsdcToArc(
  input: BridgeInput,
  onProgress?: (progress: CircleBridgeProgress) => void,
): Promise<BridgeResult> {
  const handler = (payload: unknown) => {
    const progress = normalizeProgress(payload);
    if (progress) onProgress?.(progress);
  };

  circleBridgeKit.on('*', handler);
  try {
    return await circleBridgeKit.bridge(createBridgeParams(input));
  } finally {
    circleBridgeKit.off('*', handler);
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

  circleBridgeKit.on('*', handler);
  try {
    return await circleBridgeKit.retry(result, { from: adapter, to: adapter });
  } finally {
    circleBridgeKit.off('*', handler);
  }
}

export function canRetryCircleBridge(result: BridgeResult) {
  const failedStep = result.steps.find((step) => step.state === 'error');
  if (!failedStep || failedStep.errorCategory === 'user_rejected') return false;
  return !failedStep.error || isRetryableError(failedStep.error);
}
