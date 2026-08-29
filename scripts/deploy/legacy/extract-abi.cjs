const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../..');
const artifactPath = [
  'out/contracts/ArcSignal.sol/ARCSignal.json',
  'out/ArcSignal.sol/ARCSignal.json',
  'out/ARCSignal.sol/ARCSignal.json',
]
  .map((candidate) => path.join(ROOT, candidate))
  .find((candidate) => fs.existsSync(candidate));
if (!artifactPath) {
  throw new Error('ArcSignal Foundry artifact not found. Run `forge build` first.');
}
const artifact = require(artifactPath);
const functions = artifact.abi
  .filter((entry) => entry.type === 'function')
  .map((entry) => entry.name);
const constructor = artifact.abi.find((entry) => entry.type === 'constructor');

console.log('Functions:', functions);
console.log('Constructor:', JSON.stringify(constructor, null, 2));