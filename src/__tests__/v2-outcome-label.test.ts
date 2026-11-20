import { describe, expect, it } from 'vitest';
import { outcomeFromV2 } from '@/lib/v2-market-adapter';

describe('outcomeFromV2', () => {
  it('labels the AI pick winning as FOLLOW whichever side it picked', () => {
    expect(outcomeFromV2('YES', 'YES')).toBe('FOLLOW');
    expect(outcomeFromV2('NO', 'NO')).toBe('FOLLOW');
  });
  it('labels the AI pick losing as FADE', () => {
    expect(outcomeFromV2('NO', 'YES')).toBe('FADE');
    expect(outcomeFromV2('YES', 'NO')).toBe('FADE');
  });
  it('defaults an unknown AI pick to YES and keeps non-results unchanged', () => {
    expect(outcomeFromV2('YES')).toBe('FOLLOW');
    expect(outcomeFromV2('UNDETERMINED', 'NO')).toBe('CANCELLED');
    expect(outcomeFromV2(null, 'NO')).toBe('PENDING');
  });
});
