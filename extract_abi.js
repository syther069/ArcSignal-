const j = require('./out/ARCSignal.sol/ARCSignal.json');

// Show all function names
const fns = j.abi.filter(x => x.type === 'function').map(x => x.name);
console.log('Functions in compiled ABI:', fns);

// Show constructor
const ctor = j.abi.find(x => x.type === 'constructor');
console.log('\nConstructor:', JSON.stringify(ctor, null, 2));

// Check if there's a usdc reference in the ABI
const usdcFns = j.abi.filter(x => x.name && x.name.toLowerCase().includes('usdc'));
console.log('\nUSDC-related functions:', usdcFns.map(x => x.name));

// Check state variables (public getters)
const viewFns = j.abi.filter(x => x.type === 'function' && (x.stateMutability === 'view' || x.stateMutability === 'pure'));
console.log('\nView/Pure functions:', viewFns.map(x => `${x.name}(${x.inputs.map(i=>i.type).join(',')}) => ${x.outputs.map(o=>o.type).join(',')}`));
