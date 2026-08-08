'use client';

import { useEffect, useState } from 'react';

export function CountdownTimer({
  resolutionTime,
  resolved = false,
}: {
  resolutionTime: number;
  resolved?: boolean;
}) {
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    function update() {
      if (resolved) {
        setTimeLeft('Resolved');
        return;
      }

      const diff = resolutionTime * 1000 - Date.now();
      if (diff <= 0) {
        setTimeLeft('Pending resolution');
        return;
      }

      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [resolutionTime, resolved]);

  if (timeLeft === null) return <span className="opacity-0 tabular-nums" suppressHydrationWarning>--:--:--</span>;
  return <span className="tabular-nums" suppressHydrationWarning>{timeLeft}</span>;
}
