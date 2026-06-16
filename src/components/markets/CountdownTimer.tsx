'use client';

import React, { useState, useEffect } from 'react';

export interface CountdownTimerProps {
  resolutionTime: number; // Unix timestamp
  className?: string;
}

export function CountdownTimer({ resolutionTime, className = '' }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Convert to milliseconds if the timestamp is in seconds
    const targetTime = resolutionTime > 9999999999 ? resolutionTime : resolutionTime * 1000;
    
    const updateTimer = () => {
      const now = Date.now();
      const difference = Math.max(0, targetTime - now);
      setTimeLeft(difference);
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);
    
    return () => clearInterval(intervalId);
  }, [resolutionTime]);

  // Prevent server/client hydration mismatch by rendering a placeholder until mounted
  if (!mounted) {
    return <div className={`min-h-[32px] ${className}`} />;
  }

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((timeLeft / 1000 / 60) % 60);
  const seconds = Math.floor((timeLeft / 1000) % 60);

  let colorClass = 'text-[#34d399]'; // > 24h
  if (timeLeft <= 1000 * 60 * 60) {
    colorClass = 'text-[#f87171]'; // < 1h
  } else if (timeLeft <= 1000 * 60 * 60 * 24) {
    colorClass = 'text-[#fbbf24]'; // < 24h
  }

  const isPulsing = timeLeft > 0 && timeLeft <= 1000 * 60 * 10; // < 10 mins

  const formatNumber = (num: number) => num.toString().padStart(2, '0');

  return (
    <div className={`flex items-start font-[family-name:var(--font-jetbrains-mono)] tabular-nums ${colorClass} ${isPulsing ? 'animate-pulse' : ''} ${className}`}>
      <div className="flex flex-col items-center">
        <span className="text-lg font-bold leading-none">{formatNumber(days)}</span>
        <span className="text-[9px] uppercase tracking-widest opacity-60 mt-1">DD</span>
      </div>
      <span className="text-lg font-bold opacity-50 leading-none mx-1.5">:</span>
      <div className="flex flex-col items-center">
        <span className="text-lg font-bold leading-none">{formatNumber(hours)}</span>
        <span className="text-[9px] uppercase tracking-widest opacity-60 mt-1">HH</span>
      </div>
      <span className="text-lg font-bold opacity-50 leading-none mx-1.5">:</span>
      <div className="flex flex-col items-center">
        <span className="text-lg font-bold leading-none">{formatNumber(minutes)}</span>
        <span className="text-[9px] uppercase tracking-widest opacity-60 mt-1">MM</span>
      </div>
      <span className="text-lg font-bold opacity-50 leading-none mx-1.5">:</span>
      <div className="flex flex-col items-center">
        <span className="text-lg font-bold leading-none">{formatNumber(seconds)}</span>
        <span className="text-[9px] uppercase tracking-widest opacity-60 mt-1">SS</span>
      </div>
    </div>
  );
}
