import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { POST } from '../src/app/api/cron/resolve/route';

async function run() {
    const timeframe = process.argv[2]?.trim();
    const url = new URL('http://localhost/api/cron/resolve');
    if (timeframe) {
        url.searchParams.set('timeframe', timeframe);
    }

    const req = new Request(url.toString(), {
        method: 'POST',
        headers: {
            'authorization': 'Bearer ' + process.env.CRON_SECRET
        }
    });
    
    console.log(`Resolving due markets${timeframe ? ` for ${timeframe}` : ''}...`);
    const response = await POST(req);
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
}

run().catch(console.error);
