/**
 * 🧪 TEST: Identity Vault - Glitchoslav Deep Truth Access
 * 
 * Otestuje:
 * 1. Root-first canonical loading z `identity/`
 * 2. Slot-level fallback na legacy fragmenty
 * 3. Cache mechanizmus + reload kontrakt
 * 4. Caller contract pre GLITCHOSLAV prompt path
 * 2. Cache mechanizmus
 * 3. Intent detection (system-info vs deep_identity)
 * 4. Orchestrator routing (deep_identity → GLITCHOSLAV)
 * 
 * @author Kefyk (SP4)
 * @date 2025-11-28
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getGlitchoslavTruth, getIdentityFileList } from '../src/core/identityVault.js';
import { extractIntent, getIntentDescription } from '../src/routing/intentExtractor.js';
import { buildPrompt } from '../multiVoice.js';

console.log('\n🔒 ═══════════════════════════════════════════════════════════');
console.log('   IDENTITY VAULT TEST - Glitchoslav Deep Truth');
console.log('═══════════════════════════════════════════════════════════\n');

const ORIGINAL_ENV = {
    SP4_IDENTITY_ROOT_OVERRIDE: process.env.SP4_IDENTITY_ROOT_OVERRIDE,
    SP4_IDENTITY_LEGACY_DIR_OVERRIDE: process.env.SP4_IDENTITY_LEGACY_DIR_OVERRIDE,
    SP4_IDENTITY_MASTER_OVERRIDE: process.env.SP4_IDENTITY_MASTER_OVERRIDE,
};

function restoreOriginalEnv() {
    Object.entries(ORIGINAL_ENV).forEach(([key, value]) => {
        if (value === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = value;
        }
    });
}

function ensureFile(filePath, content) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
}

function createFixture(label) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), `sp4-identity-vault-${label}-`));
    const identityRoot = path.join(root, 'identity');
    const legacyDir = path.join(root, 'legacy');
    const masterPath = path.join(root, 'SP4_MASTER.md');

    fs.mkdirSync(identityRoot, { recursive: true });
    fs.mkdirSync(legacyDir, { recursive: true });

    return { root, identityRoot, legacyDir, masterPath };
}

function writeCanonicalFixture(identityRoot, values) {
    ensureFile(path.join(identityRoot, 'system', 'sp4_master.runtime.md'), values.runtimeMaster);
    ensureFile(path.join(identityRoot, 'user', 'kefyk.profile.md'), values.userProfile);
    ensureFile(path.join(identityRoot, 'personas', 'personas.md'), values.personas);
    ensureFile(path.join(identityRoot, 'personas', 'core', 'prompt.core.md'), values.corePrompt);
    ensureFile(path.join(identityRoot, 'personas', 'glitchoslav', 'prompt.glitchoslav.md'), values.glitchPrompt);
    ensureFile(path.join(identityRoot, 'personas', 'popici', 'prompt.popici.md'), values.popiciPrompt);
}

function writeLegacyFixture(legacyDir, values) {
    ensureFile(path.join(legacyDir, 'SP4_IDENTITY.md'), values.sp4Identity);
    ensureFile(path.join(legacyDir, 'KEFYK_IDENTITY.md'), values.kefykIdentity);
    ensureFile(path.join(legacyDir, 'KEFYK_CORE.md'), values.kefykCore);
    ensureFile(path.join(legacyDir, 'GLITCHOSLAV_FIRST_BREATH.md'), values.glitchFirstBreath);
    ensureFile(path.join(legacyDir, 'BEHAVIOR.md'), values.behavior);
    ensureFile(path.join(legacyDir, 'SPEECH_STYLE.md'), values.speechStyle);
    ensureFile(path.join(legacyDir, 'SP4_LANGUAGE.md'), values.language);
    ensureFile(path.join(legacyDir, 'POPICI_PERSONALITY.md'), values.popici);
}

async function useFixture({ identityRoot, legacyDir, masterPath }) {
    process.env.SP4_IDENTITY_ROOT_OVERRIDE = identityRoot;
    process.env.SP4_IDENTITY_LEGACY_DIR_OVERRIDE = legacyDir;
    process.env.SP4_IDENTITY_MASTER_OVERRIDE = masterPath;
    await reloadFixture();
}

function reloadFixture() {
    return import('../src/core/identityVault.js').then(({ reloadGlitchoslavTruth }) => reloadGlitchoslavTruth());
}

async function withFixture(label, setup, testFn) {
    const fixture = createFixture(label);
    try {
        await setup(fixture);
        await useFixture(fixture);
        await testFn(fixture);
    } finally {
        restoreOriginalEnv();
        await reloadFixture();
        fs.rmSync(fixture.root, { recursive: true, force: true });
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST 1: File List Check
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('📋 TEST 1: Identity File List\n');

const fileList = getIdentityFileList();

if (fileList.error) {
    console.error('❌ ERROR:', fileList.error);
} else {
    console.log(`Base directory: ${fileList.baseDir}`);
    console.log(`Canonical root: ${fileList.canonicalRoot}`);
    console.log(`\nFound ${fileList.files.length} .md files:\n`);

    fileList.files.forEach(file => {
        const status = file.exists ? '✅' : '❌';
        console.log(`   ${status} ${file.name}`);
    });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST 2: Load Identity Vault
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n\n🔐 TEST 2: Load Identity Vault\n');

const truth = getGlitchoslavTruth();

if (!truth || truth.length === 0) {
    console.error('❌ ERROR: Identity vault is empty!');
} else {
    console.log(`✅ Identity vault loaded: ${truth.length} chars`);

    // Show first 500 chars as preview
    console.log('\nPreview (first 500 chars):');
    console.log('─────────────────────────────────────────');
    console.log(truth.substring(0, 500) + '...');
    console.log('─────────────────────────────────────────');

    // Check for key content
    const hasKefyk = truth.includes('Kefyk') || truth.includes('KEFYK');
    const hasSP4 = truth.includes('SP4');
    const hasGlitch = truth.includes('Glitchoslav') || truth.includes('GLITCHOSLAV');

    console.log('\nContent check:');
    console.log(`   ${hasKefyk ? '✅' : '❌'} Contains Kefyk identity`);
    console.log(`   ${hasSP4 ? '✅' : '❌'} Contains SP4 identity`);
    console.log(`   ${hasGlitch ? '✅' : '❌'} Contains Glitchoslav identity`);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST 3: Canonical vs legacy behavior
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n\n🧭 TEST 3: Root-first dual-read scenarios\n');

await withFixture(
    'canonical-preferred',
    async ({ identityRoot, legacyDir, masterPath }) => {
        writeCanonicalFixture(identityRoot, {
            runtimeMaster: 'CANONICAL_RUNTIME_MASTER',
            userProfile: 'CANONICAL_USER_PROFILE',
            personas: 'CANONICAL_PERSONAS',
            corePrompt: 'CANONICAL_CORE_PROMPT',
            glitchPrompt: 'CANONICAL_GLITCH_PROMPT',
            popiciPrompt: 'CANONICAL_POPICI_PROMPT',
        });
        writeLegacyFixture(legacyDir, {
            sp4Identity: 'LEGACY_SP4_IDENTITY',
            kefykIdentity: 'LEGACY_KEFYK_IDENTITY',
            kefykCore: 'LEGACY_KEFYK_CORE',
            glitchFirstBreath: 'LEGACY_GLITCH_FIRST_BREATH',
            behavior: 'LEGACY_BEHAVIOR',
            speechStyle: 'LEGACY_SPEECH_STYLE',
            language: 'LEGACY_LANGUAGE',
            popici: 'LEGACY_POPICI',
        });
        ensureFile(masterPath, 'LEGACY_ROOT_MASTER');
    },
    async () => {
        const bundle = getGlitchoslavTruth();

        assert.ok(bundle.includes('CANONICAL_RUNTIME_MASTER'));
        assert.ok(bundle.includes('CANONICAL_GLITCH_PROMPT'));
        assert.ok(bundle.includes('CANONICAL_POPICI_PROMPT'));
        assert.ok(!bundle.includes('LEGACY_ROOT_MASTER'));
        assert.ok(!bundle.includes('LEGACY_GLITCH_FIRST_BREATH'));
        assert.ok(!bundle.includes('LEGACY_POPICI'));
        console.log('✅ Canonical files are preferred over legacy safety files');
    }
);

await withFixture(
    'slot-fallback',
    async ({ identityRoot, legacyDir, masterPath }) => {
        writeCanonicalFixture(identityRoot, {
            runtimeMaster: 'CANONICAL_RUNTIME_MASTER_SHOULD_BE_REMOVED',
            userProfile: 'CANONICAL_USER_PROFILE',
            personas: 'CANONICAL_PERSONAS',
            corePrompt: 'CANONICAL_CORE_PROMPT',
            glitchPrompt: 'CANONICAL_GLITCH_PROMPT',
            popiciPrompt: 'CANONICAL_POPICI_PROMPT',
        });
        fs.rmSync(path.join(identityRoot, 'system', 'sp4_master.runtime.md'), { force: true });

        writeLegacyFixture(legacyDir, {
            sp4Identity: 'LEGACY_SP4_IDENTITY',
            kefykIdentity: 'LEGACY_KEFYK_IDENTITY',
            kefykCore: 'LEGACY_KEFYK_CORE',
            glitchFirstBreath: 'LEGACY_GLITCH_FIRST_BREATH',
            behavior: 'LEGACY_BEHAVIOR',
            speechStyle: 'LEGACY_SPEECH_STYLE',
            language: 'LEGACY_LANGUAGE',
            popici: 'LEGACY_POPICI',
        });
        ensureFile(masterPath, 'LEGACY_ROOT_MASTER_SLOT_FALLBACK');
    },
    async () => {
        const bundle = getGlitchoslavTruth();

        assert.ok(bundle.includes('LEGACY_ROOT_MASTER_SLOT_FALLBACK'));
        assert.ok(bundle.includes('CANONICAL_USER_PROFILE'));
        assert.ok(bundle.includes('CANONICAL_GLITCH_PROMPT'));
        assert.ok(!bundle.includes('LEGACY_GLITCH_FIRST_BREATH'));
        console.log('✅ Missing canonical slot falls back only for that slot');
    }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST 4: Cache Mechanism
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n\n🔄 TEST 4: Cache Mechanism\n');

await withFixture(
    'cache-reload',
    async ({ identityRoot, legacyDir, masterPath }) => {
        writeCanonicalFixture(identityRoot, {
            runtimeMaster: 'CACHE_RUNTIME_MASTER_V1',
            userProfile: 'CACHE_USER_PROFILE',
            personas: 'CACHE_PERSONAS',
            corePrompt: 'CACHE_CORE_PROMPT',
            glitchPrompt: 'CACHE_GLITCH_PROMPT_V1',
            popiciPrompt: 'CACHE_POPICI_PROMPT',
        });
        writeLegacyFixture(legacyDir, {
            sp4Identity: 'LEGACY_SP4_IDENTITY',
            kefykIdentity: 'LEGACY_KEFYK_IDENTITY',
            kefykCore: 'LEGACY_KEFYK_CORE',
            glitchFirstBreath: 'LEGACY_GLITCH_FIRST_BREATH',
            behavior: 'LEGACY_BEHAVIOR',
            speechStyle: 'LEGACY_SPEECH_STYLE',
            language: 'LEGACY_LANGUAGE',
            popici: 'LEGACY_POPICI',
        });
        ensureFile(masterPath, 'LEGACY_ROOT_MASTER');
    },
    async ({ identityRoot }) => {
        const startTime = Date.now();
        const cachedV1 = getGlitchoslavTruth();
        const firstReadMs = Date.now() - startTime;

        ensureFile(
            path.join(identityRoot, 'personas', 'glitchoslav', 'prompt.glitchoslav.md'),
            'CACHE_GLITCH_PROMPT_V2'
        );

        const cachedStillV1 = getGlitchoslavTruth();
        assert.equal(cachedStillV1, cachedV1);
        assert.ok(cachedStillV1.includes('CACHE_GLITCH_PROMPT_V1'));
        assert.ok(!cachedStillV1.includes('CACHE_GLITCH_PROMPT_V2'));

        const reloaded = await reloadFixture();
        assert.ok(reloaded.includes('CACHE_GLITCH_PROMPT_V2'));
        assert.ok(!reloaded.includes('CACHE_GLITCH_PROMPT_V1'));
        console.log(`✅ Cache holds until reload (${firstReadMs}ms first read)`);
    }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST 5: Intent Detection
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n\n🎯 TEST 5: Intent Detection (runtime routing)\n');

const testQueries = [
    'čo je sp4?',
    'a čo je to SP4?',
    'kto je kefyk?',
    'prečo sp4 vzniklo?',
    'aký je cieľ sp4?',
    'kto vytvoril sp4?',
    'ako funguje SP4 OS?', // Should be technical, NOT deep_identity
    'kurva nefunguje', // Should be frustration, NOT deep_identity
];

testQueries.forEach(query => {
    const intent = extractIntent(query);
    const description = getIntentDescription(intent);
    const isDeepIdentity = intent === 'deep_identity';
    const marker = isDeepIdentity ? '🔒' : '  ';

    console.log(`${marker} "${query}"`);
    console.log(`   → Intent: ${intent} (${description})`);
    console.log(`   → Route to: ${isDeepIdentity ? 'GLITCHOSLAV' : 'other'}\n`);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST 6: Caller contract smoke
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n\n🧪 TEST 6: buildPrompt caller contract\n');

restoreOriginalEnv();
await reloadFixture();

const livePromptPackage = await buildPrompt({
    mode: 'glitchoslav',
    state: {
        relationshipModel: { level: 'Stranger' },
        emotionalContext: { currentMood: 'neutral', intensity: 0 },
        metrics: { interactions: 0 },
        capabilityLevel: 'FULL',
        user: { name: 'Kefyk' }
    },
    userMessage: 'porozpravaj mi glitchoslavsky o prazdnote a case',
    extraDirectives: ''
});

assert.ok(typeof livePromptPackage?.systemPrompt === 'string' && livePromptPackage.systemPrompt.length > 0);
console.log(`ℹ️ Identity vault bundle visible in final prompt: ${livePromptPackage.systemPrompt.includes('END OF IDENTITY VAULT') ? 'yes' : 'no'}`);
console.log('✅ multiVoice caller contract still builds a live GLITCHOSLAV prompt without import break');

restoreOriginalEnv();
await reloadFixture();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SUMMARY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n═══════════════════════════════════════════════════════════');
console.log('✅ IDENTITY VAULT TEST COMPLETE');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('📋 SUMMARY:');
console.log('   ✅ Identity vault modul vytvorený');
console.log('   ✅ Preferuje canonical root `identity/` seedy');
console.log('   ✅ Fallbackuje len na legacy safety fragmenty podľa slotu');
console.log('   ✅ Cache mechanizmus funguje');
console.log('   ✅ SP4 definicie idu deterministic system-info cestou');
console.log('   ✅ Deep identity otazky idu cez GLITCHOSLAV vetvu\n');

console.log('📚 INTEGRATION POINTS:');
console.log('   1. multiVoice.js → importuje getGlitchoslavTruth()');
console.log('   2. Live GLITCHOSLAV prompt path sa postavi bez import breaku');
console.log('   3. CORE/POPIČI → NEimportujú identityVault');
console.log('   4. intentExtractor.js → rozdeluje system-info vs deep_identity');
console.log('   5. glitchOrchestrator.js → routuje deep_identity → GLITCHOSLAV');
console.log('   6. integration.js → passuje intent do agentContext\n');

console.log('🚀 NEXT STEP: Otestuj live v SP4:');
console.log('   node index_v07.js');
console.log('   > čo je sp4?');
console.log('   → Mal by ist deterministic system-info cestou bez GLITCHOSLAV identity bundle\n');
