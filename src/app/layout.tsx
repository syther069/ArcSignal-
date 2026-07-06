import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { Inter, JetBrains_Mono, Hanken_Grotesk } from 'next/font/google';
import Navbar from '@/components/layout/Navbar';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { Web3Provider } from '@/components/layout/Web3Provider';
import NetworkSwitcher from '@/components/wallet/NetworkSwitcher';
import NotificationManager from '@/components/layout/NotificationManager';
import './globals.css';

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const hankenGrotesk = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-hanken',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ArcSignal',
  description: 'AI-powered prediction markets on ARC Network',
};

import { Toaster } from 'react-hot-toast';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${jetBrainsMono.variable} ${inter.variable} ${hankenGrotesk.variable}`}
    >
      <body>
        <Web3Provider>
          <NotificationManager />
          <Navbar />
          <NetworkSwitcher />
          {children}
          <MobileBottomNav />
        </Web3Provider>
        <Toaster position="bottom-right" toastOptions={{ style: { background: '#1c1b1b', color: '#fff', border: '1px solid #3a3939' } }} />
      </body>
    </html>
  );
}
