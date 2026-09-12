import { NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, type Address, type Hash } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { authorizeCronRequest } from '@/lib/cron-auth';
import { arcTestnet } from '@/lib/contracts';
import { USDC_ABI, USDC_ADDRESS } from '@/lib/usdc';
import { ARCSIGNAL_MARKET_V2_ABI, OUTCOME_TOKEN_V2_ABI, PREDICTION_MARKET_AMM_V2_ABI } from '@/lib/contracts-v2';
import { listPromotedExternalSettlements } from '@/lib/markets/externalSettlement';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const RPC_URL = process.env.ARC_RPC_URL
  ?? process.env.ARC_TESTNET_RPC_URL
  ?? process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL
  ?? 'https://rpc.testnet.arc.io';

function parseLimit(value: string | null) {
  const parsed = Number(value ?? 20);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 60 ? parsed : 20;
}

function parseSeedAmount(value: string | null) {
  const raw = value ?? process.env.ARCSIGNAL_V2_EXTERNAL_SEED_LIQUIDITY_USDC ?? process.env.ARCSIGNAL_V2_EXTERNAL_INITIAL_LIQUIDITY_USDC ?? '25';
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error('Invalid seed liquidity amount');
  return BigInt(Math.round(parsed * 1_000_000));
}

async function seedExternalLiquidity(request: Request) {
  const authorization = authorizeCronRequest(request);
  if (!authorization.ok) return authorization.response;

  const privateKey = process.env.RESOLVER_PRIVATE_KEY;
  if (!privateKey || !/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    return NextResponse.json({ error: 'RESOLVER_PRIVATE_KEY missing or invalid' }, { status: 503 });
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get('dryRun') === 'true';
  const requestedId = url.searchParams.get('id')?.trim();
  const seedAmount = parseSeedAmount(url.searchParams.get('amount'));
  const records = await listPromotedExternalSettlements(parseLimit(url.searchParams.get('limit')));
  const selected = requestedId
    ? records.filter((record) => record.liveMarketId === requestedId || record.arcMarketId.toLowerCase() === requestedId.toLowerCase())
    : records;

  const account = privateKeyToAccount(privateKey as Hash);
  const transport = http(RPC_URL, { retryCount: 2, retryDelay: 250, timeout: 8_000 });
  const publicClient = createPublicClient({ chain: arcTestnet, transport });
  const walletClient = createWalletClient({ chain: arcTestnet, transport, account });

  const results: Array<Record<string, unknown>> = [];
  for (const record of selected) {
    const marketAddress = record.arcMarketAddress as Address | undefined;
    const ammAddress = record.ammAddress as Address | undefined;
    if (!marketAddress || !ammAddress) {
      results.push({ id: record.liveMarketId, status: 'skipped', reason: 'missing market or AMM address' });
      continue;
    }

    try {
      const [marketState, reserves, yesToken, noToken] = await Promise.all([
        publicClient.readContract({ address: marketAddress, abi: ARCSIGNAL_MARKET_V2_ABI, functionName: 'marketState' }),
        publicClient.readContract({ address: ammAddress, abi: PREDICTION_MARKET_AMM_V2_ABI, functionName: 'reserves' }),
        publicClient.readContract({ address: marketAddress, abi: ARCSIGNAL_MARKET_V2_ABI, functionName: 'yesToken' }),
        publicClient.readContract({ address: marketAddress, abi: ARCSIGNAL_MARKET_V2_ABI, functionName: 'noToken' }),
      ]);

      if (Number(marketState) !== 0) {
        results.push({ id: record.liveMarketId, status: 'skipped', reason: 'market is not open' });
        continue;
      }
      if (reserves[0] > 0n && reserves[1] > 0n) {
        results.push({ id: record.liveMarketId, status: 'skipped', reason: 'AMM already has liquidity', yesReserve: reserves[0].toString(), noReserve: reserves[1].toString() });
        continue;
      }
      if (dryRun) {
        results.push({ id: record.liveMarketId, status: 'would-seed', amount: seedAmount.toString(), marketAddress, ammAddress });
        continue;
      }

      const [balance, allowance] = await Promise.all([
        publicClient.readContract({ address: USDC_ADDRESS, abi: USDC_ABI, functionName: 'balanceOf', args: [account.address] }),
        publicClient.readContract({ address: USDC_ADDRESS, abi: USDC_ABI, functionName: 'allowance', args: [account.address, marketAddress] }),
      ]);
      if (balance < seedAmount) throw new Error(`Operator has insufficient USDC for ${record.liveMarketId}`);

      if (allowance < seedAmount) {
        const approveHash = await walletClient.writeContract({ address: USDC_ADDRESS, abi: USDC_ABI, functionName: 'approve', args: [marketAddress, seedAmount], account, chain: arcTestnet });
        const receipt = await publicClient.waitForTransactionReceipt({ hash: approveHash, confirmations: 1, timeout: 30_000 });
        if (receipt.status !== 'success') throw new Error(`USDC approval reverted: ${approveHash}`);
      }

      const mintHash = await walletClient.writeContract({ address: marketAddress, abi: ARCSIGNAL_MARKET_V2_ABI, functionName: 'mintPositions', args: [seedAmount, account.address], account, chain: arcTestnet });
      const mintReceipt = await publicClient.waitForTransactionReceipt({ hash: mintHash, confirmations: 1, timeout: 30_000 });
      if (mintReceipt.status !== 'success') throw new Error(`Mint positions reverted: ${mintHash}`);

      for (const token of [yesToken as Address, noToken as Address]) {
        const tokenAllowance = await publicClient.readContract({ address: token, abi: OUTCOME_TOKEN_V2_ABI, functionName: 'allowance', args: [account.address, ammAddress] });
        if (tokenAllowance >= seedAmount) continue;
        const approveHash = await walletClient.writeContract({ address: token, abi: OUTCOME_TOKEN_V2_ABI, functionName: 'approve', args: [ammAddress, seedAmount], account, chain: arcTestnet });
        const receipt = await publicClient.waitForTransactionReceipt({ hash: approveHash, confirmations: 1, timeout: 30_000 });
        if (receipt.status !== 'success') throw new Error(`Outcome token approval reverted: ${approveHash}`);
      }

      const addLiquidityHash = await walletClient.writeContract({
        address: ammAddress,
        abi: PREDICTION_MARKET_AMM_V2_ABI,
        functionName: 'addLiquidity',
        args: [seedAmount, seedAmount, 1n, account.address],
        account,
        chain: arcTestnet,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: addLiquidityHash, confirmations: 1, timeout: 30_000 });
      if (receipt.status !== 'success') throw new Error(`Add liquidity reverted: ${addLiquidityHash}`);

      results.push({ id: record.liveMarketId, status: 'seeded', amount: seedAmount.toString(), marketAddress, ammAddress, transactionHash: addLiquidityHash });
    } catch (error) {
      results.push({ id: record.liveMarketId, status: 'failed', error: error instanceof Error ? error.message : String(error) });
    }
  }

  return NextResponse.json({ seeded: results.some((result) => result.status === 'seeded'), selected: selected.length, amount: seedAmount.toString(), dryRun, results });
}

export async function GET(request: Request) { return seedExternalLiquidity(request); }
export async function POST(request: Request) { return seedExternalLiquidity(request); }
