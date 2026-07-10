import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

console.log('🧪 TEST: health query routing explicit-intent contract');

const source = await fs.readFile(new URL('../index_v07.js', import.meta.url), 'utf8');
const helperStart = source.indexOf('function isHealthQuery');
const helperEnd = source.indexOf('function showBanner');

assert.ok(helperStart >= 0, 'failed to locate isHealthQuery in index_v07.js');
assert.ok(helperEnd > helperStart, 'failed to locate isHealthQuery end in index_v07.js');

const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(`${source.slice(helperStart, helperEnd)}\n;globalThis.__isHealthQuery = isHealthQuery;`, sandbox);

const isHealthQuery = sandbox.__isHealthQuery;

assert.equal(typeof isHealthQuery, 'function', 'isHealthQuery must be extractable for regression test');

assert.equal(isHealthQuery('status'), true, 'plain status command should route to health');
assert.equal(isHealthQuery('ako funguje systém?'), true, 'explicit system health phrasing should route to health');
assert.equal(isHealthQuery('ako ide agent?'), true, 'explicit agent health phrasing should route to health');
assert.equal(isHealthQuery('je systém v poriadku?'), true, 'explicit system wellbeing phrasing should route to health');

assert.equal(
    isHealthQuery('ako funguje SP4 memory, raw log a chapters?'),
    false,
    'content question about SP4 internals must not be stolen by health auto-routing'
);
assert.equal(
    isHealthQuery('povedz krátko čo je local-first routing'),
    false,
    'routing explanation prompt must not be treated as health query'
);
assert.equal(isHealthQuery('/health'), false, 'slash health command is handled elsewhere and must not hit auto-routing helper');

console.log('PASS: health query routing stays explicit');