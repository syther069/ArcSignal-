import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const budgets = {
  '/layout': 225_000,
  '/page': 105_000,
  '/analytics/page': 220_000,
  '/leaderboard/page': 120_000,
  '/markets/page': 125_000,
};

const manifestPath = path.join('.next', 'app-build-manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const failures = [];

for (const [route, budget] of Object.entries(budgets)) {
  const files = manifest.pages?.[route];
  if (!Array.isArray(files) || files.length === 0) {
    failures.push(`${route}: missing from ${manifestPath}`);
    continue;
  }

  let rawBytes = 0;
  let gzipBytes = 0;
  for (const file of new Set(files.filter((entry) => entry.endsWith('.js')))) {
    const filePath = path.join('.next', file);
    rawBytes += statSync(filePath).size;
    gzipBytes += gzipSync(readFileSync(filePath)).length;
  }

  console.log(
    `${route}: ${(gzipBytes / 1024).toFixed(1)} KiB gzip `
    + `(${(rawBytes / 1024).toFixed(1)} KiB raw), budget ${(budget / 1024).toFixed(1)} KiB`,
  );
  if (gzipBytes > budget) {
    failures.push(`${route}: ${gzipBytes} gzip bytes exceeds ${budget}`);
  }
}

if (failures.length > 0) {
  console.error(`Bundle budget failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}