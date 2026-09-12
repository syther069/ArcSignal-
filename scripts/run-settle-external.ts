import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });


async function run() {
  const url = new URL('http://localhost/api/cron/settle-external-markets');
  const { POST } = await import('../src/app/api/cron/settle-external-markets/route');

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
