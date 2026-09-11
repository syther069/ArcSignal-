import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST as indexV2 } from '@/app/api/cron/index-v2/route';
import { POST as maintainV2 } from '@/app/api/cron/maintain-v2/route';

afterEach(() => vi.unstubAllEnvs());

describe('V2 operational route authorization and deployment gates', () => {
  it.each([
    ['index', indexV2],
    ['maintenance', maintainV2],
  ])('rejects unauthenticated %s calls before chain or database access', async (_name, handler) => {
    vi.stubEnv('CRON_SECRET', 'test-secret');
    const response = await handler(new Request('http://localhost/api/cron/v2', { method: 'POST' }));
    expect(response.status).toBe(401);
  });

  it.each([
    ['index', indexV2],
    ['maintenance', maintainV2],
  ])('safely skips authorized %s calls before a verified V2 deployment is configured', async (_name, handler) => {
    vi.stubEnv('CRON_SECRET', 'test-secret');
    const response = await handler(new Request('http://localhost/api/cron/v2', {
      method: 'POST',
      headers: { authorization: 'Bearer test-secret' },
    }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ skipped: true });
  });
});
