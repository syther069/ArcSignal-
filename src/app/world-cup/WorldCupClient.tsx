'use client';

import React from 'react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';

import { Market } from '@/types';

interface Fixture {
  homeTeam: string;
  awayTeam: string;
  league: string;
}

interface LiveMatch {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  minute: number;
}

interface WorldCupClientProps {
  upcomingFixtures: Fixture[];
  liveMatches: LiveMatch[];
  footballMarkets: Market[];
}

export default function WorldCupClient({ upcomingFixtures, liveMatches, footballMarkets }: WorldCupClientProps) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="lg:ml-[264px] pt-24 px-6 md:px-8 pb-16 flex-1 min-w-0">

        {/* Hero */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-4xl text-[#38bdf8]">emoji_events</span>
            <h1 className="text-4xl font-black text-white tracking-tight">FIFA WORLD CUP 2026</h1>
          </div>
          <p className="font-mono text-slate-400 text-sm max-w-xl">
            AI-powered Follow/Fade prediction markets for the 2026 World Cup. The AI generates the forecast — you decide whether to FOLLOW or FADE it.
          </p>
        </div>

        {/* Live Matches */}
        {liveMatches.length > 0 && (
          <section className="mb-10">
            <h2 className="font-mono text-xs tracking-widest text-[#38bdf8] uppercase mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-[#38bdf8] rounded-full animate-pulse inline-block" />
              LIVE NOW
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {liveMatches.map((m, i) => (
                <div key={i} className="glass-card p-5 border-[#38bdf8]/20 bg-[#38bdf8]/5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-[10px] text-[#38bdf8] tracking-widest border border-[#38bdf8]/30 px-2 py-0.5 rounded animate-pulse">LIVE {m.minute}&apos;</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-white text-sm flex-1 text-right">{m.homeTeam}</span>
                    <span className="font-mono text-2xl font-black text-white px-3">{m.homeScore} – {m.awayScore}</span>
                    <span className="font-bold text-white text-sm flex-1">{m.awayTeam}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Fixtures */}
        <section className="mb-10">
          <h2 className="font-mono text-xs tracking-widest text-slate-400 uppercase mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px]">calendar_today</span>
            UPCOMING FIXTURES
          </h2>
          {upcomingFixtures.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-600 block mb-3">sports_soccer</span>
              <p className="font-mono text-slate-500 text-sm">No upcoming fixtures available. Configure API_FOOTBALL_KEY to fetch live World Cup data.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {upcomingFixtures.map((fixture, i) => (
                <div key={i} className="glass-card p-5 hover:border-[#38bdf8]/30 transition-colors">
                  <p className="font-mono text-[10px] text-slate-500 tracking-widest mb-3 uppercase">{fixture.league}</p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-white text-sm flex-1 text-right">{fixture.homeTeam}</span>
                    <span className="font-mono text-xs text-slate-500 px-3 border border-white/10 py-1 rounded">VS</span>
                    <span className="font-bold text-white text-sm flex-1">{fixture.awayTeam}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Link
                      href="/markets?category=football"
                      className="py-2 text-center font-mono text-[10px] tracking-widest font-bold text-[#34d399] border border-[#34d399]/40 bg-[#34d399]/5 hover:bg-[#34d399]/15 transition-all rounded"
                    >
                      FOLLOW AI
                    </Link>
                    <Link
                      href="/markets?category=football"
                      className="py-2 text-center font-mono text-[10px] tracking-widest font-bold text-[#f87171] border border-[#f87171]/40 bg-transparent hover:bg-[#f87171]/10 transition-all rounded"
                    >
                      FADE AI
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Tournament Winner Markets */}
        <section className="mb-10">
          <h2 className="font-mono text-xs tracking-widest text-slate-400 uppercase mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px]">emoji_events</span>
            ACTIVE AI MARKETS
          </h2>
          {footballMarkets.length === 0 ? (
            <div className="glass-card p-6 border-white/5 bg-[#101416]/60">
              <p className="font-mono text-slate-400 text-sm text-center">
                No active football markets. Run the seed script to generate predictions.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {footballMarkets.map((market) => (
                <div key={market.id} className="glass-card p-5 border-white/5">
                  <h3 className="font-bold text-white text-lg mb-2">{market.title}</h3>
                  <p className="text-slate-400 text-sm mb-4">{market.summary}</p>
                  <div className="flex gap-4">
                    <div className="flex-1 bg-[#34d399]/10 p-3 rounded border border-[#34d399]/20">
                      <span className="text-[10px] text-[#34d399] font-mono tracking-widest uppercase block mb-1">Bull Case</span>
                      <p className="text-xs text-slate-300">{market.bull_case}</p>
                    </div>
                    <div className="flex-1 bg-[#f87171]/10 p-3 rounded border border-[#f87171]/20">
                      <span className="text-[10px] text-[#f87171] font-mono tracking-widest uppercase block mb-1">Bear Case</span>
                      <p className="text-xs text-slate-300">{market.bear_case}</p>
                    </div>
                  </div>
                  <div className="mt-4 text-center">
                    <Link href={`/market/${market.id}`} className="text-[#38bdf8] text-sm hover:underline font-mono tracking-widest">
                      VIEW MARKET &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* How It Works */}
        <section>
          <h2 className="font-mono text-xs tracking-widest text-slate-400 uppercase mb-4">HOW IT WORKS</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: 'smart_toy', title: 'AI GENERATES FORECAST', desc: 'Gemini analyzes real World Cup data — fixtures, form, standings — and produces a probability-backed prediction.' },
              { icon: 'how_to_vote', title: 'YOU FOLLOW OR FADE', desc: 'Agree with the AI? FOLLOW it. Think it\'s wrong? FADE it. Your position is staked in USDC.' },
              { icon: 'gavel', title: 'RESOLUTION BY RESULT', desc: 'When the match ends, the official result determines whether the AI was correct. FOLLOW or FADE wins accordingly.' },
            ].map((step, i) => (
              <div key={i} className="glass-card p-5 border-white/5">
                <span className="material-symbols-outlined text-3xl text-[#38bdf8] mb-3 block">{step.icon}</span>
                <h3 className="font-mono text-xs font-bold text-white tracking-widest mb-2">{step.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
