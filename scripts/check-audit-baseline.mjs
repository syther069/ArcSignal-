import { spawnSync } from 'node:child_process';

// These advisories are currently inherited from Circle Bridge Kit's published
// dependency graph. ArcSignal uses the EVM bridge path; several affected
// packages belong to bundled Solana or ethers compatibility paths. Keep the
// allowlist keyed by advisory identity so any new advisory fails CI even when
// aggregate severity counts happen to stay unchanged.
const allowedAdvisories = new Set([
  'GHSA-848j-6mx2-7j84',
  'GHSA-528h-pc64-c93x',
  'GHSA-82x6-q7mm-w9cf',
  'GHSA-v5mp-jgw5-2x6j',
  'GHSA-w5hq-g745-h8pq',
]);

const npmCli = process.env.npm_execpath;
const command = npmCli ? process.execPath : process.platform === 'win32' ? 'npm.cmd' : 'npm';
const args = npmCli
  ? [npmCli, 'audit', '--omit=dev', '--json']
  : ['audit', '--omit=dev', '--json'];
const audit = spawnSync(command, args, {
  encoding: 'utf8',
  maxBuffer: 10 * 1024 * 1024,
});

let report;
try {
  report = JSON.parse(audit.stdout);
} catch {
  console.error(audit.stderr || 'npm audit did not return valid JSON');
  process.exit(1);
}

const counts = report.metadata?.vulnerabilities;
if (!counts || !report.vulnerabilities) {
  console.error(report.error?.summary || 'npm audit response did not include vulnerability details');
  process.exit(1);
}

const observedAdvisories = new Set();
for (const vulnerability of Object.values(report.vulnerabilities)) {
  for (const cause of vulnerability.via ?? []) {
    if (!cause || typeof cause !== 'object' || typeof cause.url !== 'string') continue;
    const match = cause.url.match(/GHSA-[a-z0-9-]+/i);
    if (match) observedAdvisories.add(match[0]);
  }
}

const unexpected = [...observedAdvisories].filter((id) => !allowedAdvisories.has(id));
console.log('Production dependency audit:', counts);
console.log('Known unresolved advisories:', [...observedAdvisories].sort());

if (Number(counts.critical ?? 0) > 0 || unexpected.length > 0) {
  console.error(`New production dependency advisories: ${unexpected.join(', ') || 'critical severity detected'}`);
  process.exit(1);
}
