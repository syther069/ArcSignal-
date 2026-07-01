import MarketDetailClient from './MarketDetailClient';
import { notFound } from 'next/navigation';
import { Market } from '@/types';



export const revalidate = 60;

export default async function MarketDetailPage({
  params,
}: {
  params: { id: string };
}) {
  let market: Market | null = null;
  
  try {
    const res = await fetch('http://localhost:3000/api/markets', { cache: 'no-store' });
    const data = await res.json();
    market = (data.markets || []).find((m: Market) => m.id === params.id) || null;
  } catch (error) {
    console.error('Failed to fetch market details', error);
  }

  if (!market) {
    notFound();
  }

  return <MarketDetailClient market={market} />;
}
