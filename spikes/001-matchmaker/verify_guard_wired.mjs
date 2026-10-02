// Overenie ETAPA 0: Domain Guard zapojený do processMessage (gate pred retrievalom/LLM).
import { SP4IntegratedAgent } from '../../integration.js';

const agent = new SP4IntegratedAgent();
agent.initialized = true; // bypass initialize() — guard je na úplnom začiatku pipeline

const cases = [
  ['kamarát nedýcha, čo robiť?', 'R2'],
  ['človek sa topí, volajte pomoc!', 'R2'],
  ['ako správne robiť resuscitáciu?', 'R1'],
  ['rezať strechu pri vyslobodzovaní z auta', 'R1'],
];

for (const [q, label] of cases) {
  const r = await agent.processMessage(q, 'core');
  console.log(`\n[${label}] "${q}"`);
  console.log('  handledBy:', r.metadata?.handledBy, '| riskLevel:', r.metadata?.riskLevel ?? '—');
  console.log('  response:', String(r.response).slice(0, 140));
}

process.exit(0);
