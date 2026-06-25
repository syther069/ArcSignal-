'use client';

import { useEffect, useState } from 'react';

export function CountdownTimer({ resolutionTime }: { resolutionTime: number }) {
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    function update() {
      const diff = resolutionTime * 1000 - Date.now();
      if (diff <= 0) {
        setTimeLeft('Resolving...');
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
  }, [resolutionTime]);

  if (timeLeft === null) return <span className="opacity-0">--:--:--</span>;
  return <span>{timeLeft}</span>;
}
