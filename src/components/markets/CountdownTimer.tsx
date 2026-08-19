'use client';

import React from 'react';
import { useGlobalTime } from '@/hooks/useGlobalTime';

interface CountdownTimerProps {
  resolutionTime: number;
  resolved?: boolean;
}

function formatCountdown(resolutionTime: number, nowSec: number, resolved: boolean): string {
  if (resolved) return 'Resolved';

  const diffSec = resolutionTime - nowSec;
  if (diffSec <= 0) return 'Pending resolution';

  const h = Math.floor(diffSec / 3600);
  const m = Math.floor((diffSec % 3600) / 60);
  const s = diffSec % 60;
  return `${h}h ${m}m ${s}s`;
}

export const CountdownTimer = React.memo(function CountdownTimer({
  resolutionTime,
  resolved = false,
}: CountdownTimerProps) {
  const nowUnix = useGlobalTime();
  const timeLeft = formatCountdown(resolutionTime, nowUnix, resolved);

  return <span className="tabular-nums" suppressHydrationWarning>{timeLeft}</span>;
});

