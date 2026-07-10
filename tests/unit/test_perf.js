// Quick performance test for mode detection deduplication
import { SP4IntegratedAgent } from './integration.js';

const agent = new SP4IntegratedAgent();
await agent.initialize();

console.log('\n🧪 TEST: Mode detection deduplication\n');
console.log('Expected: Only 1x "🧭 MODE DETECTED" log\n');
console.log('---\n');

const reply = await agent.ask('krátko: čo je sloboda?', { mode: 'auto' });

console.log('\n---\n');
console.log('🔥 ODPOVEĎ:', reply);
console.log('\n✅ Test complete');
process.exit(0);
