import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { gzipSync } from 'node:zlib';

const budgets = {
  page: { label: '/', maximum: 120_000 },
  'analytics/page': { label: '/analytics', maximum: 235_000 },
  'leaderboard/page': { label: '/leaderboard', maximum: 130_000 },
  'markets/page': { label: '/markets', maximum: 135_000 },
};

const manifestPath = path.join('.next', 'app-build-manifest.json');
const failures = [];

function getRouteFiles(route) {
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    return manifest.pages?.[`/${route}`] ?? [];
  }

  const clientManifestPath = path.join(
    '.next',
    'server',
    'app',
    `${route}_client-reference-manifest.js`,
  );
  if (!existsSync(clientManifestPath)) return [];

  const context = {};
  context.globalThis = context;
  vm.runInNewContext(readFileSync(clientManifestPath, 'utf8'), context);
  const routeManifest = Object.values(context.__RSC_MANIFEST ?? {})[0];
  const files = new Set();
  for (const clientModule of Object.values(routeManifest?.clientModules ?? {})) {
    for (const chunk of clientModule.chunks ?? []) files.add(chunk);
  }
  return [...files];
}

for (const [route, { label, maximum }] of Object.entries(budgets)) {
  const files = getRouteFiles(route);
  if (!Array.isArray(files) || files.length === 0) {
    failures.push(`${label}: client build manifest is missing`);
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
    `${label}: ${(gzipBytes / 1024).toFixed(1)} KiB gzip `
    + `(${(rawBytes / 1024).toFixed(1)} KiB raw), budget ${(maximum / 1024).toFixed(1)} KiB`,
  );
  if (gzipBytes > maximum) {
    failures.push(`${label}: ${gzipBytes} gzip bytes exceeds ${maximum}`);
  }
}

if (failures.length > 0) {
  console.error(`Bundle budget failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}