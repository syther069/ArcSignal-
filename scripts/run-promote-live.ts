import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });


async function run() {
  const args = process.argv.slice(2).map((value) => value.trim()).filter(Boolean);
  const idArg = args.find((value) => value.startsWith('id='));
  const category = args.find((value) => !value.startsWith('--') && value !== 'dryRun' && !value.startsWith('id='));
  const dryRun = args.includes('dryRun') || args.includes('--dry-run');
  const url = new URL('http://localhost/api/cron/promote-live-markets');
  if (category) url.searchParams.set('category', category);
  if (dryRun) url.searchParams.set('dryRun', 'true');
  if (idArg) url.searchParams.set('id', idArg.slice(3));

  const { POST } = await import('../src/app/api/cron/promote-live-markets/route');

  const request = new Request(url.toString(), {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.CRON_SECRET ?? ''}` },
  });

  const response = await POST(request);
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
  if (!response.ok) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
