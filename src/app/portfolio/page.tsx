import { Metadata } from 'next';
import PortfolioClient from './PortfolioClient';

export const metadata: Metadata = {
  title: 'Portfolio | ArcSignal',
  description: 'Manage your AI prediction market stakes',
};

export default function PortfolioPage() {
  return <PortfolioClient />;
}
