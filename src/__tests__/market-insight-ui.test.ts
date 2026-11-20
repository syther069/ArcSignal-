import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AiVsMarket, TrackRecordNote } from '@/components/signals/SignalIntelligence';
import { ResolutionCard } from '@/components/markets/ResolutionCard';
import { QuickFollowAi } from '@/components/markets/QuickFollowAi';

describe('AiVsMarket', () => {
  it('shows both numbers and the direction of the gap', () => {
    const html = renderToStaticMarkup(createElement(AiVsMarket, { aiMedian: 0.7, marketProbability: 0.5 }));
    for (const text of ['AI median', '70.0%', 'Market price', '50.0%', '+20.0 pts', 'more confident in YES']) expect(html).toContain(text);
    expect(html).toContain('have not reliably beaten market prices');
  });
  it('says so when they agree', () => {
    const html = renderToStaticMarkup(createElement(AiVsMarket, { aiMedian: 0.52, marketProbability: 0.5 }));
    expect(html).toContain('AI and the market agree');
  });
  it('renders nothing for invalid input', () => {
    expect(renderToStaticMarkup(createElement(AiVsMarket, { aiMedian: Number.NaN, marketProbability: 0.5 }))).toBe('');
  });
});

describe('ResolutionCard', () => {
  it('states who decides, the window and the trust caveat for V2', () => {
    const html = renderToStaticMarkup(createElement(ResolutionCard, {
      isV2: true, category: 'crypto', question: 'Will X happen?', closesAt: 1_800_000_000,
      livenessSeconds: 3600, voidAfterSeconds: 10_800,
    }));
    for (const text of ['How this market ends', 'Will X happen?', 'operator', '1 hour after', '3 hours of closing', 'single trusted account']) expect(html).toContain(text);
  });
  it('is honest that older markets are final once posted', () => {
    const html = renderToStaticMarkup(createElement(ResolutionCard, { isV2: false, category: 'football', question: 'Q?', closesAt: 1_800_000_000 }));
    expect(html).toContain('final as soon as the operator posts it');
    expect(html).toContain('API-Football');
  });
});

describe('QuickFollowAi', () => {
  it('names the AI side, the default limit and that the wallet still confirms', () => {
    const html = renderToStaticMarkup(createElement(QuickFollowAi, { aiSideLabel: 'NO', onQuickBet: () => {} }));
    for (const text of ['Follow the AI', '10 USDC on NO', 'Max per quick bet', 'confirm in your wallet']) expect(html).toContain(text);
    expect(html.match(/role="radio"/g)).toHaveLength(4);
  });
});

describe('TrackRecordNote', () => {
  it('shows the score and warns when the sample is tiny', () => {
    const html = renderToStaticMarkup(createElement(TrackRecordNote, { entries: [{ resolved: 1, accuracy: 1, brierScore: 0.0144 }] }));
    for (const text of ['AI track record', '100.0% correct', '0.014', 'coin flip', 'far too few']) expect(html).toContain(text);
  });
});
