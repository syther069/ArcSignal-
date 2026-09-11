import { NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, type Address, type Hash } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { authorizeCronRequest } from '@/lib/cron-auth';
import { arcTestnet } from '@/lib/contracts';
import {
  ARCSIGNAL_FACTORY_V2_ABI,
  ARCSIGNAL_V2_ENABLED,
  ARCSIGNAL_V2_FACTORY_ADDRESS,
} from '@/lib/contracts-v2';
import { getSql } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const RPC_URL = process.env.ARC_RPC_URL
  ?? process.env.ARC_TESTNET_RPC_URL
  ?? process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL
  ?? 'https://rpc.testnet.arc.io';

type MaintenanceMarket = {
  market_address: string;
  market_state: 'OPEN' | 'CLOSED' | 'RESOLVED' | 'VOIDED';
  oracle_state: 'NONE' | 'REQUESTED' | 'PROPOSED' | 'DISPUTED' | 'SETTLED';
  close_time: string;
  liveness: string;
  void_after: string;
  resolution_requested_at: string | null;
};

function batches<T>(values: T[], size = 40) {
  const result: T[][] = [];
  for (let i = 0; i < values.length; i += size) result.push(values.slice(i, i + size));
  return result;
}

async function maintainV2(request: Request) {
  const authorization = authorizeCronRequest(request);
  if (!authorization.ok) return authorization.response;
  if (!ARCSIGNAL_V2_ENABLED || !ARCSIGNAL_V2_FACTORY_ADDRESS) {
    return NextResponse.json({ maintained: false, skipped: true, reason: 'ArcSignal V2 is not deployed/configured' });
  }
  if (process.env.ENABLE_V2_MAINTENANCE !== 'true') {
    return NextResponse.json({ maintained: false, skipped: true, reason: 'ENABLE_V2_MAINTENANCE is not true' });
  }
  const privateKey = process.env.RESOLVER_PRIVATE_KEY;
  if (!privateKey || !/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    return NextResponse.json({ error: 'V2 resolution operator wallet is not configured' }, { status: 503 });
  }

  try {
    const account = privateKeyToAccount(privateKey as Hash);
    const transport = http(RPC_URL, { retryCount: 2, retryDelay: 250, timeout: 8_000 });
    const publicClient = createPublicClient({ chain: arcTestnet, transport });
    const walletClient = createWalletClient({ chain: arcTestnet, transport, account });
    const role = await publicClient.readContract({
      address: ARCSIGNAL_V2_FACTORY_ADDRESS,
      abi: ARCSIGNAL_FACTORY_V2_ABI,
      functionName: 'RESOLUTION_OPERATOR_ROLE',
    });
    const authorized = await publicClient.readContract({
      address: ARCSIGNAL_V2_FACTORY_ADDRESS,
      abi: ARCSIGNAL_FACTORY_V2_ABI,
      functionName: 'hasRole',
      args: [role, account.address],
    });
    if (!authorized) return NextResponse.json({ error: 'Configured wallet lacks V2 resolution operator role' }, { status: 503 });

    const rows = await getSql()`
      select market_address, market_state, oracle_state, close_time, liveness, void_after, resolution_requested_at
      from markets_v2
      where chain_id = ${BigInt(arcTestnet.id)} and market_state in ('OPEN', 'CLOSED')
      order by close_time asc limit 240
    ` as MaintenanceMarket[];
    const now = BigInt(Math.floor(Date.now() / 1000));
    const closeCandidates: Address[] = [];
    const requestCandidates: Address[] = [];
    const settleCandidates: Address[] = [];
    const voidCandidates: Address[] = [];
    for (const row of rows) {
      const address = row.market_address as Address;
      const closeTime = BigInt(row.close_time);
      const liveness = BigInt(row.liveness);
      const voidAfter = BigInt(row.void_after);
      if (row.market_state === 'OPEN' && closeTime <= now) closeCandidates.push(address);
      if (voidAfter <= now) {
        voidCandidates.push(address);
      } else if (row.oracle_state === 'NONE' && closeTime <= now && now + liveness <= voidAfter) {
        requestCandidates.push(address);
      } else if (
        row.oracle_state !== 'NONE' && row.oracle_state !== 'SETTLED'
          && row.resolution_requested_at !== null
          && now >= BigInt(row.resolution_requested_at) + liveness
      ) {
        settleCandidates.push(address);
      }
    }

    const receipts: Array<{ action: string; hash: Hash; status: string }> = [];
    async function execute(functionName: 'batchSyncState' | 'batchRequestResolution' | 'batchSettleResolution' | 'batchVoidExpired', markets: Address[]) {
      for (const marketBatch of batches(markets)) {
        const { request: simulated } = await publicClient.simulateContract({
          account,
          address: ARCSIGNAL_V2_FACTORY_ADDRESS as Address,
          abi: ARCSIGNAL_FACTORY_V2_ABI,
          functionName,
          args: [marketBatch],
        });
        const hash = await walletClient.writeContract(simulated);
        const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 30_000 });
        receipts.push({ action: functionName, hash, status: receipt.status });
        if (receipt.status !== 'success') throw new Error(`${functionName} transaction reverted: ${hash}`);
      }
    }

    await execute('batchSyncState', closeCandidates);
    await execute('batchRequestResolution', requestCandidates);
    await execute('batchSettleResolution', settleCandidates);
    await execute('batchVoidExpired', voidCandidates);
    return NextResponse.json({
      maintained: receipts.length > 0,
      candidates: {
        close: closeCandidates.length,
        request: requestCandidates.length,
        settle: settleCandidates.length,
        void: voidCandidates.length,
      },
      receipts,
    });
  } catch (error) {
    console.error('V2 maintenance failed:', error);
    return NextResponse.json({ error: 'V2 maintenance failed', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function GET(request: Request) { return maintainV2(request); }
export async function POST(request: Request) { return maintainV2(request); }
