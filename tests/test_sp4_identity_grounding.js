import { orchestrate } from '../orchestration/glitchOrchestrator.js';

function fail(message, extra = null) {
  console.error(`FAIL: ${message}`);
  if (extra) {
    console.error(JSON.stringify(extra, null, 2));
  }
  process.exit(1);
}

async function main() {
  const query = 'čo je to sp4?';
  const result = await orchestrate(query, {
    intent: 'deep_identity',
    forceSlovak: true,
    groundingApplied: true,
    detectedTopic: 'architecture'
  });

  if (!result || typeof result.response !== 'string' || result.response.trim().length === 0) {
    fail('empty response', result);
  }

  const text = result.response.toLowerCase();

  if (!['glitchoslav', 'core'].includes(result.handledBy)) {
    fail('unexpected handler', { handledBy: result.handledBy, result });
  }

  if (!text.includes('offline') && !text.includes('lokál') && !text.includes('lokal')) {
    fail('response missing core SP4 factual framing', { response: result.response });
  }

  if (text.includes('jazykovej politike') || text.includes('preloženie textu')) {
    fail('response fell back to unrelated translation hallucination', { response: result.response });
  }

  console.log('PASS: sp4 identity grounding');
  console.log(`handledBy=${result.handledBy}`);
}

main().catch((error) => {
  fail(error.message || String(error));
});
