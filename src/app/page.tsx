'use client';

import React from 'react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background pt-32 pb-16 px-6 lg:px-12 flex flex-col items-center">
      {/* Network Status Badge */}
      <div className="mb-10 inline-flex items-center gap-2 bg-surface-container-highest px-3 py-1 rounded-full border border-white/5">
        <div className="w-2 h-2 rounded-full bg-tertiary"></div>
        <span className="text-[10px] font-mono font-bold text-tertiary uppercase tracking-widest">Network Status: Live</span>
      </div>

      {/* Hero Header */}
      <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-center text-on-surface max-w-4xl tracking-tight leading-tight mb-6">
        Professional Intelligence for <span className="text-primary">Predictive Markets</span>
      </h1>
      <p className="text-on-surface-variant text-center max-w-2xl mb-12 text-lg">
        Leverage decentralized AI clusters to forecast high-stakes outcomes with unprecedented precision and institutional-grade security.
      </p>

      {/* CTA Buttons */}
      <div className="flex items-center gap-4 mb-24">
        <Link 
          href="/dashboard" 
          className="bg-primary text-background font-bold text-sm uppercase tracking-widest px-8 py-3 rounded hover:bg-primary-fixed transition-colors"
        >
          Launch App
        </Link>
        <button 
          className="bg-surface-container-highest text-on-surface font-bold text-sm uppercase tracking-widest px-8 py-3 rounded border border-white/5 hover:bg-surface-bright transition-colors"
        >
          Read Whitepaper
        </button>
      </div>

      {/* Hero Graphic / Dashboard Preview Placeholder */}
      <div className="w-full max-w-5xl h-[400px] glass-card rounded-xl mb-32 relative overflow-hidden flex items-center justify-center top-lit-border">
        {/* Decorative Wave/Mesh */}
        <div className="absolute inset-0 mesh-gradient opacity-50"></div>
        <div className="absolute inset-0 network-mesh opacity-20"></div>
        
        {/* Placeholder Sine Wave Graphic */}
        <svg className="absolute w-full h-full opacity-30" viewBox="0 0 1000 400" preserveAspectRatio="none">
          <path d="M0,200 C200,300 300,50 500,200 C700,350 800,100 1000,200 L1000,400 L0,400 Z" fill="rgba(225, 224, 255, 0.05)" />
          <path d="M0,200 C200,300 300,50 500,200 C700,350 800,100 1000,200" fill="none" stroke="#e1e0ff" strokeWidth="2" />
          <path d="M0,220 C150,350 350,20 500,220 C650,400 850,50 1000,220" fill="none" stroke="#4edea3" strokeWidth="1" strokeOpacity="0.5" />
        </svg>

        {/* Mock UI Elements */}
        <div className="absolute right-8 top-8 bottom-8 w-64 bg-surface-container/50 border border-white/5 rounded backdrop-blur-md hidden md:flex flex-col gap-4 p-4">
          <div className="h-2 w-1/3 bg-on-surface-variant/30 rounded"></div>
          <div className="h-16 w-full bg-surface-container-highest/50 rounded"></div>
          <div className="h-16 w-full bg-surface-container-highest/50 rounded"></div>
          <div className="h-2 w-1/4 bg-on-surface-variant/30 rounded mt-4"></div>
          <div className="h-16 w-full bg-surface-container-highest/50 rounded"></div>
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
              Access deep-tech data streams and AI-aggregated sentiment analysis. Our engine processes petabytes of historical data to highlight statistically significant market anomalies.
            </p>
            <Link href="/docs/engine" className="text-xs font-bold text-on-surface-variant hover:text-primary uppercase tracking-widest flex justify-between items-center">
              View Engine Docs <span>→</span>
            </Link>
          </div>

          <div className="bg-surface-container p-8 rounded-xl border border-white/5 hover:border-tertiary/30 transition-colors group">
            <div className="w-12 h-12 bg-surface-container-highest rounded mb-6 flex items-center justify-center text-tertiary group-hover:text-tertiary-fixed">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <h3 className="text-xl font-bold text-on-surface mb-4">Stake</h3>
            <p className="text-sm text-on-surface-variant mb-8 leading-relaxed">
              Deploy capital into high-conviction pools with automated risk mitigation. Our smart contracts ensure transparent settlement and non-custodial asset management.
            </p>
            <Link href="/docs/staking" className="text-xs font-bold text-tertiary hover:text-tertiary-fixed uppercase tracking-widest flex justify-between items-center">
              Staking Rewards <span>→</span>
            </Link>
          </div>

          <div className="bg-surface-container p-8 rounded-xl border border-white/5 hover:border-primary/30 transition-colors group">
            <div className="w-12 h-12 bg-surface-container-highest rounded mb-6 flex items-center justify-center text-on-surface group-hover:text-primary">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-on-surface mb-4">Prevail</h3>
            <p className="text-sm text-on-surface-variant mb-8 leading-relaxed">
              Realize gains through our unique Oracle-as-a-Service architecture. Results are verified by decentralized consensus nodes within milliseconds of event resolution.
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
          <h2 className="text-3xl font-bold text-on-surface mb-6">Proven Precision Analytics</h2>
          <p className="text-on-surface-variant mb-10 leading-relaxed">
            ArcSignal outperforms traditional prediction models by leveraging a globally distributed AI network that filters signal from noise in real-time.
          </p>
          
          <div className="grid grid-cols-2 gap-y-10">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Platform Accuracy</p>
              <p className="text-4xl font-mono text-tertiary font-bold mb-2">94.2%</p>
              <div className="h-1 bg-tertiary/20 w-3/4 rounded overflow-hidden">
                <div className="h-full bg-tertiary w-[94.2%]"></div>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Total Volume</p>
              <p className="text-4xl font-mono text-primary font-bold mb-2">$1.82B</p>
              <div className="h-1 bg-primary/20 w-3/4 rounded overflow-hidden">
                <div className="h-full bg-primary w-full"></div>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Active Nodes</p>
              <p className="text-4xl font-mono text-on-surface font-bold">12,401</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Settlement Time</p>
              <p className="text-4xl font-mono text-on-surface font-bold">1.2s</p>
            </div>
          </div>
        </div>

        {/* Performance Matrix Chart */}
        <div className="bg-surface-container rounded-xl border border-white/5 p-6 top-lit-border shadow-2xl">
          <div className="flex justify-between items-center mb-8">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Performance Matrix</h4>
            <div className="flex gap-2">
              <div className="w-2 h-2 rounded-full bg-tertiary"></div>
              <div className="w-2 h-2 rounded-full bg-primary"></div>
            </div>
          </div>
          <div className="h-48 flex items-end justify-between gap-2 border-b border-white/10 pb-2 mb-2">
            {[30, 45, 40, 60, 50, 75, 55, 80, 50].map((h, i) => (
              <div key={i} className={`w-full rounded-t-sm ${i % 2 === 0 ? 'bg-surface-container-highest' : 'bg-tertiary/60'}`} style={{ height: `${h}%` }}></div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-on-surface-variant font-mono">
            <span>JAN</span>
            <span>MAR</span>
            <span>MAY</span>
            <span>JUL</span>
            <span>SEP</span>
            <span>NOV</span>
          </div>
        </div>
      </div>

      {/* CTA Footer Section */}
      <div className="w-full max-w-5xl bg-gradient-to-b from-surface-container to-background border border-white/5 rounded-2xl p-16 text-center shadow-2xl top-lit-border mb-16">
        <h2 className="text-4xl font-bold text-on-surface mb-6">Ready to command the future?</h2>
        <p className="text-on-surface-variant max-w-lg mx-auto mb-10">
          Join 25,000+ analysts and engineers utilizing ArcSignal for institutional-grade prediction markets.
        </p>
        <Link 
          href="/dashboard"
          className="inline-block bg-primary text-background font-bold text-sm uppercase tracking-widest px-10 py-4 rounded hover:bg-primary-fixed transition-colors shadow-[0_0_20px_rgba(192,193,255,0.3)]"
        >
          Enter the Ecosystem
        </Link>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-[1440px] border-t border-white/10 pt-8 pb-12 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-sm text-on-surface-variant max-w-xs">
          <p className="font-bold text-on-surface mb-2">ArcSignal</p>
          <p>The next-generation protocol for high-precision decentralized forecasting and AI analytics.</p>
        </div>
        
        <div className="flex gap-8 text-sm text-on-surface-variant">
          <Link href="#" className="hover:text-on-surface transition-colors">Terms of Service</Link>
          <Link href="#" className="hover:text-on-surface transition-colors">Privacy Policy</Link>
          <Link href="#" className="hover:text-on-surface transition-colors">Technical Whitepaper</Link>
          <Link href="#" className="hover:text-on-surface transition-colors">API Docs</Link>
          <Link href="#" className="hover:text-on-surface transition-colors">Status</Link>
        </div>

        <div className="text-xs text-on-surface-variant flex flex-col items-end">
          <div className="flex gap-4 mb-2">
            <svg className="w-4 h-4 hover:text-on-surface cursor-pointer" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12c0 5.523 4.477 10 10 10s10-4.477 10-10c0-5.523-4.477-10-10-10zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"/><path d="M12 4.168A7.834 7.834 0 0 0 4.168 12 7.834 7.834 0 0 0 12 19.832 7.834 7.834 0 0 0 19.832 12 7.834 7.834 0 0 0 12 4.168zm0 14c-3.4 0-6.168-2.768-6.168-6.168S8.6 5.832 12 5.832s6.168 2.768 6.168 6.168S15.4 18.168 12 18.168z"/></svg>
            <svg className="w-4 h-4 hover:text-on-surface cursor-pointer" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4.236l-8 4.882-8-4.882V6l8 4.882L20 6v2.236z"/></svg>
          </div>
          <p>© 2024 ArcSignal Protocol. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
