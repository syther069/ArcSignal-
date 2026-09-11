import Link from 'next/link';
import { Activity, AlertTriangle, CheckCircle2, Database, Shield } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import { ARCSIGNAL_ABI, ARCSIGNAL_ADDRESS, CANCELLATION_REFUNDS_ENABLED, publicClient } from '@/lib/contracts';
import { getMarketIndexHealth, MARKET_INDEX_MAX_AGE_MS, MARKET_INDEX_MAX_LAG_BLOCKS } from '@/lib/indexed-markets';
import { getSql } from '@/lib/db';
import {
  ARCSIGNAL_FACTORY_V2_ABI,
  ARCSIGNAL_V2_ENABLED,
  ARCSIGNAL_V2_FACTORY_ADDRESS,
} from '@/lib/contracts-v2';

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

async function getV2DatabaseStatus() {
  const rows = await getSql()`
    select
      count(*)::int as total,
      count(*) filter (where market_state = 'OPEN')::int as open,
      count(*) filter (where market_state = 'CLOSED')::int as closed,
      count(*) filter (where market_state = 'RESOLVED')::int as resolved,
      count(*) filter (where market_state = 'VOIDED')::int as voided,
      count(*) filter (where oracle_state = 'DISPUTED')::int as disputed,
      max(updated_at) as latest_market_update
    from markets_v2
  `;
  const reconciliation = await getSql()`
    select count(*)::int as insolvent from (
      select distinct on (market_address) market_address, is_solvent
      from market_reconciliation_v2 order by market_address, checked_block desc
    ) latest where not is_solvent
  `;
  const status = rows[0];
  return {
    total: Number(status?.total ?? 0),
    open: Number(status?.open ?? 0),
    closed: Number(status?.closed ?? 0),
    resolved: Number(status?.resolved ?? 0),
    voided: Number(status?.voided ?? 0),
    disputed: Number(status?.disputed ?? 0),
    latestMarketUpdate: status?.latest_market_update ? String(status.latest_market_update) : null,
    insolvent: Number(reconciliation[0]?.insolvent ?? 0),
  };
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
  const v2Results = ARCSIGNAL_V2_ENABLED && ARCSIGNAL_V2_FACTORY_ADDRESS
    ? await Promise.allSettled([
      publicClient.readContract({
        address: ARCSIGNAL_V2_FACTORY_ADDRESS,
        abi: ARCSIGNAL_FACTORY_V2_ABI,
        functionName: 'PROTOCOL_VERSION',
      }),
      publicClient.readContract({
        address: ARCSIGNAL_V2_FACTORY_ADDRESS,
        abi: ARCSIGNAL_FACTORY_V2_ABI,
        functionName: 'globalExposurePaused',
      }),
      getV2DatabaseStatus(),
    ])
    : null;
  const v2Version = v2Results ? resultValue(v2Results[0]) : null;
  const v2Paused = v2Results ? resultValue(v2Results[1]) : null;
  const v2Database = v2Results ? resultValue(v2Results[2]) : null;
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

          <section className="space-y-4">
            <div>
              <h2 className="font-[family-name:var(--font-hanken)] text-xl font-semibold">V2 readiness</h2>
              <p className="mt-1 text-sm text-[#b0abb5]">V2 is shown only after a verified factory address and deployment block are configured.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <StatusCard
                title="V2 deployment"
                healthy={v2Version === 2n}
                value={!ARCSIGNAL_V2_ENABLED ? 'Not deployed' : v2Version === 2n ? 'Protocol version 2' : 'Unavailable'}
                detail={ARCSIGNAL_V2_FACTORY_ADDRESS ?? 'No V2 factory is active in this application.'}
                icon={<Shield size={18} />}
              />
              <StatusCard
                title="V2 solvency monitor"
                healthy={v2Database != null && Number(v2Database.insolvent ?? 0) === 0}
                value={v2Database ? `${Number(v2Database.insolvent ?? 0)} insolvent markets` : 'Inactive'}
                detail={v2Database
                  ? `${Number(v2Database.open ?? 0)} open · ${Number(v2Database.closed ?? 0)} closed · ${Number(v2Database.disputed ?? 0)} disputed · exposure ${v2Paused ? 'paused' : 'active'}`
                  : 'The V2 index and reconciliation monitor start after deployment.'}
                icon={<Database size={18} />}
              />
            </div>
          </section>

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
