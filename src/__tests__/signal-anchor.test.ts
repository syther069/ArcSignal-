import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildTree, leafFor, proofFor, rootOf, verifyProof } from '@/lib/signal-intelligence/merkle';
import { anchorVerifies } from '@/components/signals/SignalIntelligence';

const hash = (n: number) => n.toString(16).padStart(64, '0');

describe('signal Merkle tree', () => {
  it('a single leaf is its own root with an empty proof', () => {
    const levels = buildTree([leafFor(hash(1))]);
    expect(rootOf(levels)).toBe(leafFor(hash(1)));
    expect(proofFor(levels, 0)).toEqual([]);
  });
  it('every leaf proves against the root, including an odd count', () => {
    for (const count of [2, 3, 5, 8]) {
      const leaves = Array.from({ length: count }, (_, i) => leafFor(hash(i + 1)));
      const levels = buildTree(leaves);
      leaves.forEach((leaf, i) => expect(verifyProof(leaf, proofFor(levels, i), rootOf(levels))).toBe(true));
    }
  });
  it('a different hash or a tampered proof fails', () => {
    const levels = buildTree([1, 2, 3].map((n) => leafFor(hash(n))));
    const root = rootOf(levels);
    expect(verifyProof(leafFor(hash(9)), proofFor(levels, 0), root)).toBe(false);
    const proof = proofFor(levels, 0);
    proof[0] = leafFor(hash(9));
    expect(verifyProof(leafFor(hash(1)), proof, root)).toBe(false);
  });
  it('rejects malformed analysis hashes', () => {
    expect(() => leafFor('xyz')).toThrow();
  });
  it('the UI check also requires the anchor to be for this exact record', () => {
    const levels = buildTree([1, 2].map((n) => leafFor(hash(n))));
    const anchor = { signalId: 's1', analysisHash: hash(1), leafIndex: 0, proof: proofFor(levels, 0), merkleRoot: rootOf(levels),
      txHash: '0x1' as const, blockNumber: 1, chainId: 5042, contractAddress: '0x0', anchoredAt: new Date(0).toISOString() };
    expect(anchorVerifies({ analysisHash: hash(1) }, anchor)).toBe(true);
    expect(anchorVerifies({ analysisHash: hash(2) }, anchor)).toBe(false);
  });
});

const m = vi.hoisted(() => ({
  getUnanchoredSignals: vi.fn(), storeAnchorBatch: vi.fn(),
  readContract: vi.fn(), simulateContract: vi.fn(), waitForTransactionReceipt: vi.fn(), getContractEvents: vi.fn(), writeContract: vi.fn(),
}));
vi.mock('@/lib/signal-intelligence/anchors', () => ({ getUnanchoredSignals: m.getUnanchoredSignals, getUnanchoredNotes: async () => [], storeAnchorBatch: m.storeAnchorBatch }));
vi.mock('viem', async (orig) => ({
  ...(await orig<typeof import('viem')>()),
  createPublicClient: () => ({ readContract: m.readContract, simulateContract: m.simulateContract, waitForTransactionReceipt: m.waitForTransactionReceipt, getContractEvents: m.getContractEvents }),
  createWalletClient: () => ({ writeContract: m.writeContract }),
}));

const KEY = `0x${'1'.repeat(64)}`;
const ANCHORER = '0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A'; // address of KEY
const call = async () => {
  const { POST } = await import('@/app/api/cron/anchor-signals/route');
  return POST(new Request('http://localhost/api/cron/anchor-signals', { method: 'POST', headers: { authorization: 'Bearer test-secret' } }));
};

describe('anchor-signals cron', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('CRON_SECRET', 'test-secret');
    vi.stubEnv('ENABLE_SIGNAL_ANCHORING', 'true');
    vi.stubEnv('SIGNAL_ANCHOR_ADDRESS', `0x${'2'.repeat(40)}`);
    vi.stubEnv('ANCHOR_PRIVATE_KEY', KEY);
    m.readContract.mockImplementation(async ({ functionName }: { functionName: string }) => functionName === 'anchorer' ? ANCHORER : 0n);
    m.simulateContract.mockResolvedValue({ request: {} });
    m.writeContract.mockResolvedValue('0xabc');
  });

  it('does nothing when disabled', async () => {
    vi.stubEnv('ENABLE_SIGNAL_ANCHORING', 'false');
    expect((await (await call()).json()).skipped).toBe(true);
    expect(m.getUnanchoredSignals).not.toHaveBeenCalled();
  });

  it('anchors only unanchored signals and stores the batch after a successful receipt', async () => {
    m.getUnanchoredSignals.mockResolvedValue([{ id: 'a', analysisHash: hash(1) }, { id: 'b', analysisHash: hash(2) }]);
    m.waitForTransactionReceipt.mockResolvedValue({ status: 'success', blockNumber: 77n });
    const body = await (await call()).json();
    expect(body).toMatchObject({ anchored: true, signals: 2, txHash: '0xabc' });
    const stored = m.storeAnchorBatch.mock.calls[0][0];
    expect(stored.leaves.map((l: { signalId: string }) => l.signalId)).toEqual(['a', 'b']);
    expect(stored.blockNumber).toBe(77n);
  });

  it('writes no rows when the transaction reverts', async () => {
    m.getUnanchoredSignals.mockResolvedValue([{ id: 'a', analysisHash: hash(1) }]);
    m.waitForTransactionReceipt.mockResolvedValue({ status: 'reverted', blockNumber: 1n });
    const response = await call();
    expect(response.status).toBe(500);
    expect(m.storeAnchorBatch).not.toHaveBeenCalled();
  });

  it('refuses a key that is not the contract anchorer', async () => {
    m.getUnanchoredSignals.mockResolvedValue([{ id: 'a', analysisHash: hash(1) }]);
    m.readContract.mockResolvedValue(`0x${'3'.repeat(40)}`);
    expect((await call()).status).toBe(503);
    expect(m.writeContract).not.toHaveBeenCalled();
  });
});
