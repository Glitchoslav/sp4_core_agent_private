import assert from 'node:assert/strict';
import {
    getRuntimeLoggingState,
    isRuntimeLoggingEnabled,
    setRuntimeLoggingEnabled,
    toggleRuntimeLogging
} from '../src/core/runtimeLogging.js';

console.log('🧪 TEST: runtime logging toggle');

setRuntimeLoggingEnabled(false);
assert.equal(isRuntimeLoggingEnabled(), false);
assert.deepEqual(getRuntimeLoggingState(), {
    enabled: false,
    verbose: false,
    debug: false
});

toggleRuntimeLogging();
assert.equal(isRuntimeLoggingEnabled(), true);
assert.deepEqual(getRuntimeLoggingState(), {
    enabled: true,
    verbose: true,
    debug: true
});

setRuntimeLoggingEnabled(false);
assert.equal(isRuntimeLoggingEnabled(), false);

console.log('✅ Runtime logging toggle works');
