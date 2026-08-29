import { spawnSync } from 'node:child_process';

const baseline = {
  critical: 0,
  high: 5,
  moderate: 11,
  low: 0,
  total: 16,
};

const audit = spawnSync(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['audit', '--omit=dev', '--json'],
  { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
);

let report;
try {
  report = JSON.parse(audit.stdout);
} catch {
  console.error(audit.stderr || 'npm audit did not return valid JSON');
  process.exit(1);
}

const counts = report.metadata?.vulnerabilities;
if (!counts) {
  console.error('npm audit response did not include vulnerability counts');
  process.exit(1);
}

console.log('Production dependency audit:', counts);

const regressions = Object.entries(baseline)
  .filter(([severity, maximum]) => Number(counts[severity] ?? 0) > maximum)
  .map(([severity, maximum]) => `${severity}: ${counts[severity]} > ${maximum}`);

if (regressions.length > 0) {
  console.error(`Dependency vulnerability baseline regressed: ${regressions.join(', ')}`);
  process.exit(1);
}