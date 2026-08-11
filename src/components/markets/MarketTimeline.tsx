'use client';

import React from 'react';
import { CheckCircle2, Clock, Lock, Sparkles, Trophy, LucideIcon } from 'lucide-react';

interface MarketTimelineProps {
  resolutionTime: number;
  resolved: boolean;
  outcome?: string;
  status?: string;
  openedAt?: number;
}

type StepState = 'complete' | 'active' | 'upcoming';

interface TimelineStep {
  title: string;
  desc: string;
  time: string;
  state: StepState;
  icon: LucideIcon;
}

export function MarketTimeline({
  resolutionTime,
  resolved,
  outcome,
  status,
  openedAt,
}: MarketTimelineProps) {
  const now = Math.floor(Date.now() / 1000);
  const isPastResolution = now >= resolutionTime;
  const isResolved = resolved || status === 'RESOLVED';
  const isPending = !isResolved && (status === 'PENDING_RESOLUTION' || isPastResolution);

  const steps: TimelineStep[] = [
    {
      title: 'Market Opened',
      desc: 'AI generated hypothesis & opened trading pool',
      time: openedAt
        ? new Date(openedAt * 1000).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'Initiated',
      state: 'complete',
      icon: Sparkles,
    },
    {
      title: 'Trading Active',
      desc: 'Users stake Follow or Fade in live liquidity pool',
      time: 'Open until cutoff',
      state: isResolved || isPending ? 'complete' : 'active',
      icon: Clock,
    },
    {
      title: 'Market Lock',
      desc: 'Trading disabled. Countdown expiration reached',
      time: new Date(resolutionTime * 1000).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      state: isResolved || isPending ? 'complete' : 'upcoming',
      icon: Lock,
    },
    {
      title: 'Oracle Resolution',
      desc: 'Data feed queries verified oracle sources',
      time: isResolved ? 'Verified' : isPending ? 'In Progress' : 'T+1 hr after lock',
      state: isResolved ? 'complete' : isPending ? 'active' : 'upcoming',
      icon: CheckCircle2,
    },
    {
      title: 'Settlement & Payouts',
      desc: outcome ? `Settled: ${outcome} wins` : 'Pro-rata pool claims enabled',
      time: isResolved ? 'Payouts Open' : 'Upon Oracle Signature',
      state: isResolved ? 'complete' : 'upcoming',
      icon: Trophy,
    },
  ];

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#141414] p-5 lg:p-6 space-y-4">
      <div className="border-b border-white/[0.06] pb-3">
        <h3 className="font-[family-name:var(--font-hanken)] text-base font-bold text-white">
          Market Lifecycle Timeline
        </h3>
        <p className="text-xs text-[#94a3b8] mt-0.5">
          Step-by-step verification and oracle settlement progression
        </p>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-white/[0.08]">
        {steps.map((step, idx) => {
          const isComplete = step.state === 'complete';
          const isActive = step.state === 'active';
          const Icon = step.icon;

          return (
            <div key={idx} className="relative group">
              {/* Step indicator node */}
              <div
                className={`absolute -left-6 top-0.5 flex items-center justify-center w-5 h-5 rounded-full border text-[10px] transition-all ${
                  isComplete
                    ? 'border-[#4fdbc8] bg-[#4fdbc8]/20 text-[#4fdbc8]'
                    : isActive
                    ? 'border-[#ddb7ff] bg-[#ddb7ff]/20 text-[#ddb7ff] ring-4 ring-[#ddb7ff]/10 animate-pulse'
                    : 'border-white/[0.1] bg-[#1a1a1a] text-[#64748b]'
                }`}
              >
                <Icon size={11} />
              </div>

              {/* Step details */}
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                <h4
                  className={`text-xs font-bold font-[family-name:var(--font-inter)] ${
                    isComplete
                      ? 'text-white'
                      : isActive
                      ? 'text-[#ddb7ff]'
                      : 'text-[#94a3b8]'
                  }`}
                >
                  {step.title}
                </h4>
                <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] text-[#94a3b8]">
                  {step.time}
                </span>
              </div>
              <p className="text-[11px] text-[#64748b] mt-0.5 leading-normal">
                {step.desc}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
