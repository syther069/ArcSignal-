import Link from 'next/link';
import Footer from '@/components/layout/Footer';
import { getPlatformStats, type PlatformStats } from '@/lib/platform-stats';

const DEFAULT_STATS: PlatformStats = {
  accuracy: null,
  accuracySampleSize: 0,
  totalVolume: 0,
  activeMarkets: 0,
  totalMarkets: 0,
  source: 'neon',
  complete: false,
};

export default async function LandingPage() {
  const stats = await getPlatformStats().catch(() => DEFAULT_STATS);

  return (
    <main className="min-h-screen bg-background pt-32 pb-16 px-6 lg:px-12 flex flex-col items-center">
      {/* Live Data Ticker Header */}
      <Link
        href="/markets"
        className="mb-8 inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-[#1c1b1b] border border-[#1e293b] hover:border-[#4fdbc8]/40 transition-all text-xs font-[family-name:var(--font-jetbrains-mono)] text-[#94a3b8] group"
      >
        <span className="flex items-center gap-1.5 text-[#4fdbc8] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4fdbc8] animate-pulse" />
          {stats.activeMarkets > 0 ? `${stats.activeMarkets} ACTIVE MARKETS` : 'LIVE PROTOCOL'}
        </span>
        <span className="text-[#334155]">•</span>
        <span>{stats.totalVolume > 0 ? `${stats.totalVolume.toLocaleString()} USDC VOLUME` : 'PARI-MUTUEL POOLS'}</span>
        <span className="text-[#334155]">•</span>
        <span className="text-[#ddb7ff] group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
          EXPLORE <span className="text-xs">→</span>
        </span>
      </Link>

      {/* Hero Header */}
      <h1 className="text-4xl md:text-6xl font-extrabold text-center text-white max-w-4xl tracking-tight leading-[1.1] mb-6">
        Bet against the machine. <span className="text-[#ddb7ff]">Or with it.</span>
      </h1>
      <p className="text-[#94a3b8] text-center max-w-2xl mb-10 text-lg leading-relaxed font-[family-name:var(--font-inter)]">
        Every market runs on an AI-generated prediction. Follow it and split the pool with everyone who agreed. Fade it and profit if the model is wrong.
      </p>

      {/* CTA Buttons - Asymmetric Weight */}
      <div className="flex flex-col sm:flex-row items-center gap-6 mb-24">
        <Link 
          href="/markets" 
          className="bg-[#ddb7ff] text-[#0f172a] font-bold text-sm tracking-wide px-8 py-3.5 rounded-xl hover:bg-[#f0dbff] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#ddb7ff]/10"
        >
          Explore Live Markets →
        </Link>
        <Link 
          href="/whitepaper"
          className="text-xs font-semibold text-[#94a3b8] hover:text-white transition-colors tracking-wide underline underline-offset-4"
        >
          or read the whitepaper →
        </Link>
      </div>

      {/* How it works Guide */}
      <div className="w-full max-w-5xl mb-32">
        <h2 className="text-3xl font-bold text-center text-on-surface mb-10">How ArcSignal Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-surface-container/50 border border-white/5 rounded-xl p-8 backdrop-blur-sm hover:border-primary/30 transition-colors">
            <div className="w-12 h-12 bg-primary/20 text-primary rounded-lg flex items-center justify-center mb-6">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-on-surface mb-3">1. AI Baseline Analysis</h3>
            <p className="text-on-surface-variant leading-relaxed">
              ArcSignal uses configured AI providers and external market-data APIs to generate a YES or NO prediction. The analysis and settlement rule are published with each testnet market.
            </p>
          </div>
          
          <div className="bg-surface-container/50 border border-white/5 rounded-xl p-8 backdrop-blur-sm hover:border-tertiary/30 transition-colors">
            <div className="w-12 h-12 bg-tertiary/20 text-tertiary rounded-lg flex items-center justify-center mb-6">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-on-surface mb-3">2. Follow or Fade</h3>
            <p className="text-on-surface-variant leading-relaxed">
              Participants interact with a streamlined pari-mutuel smart contract by staking USDC. Choose to <strong>Follow</strong> the AI&apos;s prediction if you agree, or <strong>Fade</strong> it if you have contrarian alpha. Winning pools split the total staked capital proportionally.
            </p>
          </div>
          
          <div className="bg-surface-container/50 border border-white/5 rounded-xl p-8 backdrop-blur-sm hover:border-secondary/30 transition-colors">
            <div className="w-12 h-12 bg-secondary/20 text-secondary rounded-lg flex items-center justify-center mb-6">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-on-surface mb-3">3. Transparent Resolution</h3>
            <p className="text-on-surface-variant leading-relaxed">
              When the event concludes, a server-side resolver checks the recorded external-data rule and the owner account submits the result on Arc Testnet. The owner remains a trusted settlement authority.
            </p>
          </div>

          <div className="bg-surface-container/50 border border-white/5 rounded-xl p-8 backdrop-blur-sm hover:border-[#fbbf24]/30 transition-colors">
            <div className="w-12 h-12 bg-[#fbbf24]/20 text-[#fbbf24] rounded-lg flex items-center justify-center mb-6">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-on-surface mb-3">4. Manual Claims</h3>
            <p className="text-on-surface-variant leading-relaxed">
              The smart contract calculates pari-mutuel payouts. Winning participants submit a separate claim transaction and pay its Arc network fee in native USDC.
            </p>
          </div>
        </div>
      </div>

      {/* Market Execution Protocol Section */}
      <div className="w-full max-w-5xl mb-32">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-on-surface mb-4">Market Execution Protocol</h2>
          <p className="text-on-surface-variant">Three phases of precision forecasting powered by the ArcSignal Engine.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface-container p-8 rounded-xl border border-white/5 hover:border-primary/30 transition-colors group">
            <div className="w-12 h-12 bg-surface-container-highest rounded mb-6 flex items-center justify-center text-primary group-hover:text-primary-fixed">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            </div>
            <h3 className="text-xl font-bold text-on-surface mb-4">Analyze</h3>
            <p className="text-sm text-on-surface-variant mb-8 leading-relaxed">
              Review the AI prediction, its stated confidence, data sources, and the exact rule used for settlement.
            </p>
            <Link href="/docs" className="text-xs font-bold text-on-surface-variant hover:text-primary uppercase tracking-widest flex justify-between items-center">
              View Engine Docs <span>→</span>
            </Link>
          </div>

          <div className="bg-surface-container p-8 rounded-xl border border-white/5 hover:border-tertiary/30 transition-colors group">
            <div className="w-12 h-12 bg-surface-container-highest rounded mb-6 flex items-center justify-center text-tertiary group-hover:text-tertiary-fixed">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <h3 className="text-xl font-bold text-on-surface mb-4">Stake</h3>
            <p className="text-sm text-on-surface-variant mb-8 leading-relaxed">
              Stake testnet USDC into Follow or Fade pools. Pool shares and potential payouts change as later stakes arrive.
            </p>
            <Link href="/docs" className="text-xs font-bold text-tertiary hover:text-tertiary-fixed uppercase tracking-widest flex justify-between items-center">
              Staking Rewards <span>→</span>
            </Link>
          </div>

          <div className="bg-surface-container p-8 rounded-xl border border-white/5 hover:border-primary/30 transition-colors group">
            <div className="w-12 h-12 bg-surface-container-highest rounded mb-6 flex items-center justify-center text-on-surface group-hover:text-primary">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-on-surface mb-4">Prevail</h3>
            <p className="text-sm text-on-surface-variant mb-8 leading-relaxed">
              After the owner submits an outcome, winning participants can verify it on-chain and claim their payout from the contract.
            </p>
            <Link href="/leaderboard" className="text-xs font-bold text-on-surface-variant hover:text-primary uppercase tracking-widest flex justify-between items-center">
              Leaderboard <span>→</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Analytics Section */}
      <div className="w-full max-w-5xl mb-32 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-3xl font-bold text-on-surface mb-6">On-chain Testnet Analytics</h2>
          <p className="text-on-surface-variant mb-10 leading-relaxed">
            These figures are calculated from the currently available ArcSignal market history. Accuracy is withheld when no resolved sample is available.
          </p>
          
          <div className="grid grid-cols-2 gap-y-10">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Platform Accuracy</p>
              <p className="text-4xl font-mono text-tertiary font-bold mb-2">{stats.accuracy === null ? '—' : `${stats.accuracy.toFixed(1)}%`}</p>
              <div className="h-1 bg-tertiary/20 w-3/4 rounded overflow-hidden">
                <div className="h-full bg-tertiary transition-all duration-1000" style={{ width: `${stats.accuracy ?? 0}%` }}></div>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Total Volume</p>
              <p className="text-4xl font-mono text-primary font-bold mb-2">
                {stats.totalVolume > 0 ? `${stats.totalVolume.toLocaleString(undefined, {maximumFractionDigits: 0})} USDC` : '0 USDC'}
              </p>
              <div className="h-1 bg-primary/20 w-3/4 rounded overflow-hidden">
                <div className="h-full bg-primary w-full"></div>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Total Markets</p>
              <p className="text-4xl font-mono text-on-surface font-bold">{stats.totalMarkets}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Active Markets</p>
              <p className="text-4xl font-mono text-on-surface font-bold">{stats.activeMarkets}</p>
            </div>
          </div>
        </div>

        {/* Performance Matrix Chart */}
        <div className="bg-surface-container rounded-xl border border-white/5 p-6 top-lit-border shadow-2xl">
          <div className="flex justify-between items-center mb-8">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Data status</h4>
            <div className="flex gap-2">
              <div className="w-2 h-2 rounded-full bg-tertiary"></div>
              <div className="w-2 h-2 rounded-full bg-primary"></div>
            </div>
          </div>
          <div className="space-y-4 border-b border-white/10 pb-6 mb-4 text-sm text-on-surface-variant">
            <div className="flex justify-between gap-4"><span>Source</span><strong className="text-on-surface">{stats.source === 'arc-chain' ? 'Arc chain' : 'Indexed Arc events'}</strong></div>
            <div className="flex justify-between gap-4"><span>Coverage</span><strong className="text-on-surface">{stats.complete ? 'Complete query window' : 'Partial or unavailable'}</strong></div>
            <div className="flex justify-between gap-4"><span>Accuracy sample</span><strong className="text-on-surface">{stats.accuracySampleSize} resolved market{stats.accuracySampleSize === 1 ? '' : 's'}</strong></div>
          </div>
        </div>
      </div>

      {/* CTA Footer Section */}
      <div className="w-full max-w-5xl bg-gradient-to-b from-surface-container to-background border border-white/5 rounded-2xl p-16 text-center shadow-2xl top-lit-border mb-16">
        <h2 className="text-4xl font-bold text-on-surface mb-6">Ready to command the future?</h2>
        <p className="text-on-surface-variant max-w-lg mx-auto mb-10">
          Explore experimental AI-generated markets on Arc Testnet. Contracts are unaudited and settlement is owner-controlled.
        </p>
        <Link 
          href="/markets"
          className="inline-block bg-primary text-background font-bold text-sm uppercase tracking-widest px-10 py-4 rounded hover:bg-primary-fixed transition-colors shadow-[0_0_20px_rgba(192,193,255,0.3)]"
        >
          Enter the Ecosystem
        </Link>
      </div>

      <Footer />
    </main>
  );
}
