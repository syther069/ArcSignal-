import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  new URL('../lib/wallet-config.ts', import.meta.url),
  'utf8',
);

describe('Arc wallet RPC', () => {
  it('does not batch reads through Multicall3 on the public Arc RPC', () => {
    expect(source).toContain('batch: { multicall: false }');
    expect(source).not.toMatch(/batchSize:\s*100/);
  });
});
