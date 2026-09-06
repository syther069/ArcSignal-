'use client';

import React from 'react';
import { useGlobalTime } from '@/hooks/useGlobalTime';
import {
  CheckCircle2,
  Clock,
  Lock,
  Sparkles,
  Trophy,
  AlertOctagon,
  LucideIcon,
} from 'lucide-react';

interface MarketTimelineProps {
  resolutionTime: number;
  resolved: boolean;
  outcome?: string;
  status?: string;
  openedAt?: number;
}

type StepState = 'complete' | 'active' | 'upcoming' | 'cancelled';

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
  const now = useGlobalTime();
  const isPastResolution = now >= resolutionTime;
  const isCancelled = status === 'VOIDED' || status === 'CANCELLED' || outcome === 'CANCELLED' || outcome === 'VOIDED';
  const isResolved = resolved || status === 'RESOLVED';
  const isPending = !isResolved && !isCancelled && (status === 'PENDING_RESOLUTION' || isPastResolution);

  const steps: TimelineStep[] = [
    {
      title: '1. Market Opened',
      desc: 'AI hypothesis formulated & on-chain trading pool initialized',
      time: openedAt
        ? new Date(openedAt * 1000).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'Contract Deployed',
      state: 'complete',
      icon: Sparkles,
    },
    {
      title: '2. Trading Active',
      desc: 'Participants stake Follow or Fade into non-custodial liquidity',
      time: isCancelled
        ? 'Halted'
        : isResolved || isPending
        ? 'Trading Closed'
        : 'Open until lock',
      state: isCancelled
        ? 'cancelled'
        : isResolved || isPending
        ? 'complete'
        : 'active',
      icon: Clock,
    },
    {
      title: '3. Market Lock',
      desc: 'Trading disabled upon reaching expiration countdown cutoff',
      time: new Date(resolutionTime * 1000).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      state: isCancelled
        ? 'cancelled'
        : isResolved || isPending
        ? 'complete'
        : isPastResolution
        ? 'complete'
        : 'upcoming',
      icon: Lock,
    },
    {
      title: '4. Oracle Resolution',
      desc: 'Data feed queries verified oracle sources for ground truth outcome',
      time: isCancelled
        ? 'Voided'
        : isResolved
        ? 'Verified'
        : isPending
        ? 'Awaiting Oracle Feed'
        : 'At cutoff',
      state: isCancelled
        ? 'cancelled'
        : isResolved
        ? 'complete'
        : isPending
        ? 'active'
        : 'upcoming',
      icon: CheckCircle2,
    },
    {
      title: '5. Settlement & Payouts',
      desc: isCancelled
        ? 'Market voided; stake refund claims enabled'
        : isResolved
        ? outcome ? `Settled: ${outcome} wins on-chain` : 'Settled on-chain'
        : 'Pro-rata pool claims enabled upon final oracle signature',
      time: isCancelled
        ? 'Refunds Open'
        : isResolved
        ? 'Payouts Open'
        : 'Pending Settlement',
      state: isCancelled
        ? 'cancelled'
        : isResolved
        ? 'complete'
        : 'upcoming',
      icon: isCancelled ? AlertOctagon : Trophy,
    },
  ];

  return (
    <section className="rounded-2xl border border-[#403947] bg-[#1C1B1B] p-5 lg:p-6 space-y-5 shadow-sm">
      <div className="border-b border-[#403947]/70 pb-4">
        <h3 className="font-display text-[20px] leading-[28px] font-semibold tracking-tight text-[#F1EEF4]">
          Market Lifecycle Timeline
        </h3>
        <p className="font-sans text-[13px] leading-[18px] text-[#B0ABB5] mt-0.5">
          Step-by-step verification, expiration lock, and settlement progression
        </p>
      </div>

      <div className="relative pl-6 sm:pl-7 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-[#403947]/60">
        {steps.map((step, idx) => {
          const isComplete = step.state === 'complete';
          const isActive = step.state === 'active';
          const isStepCancelled = step.state === 'cancelled';
          const Icon = step.icon;

          let nodeClass = 'border-[#403947] bg-[#252229] text-[#B0ABB5]';
          let titleClass = 'text-[#B0ABB5]';

          if (isComplete) {
            nodeClass = 'border-[#4FDBC8] bg-[#4FDBC8]/15 text-[#4FDBC8]';
            titleClass = 'text-[#F1EEF4]';
          } else if (isActive) {
            nodeClass = 'border-[#F2C66D] bg-[#F2C66D]/20 text-[#F2C66D] ring-4 ring-[#F2C66D]/15 animate-pulse';
            titleClass = 'text-[#F2C66D] font-bold';
          } else if (isStepCancelled) {
            nodeClass = 'border-[#FFB4AB] bg-[#FFB4AB]/20 text-[#FFB4AB]';
            titleClass = 'text-[#FFB4AB]';
          }

          return (
            <div key={idx} className="relative group">
              {/* Step indicator node */}
              <div
                className={`absolute -left-6 sm:-left-7 top-0.5 flex items-center justify-center w-6 h-6 rounded-full border text-xs transition-all duration-140 ${nodeClass}`}
                aria-label={`Step status: ${step.state}`}
              >
                <Icon size={12} />
              </div>

              {/* Step details */}
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                <h4 className={`text-sm font-sans font-semibold tracking-tight ${titleClass}`}>
                  {step.title}
                </h4>
                <span className="font-mono text-xs text-[#B0ABB5] tabular-nums shrink-0">
                  {step.time}
                </span>
              </div>
              <p className="font-sans text-[13px] leading-[18px] text-[#B0ABB5]/90 mt-0.5">
                {step.desc}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
