import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const modalSource = readFileSync(
  new URL('../components/wallet/FundUSDCModal.tsx', import.meta.url),
  'utf8',
);

describe('FundUSDCModal transaction containment', () => {
  it('renders outside page navigation and prevents native form navigation', () => {
    expect(modalSource).toContain('createPortal(');
    expect(modalSource).toContain('event.preventDefault()');
    expect(modalSource).toContain('event.stopPropagation()');
  });

  it('gives every button an explicit type', () => {
    expect(modalSource).not.toMatch(/<button(?![^>]*\btype=)/);
  });
});
