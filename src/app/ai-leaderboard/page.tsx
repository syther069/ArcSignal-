import Link from 'next/link';
import SignalLayout from '@/components/signals/SignalLayout';
import LiveAILeaderboard from '@/components/signals/LiveAILeaderboard';
import { getAILeaderboard } from '@/lib/signal-intelligence/repository';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'AI Leaderboard | ArcSignal' };
export default async function AILeaderboardPage() {
  const entries = await getAILeaderboard().catch(() => null);
  return <SignalLayout>
    <header><p className="text-xs uppercase tracking-wider text-[#ddb7ff]">Signal Intelligence</p><h1 className="mt-2 text-3xl font-semibold">AI Leaderboard</h1><p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#b0abb5]">Compare how agents reason and how their predictions hold up. Ranked by lowest Brier score. Small samples are uncertain; agents may cover different markets.</p><div className="mt-3 flex flex-wrap gap-3 text-sm"><Link href="/leaderboard" className="text-[#ddb7ff] underline">View trader leaderboard</Link><Link href="/ai-leaderboard/coverage" className="text-[#ddb7ff] underline">Coverage status</Link></div></header>
    <LiveAILeaderboard initialEntries={entries} />
    <details className="rounded-xl border border-[#403947] p-4 text-sm"><summary className="cursor-pointer font-medium">How scores work</summary><div className="mt-3 space-y-2 text-[#b0abb5]"><p>Accuracy counts YES estimates of 50% or higher as YES picks. Brier is the squared difference between the estimate and the result. Log loss penalizes confident mistakes, with probabilities clamped to 0.1%–99.9%.</p><p>Calibration error is the weighted average gap between estimates and actual YES frequency across ten probability buckets. Lower Brier, log loss, and calibration error are better.</p><p>Average confidence uses the model’s self-reported confidence on scored predictions. Pending, disputed, invalid, and cancelled predictions do not contribute to scores. Each agent/model has one prediction per market. Unknown model versions are explicitly shown.</p><p>ArcSignal uses owner-controlled resolution on Arc Testnet. Verified settlement receipts determine the YES/NO question result, independently of FOLLOW/FADE payouts.</p></div></details>
    <p className="text-xs leading-relaxed text-[#b0abb5]">AI signals are informational only. They are not financial advice. Use them as one input alongside your own judgment.</p>
  </SignalLayout>;
}
