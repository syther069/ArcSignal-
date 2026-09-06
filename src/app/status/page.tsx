import Link from 'next/link';
import { Activity, AlertTriangle, CheckCircle2, Database, Shield } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import { ARCSIGNAL_ABI, ARCSIGNAL_ADDRESS, CANCELLATION_REFUNDS_ENABLED, publicClient } from '@/lib/contracts';
import { getMarketIndexHealth, MARKET_INDEX_MAX_AGE_MS, MARKET_INDEX_MAX_LAG_BLOCKS } from '@/lib/indexed-markets';
import { getSql } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function getDatabaseStatus() {
  const sql = getSql();
  const rows = await sql`
    select
      count(*) filter (where not resolved)::int as unresolved,
      count(*) filter (where not resolved and resolution_time <= extract(epoch from now()))::int as due,
      count(*) filter (where resolved)::int as resolved,
      max(updated_at) as latest_market_update
    from markets_index
  `;
  return rows[0];
}

function resultValue<T>(result: PromiseSettledResult<T>): T | null {
  return result.status === 'fulfilled' ? result.value : null;
}

export default async function StatusPage() {
  const [blockResult, ownerResult, pausedResult, healthResult, databaseResult] = await Promise.allSettled([
    publicClient.getBlockNumber(),
    publicClient.readContract({ address: ARCSIGNAL_ADDRESS, abi: ARCSIGNAL_ABI, functionName: 'owner' }),
    publicClient.readContract({ address: ARCSIGNAL_ADDRESS, abi: ARCSIGNAL_ABI, functionName: 'paused' }),
    getMarketIndexHealth(),
    getDatabaseStatus(),
  ]);

  const head = resultValue(blockResult);
  const owner = resultValue(ownerResult);
  const paused = resultValue(pausedResult);
  const health = resultValue(healthResult);
  const database = resultValue(databaseResult);
  const lag = head != null && health ? head - health.lastBlock : null;
  const indexAgeMs = health ? Date.now() - health.updatedAtMs : null;
  const indexHealthy = lag != null && lag >= 0n && lag <= MARKET_INDEX_MAX_LAG_BLOCKS && indexAgeMs != null && indexAgeMs <= MARKET_INDEX_MAX_AGE_MS;

  return (
    <div className="flex min-h-screen bg-[#131313] text-[#f1eef4]">
      <Sidebar />
      <main className="lg:ml-[264px] pt-24 pb-20 flex-1 min-w-0">
        <div className="max-w-5xl mx-auto px-4 md:px-8 space-y-8">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-[#ddb7ff]">Public operational view</p>
            <h1 className="mt-2 font-[family-name:var(--font-hanken)] text-3xl font-semibold">System status</h1>
            <p className="mt-2 text-sm text-[#b0abb5]">Live chain and index signals for the configured ARC Testnet deployment. This page does not prove oracle correctness or contract safety.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <StatusCard
              title="ARC RPC"
              healthy={head != null}
              value={head == null ? 'Unavailable' : `Block ${head.toLocaleString()}`}
              detail="Latest block returned by the configured server RPC."
              icon={<Activity size={18} />}
            />
            <StatusCard
              title="Market index"
              healthy={indexHealthy}
              value={health ? `${lag?.toString() ?? 'Unknown'} blocks behind` : 'Unavailable'}
              detail={health ? `Last update ${new Date(health.updatedAtMs).toLocaleString()}` : 'No index health record was returned.'}
              icon={<Database size={18} />}
            />
            <StatusCard
              title="Configured contract"
              healthy={owner != null}
              value={paused === true ? 'Paused' : paused === false ? 'Active' : 'Legacy pause status unavailable'}
              detail={`Address ${ARCSIGNAL_ADDRESS}`}
              icon={<Shield size={18} />}
            />
            <StatusCard
              title="Resolution queue"
              healthy={database != null && Number(database.due ?? 0) === 0}
              value={database ? `${Number(database.due ?? 0)} overdue unresolved` : 'Unavailable'}
              detail={database ? `${Number(database.unresolved ?? 0)} unresolved · ${Number(database.resolved ?? 0)} resolved in the index` : 'Database status could not be read.'}
              icon={<AlertTriangle size={18} />}
            />
          </div>

          <section className="rounded-xl border border-[#403947] bg-[#1c1b1b] p-5 space-y-3">
            <h2 className="font-[family-name:var(--font-hanken)] text-lg font-semibold">Deployment facts</h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-[#b0abb5]">Contract owner</dt><dd className="mt-1 font-mono text-xs break-all">{owner ? String(owner) : 'Unavailable'}</dd></div>
              <div><dt className="text-[#b0abb5]">Cancellation refunds</dt><dd className="mt-1">{CANCELLATION_REFUNDS_ENABLED ? 'Enabled for the configured revision' : 'Disabled for the legacy deployment'}</dd></div>
            </dl>
            <Link href="/docs/security-and-risks" className="inline-flex min-h-[44px] items-center text-sm text-[#ddb7ff] hover:text-white">Read security and trust assumptions →</Link>
          </section>
        </div>
      </main>
    </div>
  );
}

function StatusCard({ title, healthy, value, detail, icon }: { title: string; healthy: boolean; value: string; detail: string; icon: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#403947] bg-[#1c1b1b] p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[#ddb7ff]">{icon}<h2 className="font-mono text-xs uppercase tracking-widest">{title}</h2></div>
        {healthy ? <CheckCircle2 size={17} className="text-[#4fdbc8]" /> : <AlertTriangle size={17} className="text-[#f2c66d]" />}
      </div>
      <p className="mt-4 font-[family-name:var(--font-hanken)] text-xl font-semibold">{value}</p>
      <p className="mt-2 text-xs leading-5 text-[#b0abb5] break-words">{detail}</p>
    </section>
  );
}
