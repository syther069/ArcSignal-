'use client';

import { useEffect, useState } from 'react';

/**
 * Shared singleton clock to drive all countdown timers and relative time displays
 * across the application. Replaces dozens of individual setInterval instances
 * with a single synchronized tick listener.
 */
let globalListeners: Set<() => void> = new Set();
let globalInterval: ReturnType<typeof setInterval> | null = null;
let currentUnixSeconds = Math.floor(Date.now() / 1000);

function startGlobalClock() {
  if (globalInterval !== null) return;
  globalInterval = setInterval(() => {
    // Only tick when the tab is visible to conserve battery & CPU
    if (typeof document !== 'undefined' && document.hidden) return;

    currentUnixSeconds = Math.floor(Date.now() / 1000);
    globalListeners.forEach((callback) => callback());
  }, 1000);
}

function stopGlobalClockIfEmpty() {
  if (globalListeners.size === 0 && globalInterval !== null) {
    clearInterval(globalInterval);
    globalInterval = null;
  }
}

export function useGlobalTime(): number {
  const [, setTick] = useState(0);

  useEffect(() => {
    const handleTick = () => {
      setTick((prev) => (prev + 1) % 1_000_000);
    };

    globalListeners.add(handleTick);
    startGlobalClock();

    return () => {
      globalListeners.delete(handleTick);
      stopGlobalClockIfEmpty();
    };
  }, []);

  return currentUnixSeconds;
}

export function getNowUnix(): number {
  return currentUnixSeconds;
}
