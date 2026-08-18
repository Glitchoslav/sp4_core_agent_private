import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../bridge-server.js', import.meta.url), 'utf8');
const bearerIndex = source.indexOf("app.use('/api', requireBridgeAuth);");
const identityIndex = source.indexOf("['/api/member', '/api/collective']");

assert.notEqual(bearerIndex, -1, 'transport bearer gate must remain');
assert.notEqual(identityIndex, -1, 'member and collective routes need identity PoP middleware');
assert.ok(identityIndex > bearerIndex, 'PoP must run after transport bearer authentication');

for (const route of [
  "app.post('/api/member/purge'",
  "app.get('/api/member/:id/memory'",
  "app.put('/api/member/:id/consent'",
  "app.post('/api/member/:id/note'",
  "app.get('/api/collective/insights'",
  "app.get('/api/collective/tips'",
  "app.get('/api/collective/stories'",
  "app.get('/api/collective/search'",
  "app.post('/api/collective/tip'",
  "app.get('/api/collective/meta'"
]) {
  const routeIndex = source.indexOf(route);
  assert.notEqual(routeIndex, -1, `missing route ${route}`);
  assert.ok(routeIndex > identityIndex, `${route} must be registered after PoP middleware`);
}

console.log('bridge identity auth contract: PASS');
