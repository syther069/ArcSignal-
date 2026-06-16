import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import LiveTicker from '@/components/layout/LiveTicker';
import Navbar from '@/components/layout/Navbar';
import { Web3Provider } from '@/components/layout/Web3Provider';
import './globals.css';

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ArcSignal',
  description: 'AI-powered prediction markets on ARC Network',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${jetBrainsMono.variable}`}>
      <body>
        <Web3Provider>
          <Navbar />
          <LiveTicker />
          {children}
        </Web3Provider>
      </body>
    </html>
  );
}
