// Probe: dá sa načítať multilingual-e5-small cez @xenova/transformers? Aká dimenzia?
import { pipeline } from '@xenova/transformers';

const candidates = [
  'Xenova/multilingual-e5-small',
  'intfloat/multilingual-e5-small',
];

for (const name of candidates) {
  try {
    console.log(`\nSkúšam ${name} ...`);
    const t0 = Date.now();
    const extractor = await pipeline('feature-extraction', name);
    const out = await extractor('query: ahoj', { pooling: 'mean', normalize: true });
    const dim = out.dims ? out.dims.join('x') : `len=${out.data.length}`;
    console.log(`✅ OK ${name} | dim=${dim} | load=${((Date.now() - t0) / 1000).toFixed(1)}s`);
  } catch (err) {
    console.log(`❌ FAIL ${name}: ${err.message}`);
  }
}
