import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/signal-intelligence/generation', () => ({ generateMarketSignals: vi.fn() }));
vi.mock('@/lib/signal-intelligence/resolution', () => ({ reconcileSignals: vi.fn() }));
vi.mock('@/lib/signal-intelligence/operations', () => ({ generateScheduledSignals: vi.fn() }));
import { POST } from '@/app/api/cron/signals/route';
import { generateMarketSignals } from '@/lib/signal-intelligence/generation';
import { generateScheduledSignals } from '@/lib/signal-intelligence/operations';
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
describe('signal write authorization', () => {
  it('blocks unauthenticated users before any generation', async () => {
    vi.stubEnv('CRON_SECRET', 'test-secret');
    const response = await POST(new Request('http://localhost/api/cron/signals', { method: 'POST', body: JSON.stringify({ action: 'generate', marketId: 'test' }) }));
    expect(response.status).toBe(401); expect(generateMarketSignals).not.toHaveBeenCalled();
  });
  it('validates authorized requests', async () => {
    vi.stubEnv('CRON_SECRET', 'test-secret');
    const response = await POST(new Request('http://localhost/api/cron/signals', { method: 'POST', headers: { authorization: 'Bearer test-secret' }, body: JSON.stringify({ action: 'generate' }) }));
    expect(response.status).toBe(400); expect(generateMarketSignals).not.toHaveBeenCalled();
  });
  it('runs the bounded scheduler for an authorized request', async () => {
    vi.stubEnv('CRON_SECRET', 'test-secret');
    vi.mocked(generateScheduledSignals).mockResolvedValue({ claimed: 1, completed: ['market-1'], retrying: [], skipped: [], maxMarkets: 1 });
    const response = await POST(new Request('http://localhost/api/cron/signals', { method: 'POST', headers: { authorization: 'Bearer test-secret' }, body: JSON.stringify({ action: 'generate-scheduled', maxMarkets: 1 }) }));
    expect(response.status).toBe(200);
    expect(generateScheduledSignals).toHaveBeenCalledWith(expect.objectContaining({ maxMarkets: 1 }));
  });
});
