'use client';

import { useEffect, useState } from 'react';
import { useWatchContractEvent, useAccount } from 'wagmi';
import { ARCSIGNAL_ABI, ARCSIGNAL_ADDRESS } from '@/lib/contracts';

export default function NotificationManager() {
  const { address } = useAccount();
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(setPermission);
      }
    }
  }, []);

  const sendNotification = (title: string, body: string) => {
    if (permission === 'granted' && 'Notification' in window) {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
      });
    }
  };

  useWatchContractEvent({
    address: ARCSIGNAL_ADDRESS,
    abi: ARCSIGNAL_ABI,
    eventName: 'MarketCreated',
    onLogs(logs) {
      logs.forEach(log => {
        const { marketId, category, question } = log.args;
        sendNotification(
          'New Market Available',
          `[${category?.toUpperCase()}] ${question}`
        );
      });
    },
  });

  useWatchContractEvent({
    address: ARCSIGNAL_ADDRESS,
    abi: ARCSIGNAL_ABI,
    eventName: 'MarketResolved',
    onLogs(logs) {
      logs.forEach(log => {
        const { marketId, outcome } = log.args;
        const result = outcome === 1 ? 'FOLLOW' : outcome === 2 ? 'FADE' : 'CANCELLED';
        sendNotification(
          'Market Resolved',
          `Market ${marketId?.slice(0, 8)} has resolved as ${result}. Check if you won!`
        );
      });
    },
  });

  return null;
}
