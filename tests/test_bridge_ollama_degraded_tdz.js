import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../bridge-server.js', import.meta.url), 'utf8');
const branchStart = source.indexOf('if (!result || !result.ok)');
const branchEnd = source.indexOf('if (personaKey ===', branchStart);

assert.notEqual(branchStart, -1, 'Ollama degraded branch must exist');
assert.notEqual(branchEnd, -1, 'Ollama degraded branch boundary must exist');

const degradedBranch = source.slice(branchStart, branchEnd);
assert.match(degradedBranch, /res\.status\(503\)\.json\(/);
assert.match(degradedBranch, /ok:\s*false/);
assert.match(degradedBranch, /engine:\s*'none'/);

const latencyExpression = degradedBranch.match(/latencyMs:\s*([^,\r\n]+)/)?.[1];
assert.ok(latencyExpression, 'degraded response must define latencyMs inline');
assert.doesNotMatch(latencyExpression, /^\s*latencyMs\s*$/);

const evaluateLatency = new Function('started', `return (${latencyExpression});`);
const latencyMs = evaluateLatency(Date.now() - 25);
assert.ok(latencyMs >= 25, 'degraded latency must evaluate without a TDZ error');

console.log('bridge Ollama degraded TDZ regression: PASS');
