import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { POST } from '../src/app/api/cron/generate/route';

async function run() {
    const req = new Request('http://localhost/api/cron/generate', {
        method: 'POST',
        headers: {
            'authorization': 'Bearer ' + process.env.CRON_SECRET
        }
    });
    
    console.log("Generating markets...");
    const response = await POST(req);
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
}

run().catch(console.error);
