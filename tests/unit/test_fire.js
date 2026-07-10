// Quick test for Fire Mode
import { SP4IntegratedAgent } from './integration.js';
import { forceFireMode } from './src/core/fireMode.js';

const agent = new SP4IntegratedAgent();
await agent.initialize();

console.log('\n🔥 TEST 1: Manual /fire command\n');
forceFireMode(1.0);
const reply1 = await agent.ask('Snažím sa začať cvičiť, ale nemám čas.', { mode: 'auto' });
console.log('\n🔥 ODPOVEĎ:', reply1);

console.log('\n---\n');

console.log('🔥 TEST 2: Auto-detect victim mentality\n');
const reply2 = await agent.ask('Prečo práve ja mám vždy smolu? Všetci na mňa.', { mode: 'auto' });
console.log('\n🔥 ODPOVEĎ:', reply2);

console.log('\n---\n');

console.log('🔥 TEST 3: Explicit "povedz mi pravdu"\n');
const reply3 = await agent.ask('Mám 10 projektov rozbehnutých. Povedz mi pravdu - čo s tým?', { mode: 'auto' });
console.log('\n🔥 ODPOVEĎ:', reply3);

console.log('\n✅ Fire Mode tests complete');
process.exit(0);
