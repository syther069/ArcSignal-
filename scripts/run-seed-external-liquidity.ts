import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

async function main() {
  const { POST } = await import('../src/app/api/cron/seed-external-liquidity/route');
  const secret = process.env.CRON_SECRET ?? process.env.ARCSIGNAL_CRON_SECRET ?? '';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const search = new URLSearchParams();
  const args = process.argv.slice(2);
  for (const arg of args) {
    const [key, ...rest] = arg.split('=');
    if (!key || rest.length === 0) continue;
    search.set(key.replace(/^--/, ''), rest.join('='));
  }
  const request = new Request(`${baseUrl}/api/cron/seed-external-liquidity${search.size ? `?${search}` : ''}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}` },
  });
  const response = await POST(request);
  console.log(JSON.stringify(await response.json(), null, 2));
  if (!response.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

