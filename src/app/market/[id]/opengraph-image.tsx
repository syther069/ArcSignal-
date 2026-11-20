import { ImageResponse } from 'next/og';
import { getIndexedMarketById } from '@/lib/indexed-markets';
import { getSignals } from '@/lib/signal-intelligence/repository';
import { validMarketId } from '@/lib/v2-api';
import { getV2Market, v2Availability } from '@/lib/v2-repository';
import { toSerializableV2Markets } from '@/lib/v2-market-adapter';

export const alt = 'ArcSignal market: AI forecast';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
// Share cards get hit by link-preview bots; rebuild each one at most every 5 minutes.
export const revalidate = 300;

async function loadQuestion(id: string): Promise<string | null> {
  try {
    if (v2Availability().enabled && validMarketId(id)) {
      const record = await getV2Market(id).catch(() => null);
      if (record) return (await toSerializableV2Markets([record]))[0]?.question ?? null;
    }
    return (await getIndexedMarketById(id))?.question ?? null;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [question, signals] = await Promise.all([
    loadQuestion(id),
    getSignals(id).catch(() => []),
  ]);
  const aiSignals = signals.filter((s) => !s.agentId.startsWith('baseline-'));
  const sorted = aiSignals.map((s) => s.probability).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const medianValue = sorted.length === 0 ? null : sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const median = medianValue === null ? null : `${(medianValue * 100).toFixed(0)}%`;
  const consensus = median !== null;

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', height: '100%', background: '#131313', color: '#F1EEF4', padding: 64 }}>
        <div style={{ display: 'flex', fontSize: 30, color: '#DDB7FF', fontWeight: 700 }}>ArcSignal · Follow or Fade the AI</div>
        <div style={{ display: 'flex', fontSize: 58, lineHeight: 1.15, fontWeight: 700 }}>
          {(question ?? 'AI-forecast prediction market on Arc').slice(0, 140)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32, fontSize: 32 }}>
          {median ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 22, color: '#B0ABB5' }}>AI median forecast</span>
              <span style={{ color: '#4FDBC8', fontWeight: 700 }}>{median} YES</span>
            </div>
          ) : null}
          <div style={{ display: 'flex', color: '#B0ABB5', fontSize: 24 }}>
            {consensus ? `${aiSignals.length} AI analysts · scored in public` : 'Every AI call is hashed and scored in public'}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
