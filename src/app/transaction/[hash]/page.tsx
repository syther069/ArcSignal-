import Link from 'next/link';
import { ARCSIGNAL_ADDRESS, publicClient } from '@/lib/contracts';

export const dynamic = 'force-dynamic';

export default async function TransactionPage({
  params,
}: {
  params: Promise<{ hash: string }>;
}) {
  const { hash } = await params;
  const validHash = /^0x[a-fA-F0-9]{64}$/.test(hash);
  const receipt = validHash
    ? await publicClient.getTransactionReceipt({ hash: hash as `0x${string}` }).catch(() => null)
    : null;
  const isArcSignal = receipt?.to?.toLowerCase() === ARCSIGNAL_ADDRESS.toLowerCase();
  const successful = receipt?.status === 'success';

  return (
    <main className="min-h-screen bg-[#121212] px-6 py-24 text-[#e5e2e1]">
      <section className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-[#1c1b1b] p-6 md:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#ddb7ff]">ARC RPC verification</p>
        <h1 className="mt-3 text-2xl font-bold">Transaction receipt</h1>
        {!validHash ? (
          <p className="mt-5 rounded-xl border border-red-400/30 bg-red-400/5 p-4 text-red-200">Invalid transaction hash.</p>
        ) : !receipt ? (
          <div className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 text-amber-200">
            Receipt not available from ARC RPC yet. Wait a few seconds and refresh.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className={`rounded-xl border p-4 ${successful && isArcSignal ? 'border-emerald-400/30 bg-emerald-400/5 text-emerald-200' : 'border-red-400/30 bg-red-400/5 text-red-200'}`}>
              {successful && isArcSignal
                ? 'Confirmed successfully on the ArcSignal contract'
                : successful
                  ? 'Confirmed, but not sent to the ArcSignal contract'
                  : 'Transaction reverted on-chain'}
            </div>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="text-slate-400">Network</dt><dd className="mt-1 font-mono">ARC Testnet · 5042002</dd></div>
              <div><dt className="text-slate-400">Block</dt><dd className="mt-1 font-mono">{receipt.blockNumber.toString()}</dd></div>
              <div><dt className="text-slate-400">Status</dt><dd className="mt-1 font-mono uppercase">{receipt.status}</dd></div>
              <div><dt className="text-slate-400">Contract</dt><dd className="mt-1 font-mono">{isArcSignal ? 'ArcSignal verified' : 'Other address'}</dd></div>
            </dl>
          </div>
        )}
        <div className="mt-6 break-all rounded-xl bg-black/30 p-4 font-mono text-xs text-slate-300">{hash}</div>
        <div className="mt-6 flex gap-3">
          <Link href="/portfolio" className="rounded-lg bg-[#ddb7ff] px-4 py-2 text-sm font-bold text-black">Open portfolio</Link>
          <Link href={`/transaction/${hash}`} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300">Refresh receipt</Link>
        </div>
      </section>
    </main>
  );
}