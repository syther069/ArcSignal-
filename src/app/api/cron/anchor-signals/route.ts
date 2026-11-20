import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, type Address, type Hash, type Hex } from 'viem';
import { SIGNAL_ANCHOR_ABI } from '@/lib/signal-intelligence/anchor-abi';
import { privateKeyToAccount } from 'viem/accounts';
import { authorizeCronRequest } from '@/lib/cron-auth';
import { arcTestnet } from '@/lib/contracts';
import { resolveArcRpcUrl } from '@/lib/arc-network';
import { getUnanchoredNotes, getUnanchoredSignals, storeAnchorBatch } from '@/lib/signal-intelligence/anchors';
import { buildTree, leafFor, proofFor, rootOf } from '@/lib/signal-intelligence/merkle';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

async function anchorSignals(request: Request) {
  const authorization = authorizeCronRequest(request);
  if (!authorization.ok) return authorization.response;
  if (process.env.ENABLE_SIGNAL_ANCHORING !== 'true') {
    return NextResponse.json({ anchored: false, skipped: true, reason: 'ENABLE_SIGNAL_ANCHORING is not true' });
  }
  const contract = process.env.SIGNAL_ANCHOR_ADDRESS;
  const privateKey = process.env.ANCHOR_PRIVATE_KEY;
  if (!contract || !/^0x[0-9a-fA-F]{40}$/.test(contract) || !privateKey || !/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    return NextResponse.json({ error: 'Signal anchoring contract or key is not configured' }, { status: 503 });
  }

  try {
    // Forecasts first, then price-move notes, within one batch of at most 500 leaves.
    const signalCandidates = await getUnanchoredSignals(500);
    const candidates = [...signalCandidates, ...(await getUnanchoredNotes(500 - signalCandidates.length || 1))].slice(0, 500);
    if (candidates.length === 0) return NextResponse.json({ anchored: false, pending: 0 });

    const account = privateKeyToAccount(privateKey as Hash);
    const transport = http(resolveArcRpcUrl(), { retryCount: 2, retryDelay: 250, timeout: 8_000 });
    const publicClient = createPublicClient({ chain: arcTestnet, transport });
    const walletClient = createWalletClient({ chain: arcTestnet, transport, account });
    const address = contract as Address;

    const anchorer = await publicClient.readContract({ address, abi: SIGNAL_ANCHOR_ABI, functionName: 'anchorer' });
    if (anchorer.toLowerCase() !== account.address.toLowerCase()) {
      return NextResponse.json({ error: 'Configured key is not the SignalAnchor anchorer' }, { status: 503 });
    }

    const levels = buildTree(candidates.map((c) => leafFor(c.analysisHash)));
    const root = rootOf(levels);
    const leaves = candidates.map((c, i) => ({ signalId: c.id, leafIndex: i, proof: proofFor(levels, i), kind: c.kind }));
    const batchId = randomUUID();

    let txHash: Hex;
    let blockNumber: bigint;
    // If a previous run anchored this exact root but failed to save it, recover from the event
    // instead of sending again (the contract rejects duplicate roots).
    const already = await publicClient.readContract({ address, abi: SIGNAL_ANCHOR_ABI, functionName: 'anchoredAt', args: [root] });
    if (already > 0n) {
      const [event] = await publicClient.getContractEvents({
        address, abi: SIGNAL_ANCHOR_ABI, eventName: 'SignalBatchAnchored', args: { root }, fromBlock: 'earliest',
      });
      if (!event?.transactionHash || event.blockNumber === null) throw new Error(`Root ${root} is anchored but its event was not found`);
      txHash = event.transactionHash;
      blockNumber = event.blockNumber;
    } else {
      const batchIdBytes = `0x${batchId.replace(/-/g, '').padEnd(64, '0')}` as Hex;
      const { request: simulated } = await publicClient.simulateContract({
        account, address, abi: SIGNAL_ANCHOR_ABI, functionName: 'anchor', args: [root, candidates.length, batchIdBytes],
      });
      txHash = await walletClient.writeContract(simulated);
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 1, timeout: 30_000 });
      if (receipt.status !== 'success') throw new Error(`Anchor transaction reverted: ${txHash}`);
      blockNumber = receipt.blockNumber;
    }

    await storeAnchorBatch({ id: batchId, merkleRoot: root, txHash, blockNumber, chainId: arcTestnet.id, contractAddress: address, leaves });
    return NextResponse.json({ anchored: true, signals: candidates.length, root, txHash, blockNumber: blockNumber.toString() });
  } catch (error) {
    console.error('Signal anchoring failed:', error);
    return NextResponse.json({ error: 'Signal anchoring failed', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function GET(request: Request) { return anchorSignals(request); }
export async function POST(request: Request) { return anchorSignals(request); }
