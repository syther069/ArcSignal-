import { describe, expect, it } from 'vitest';
import { isMarketAutomationEnabled } from '@/lib/automation-policy';

describe('market automation gate', () => {
  it('fails closed unless explicitly set to true', () => {
    expect(isMarketAutomationEnabled(undefined)).toBe(false);
    expect(isMarketAutomationEnabled('')).toBe(false);
    expect(isMarketAutomationEnabled('false')).toBe(false);
    expect(isMarketAutomationEnabled('tru')).toBe(false);
    expect(isMarketAutomationEnabled(' true ')).toBe(true);
  });
});
