import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolvePolicy } from '../src/policy/policy.js';
import { runBootSequence } from '../src/startup/bootSequence.js';
import { SP4_VERSION } from '../src/version.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_ROOT = path.resolve(__dirname, '..', '..');
const RUNTIME_ROOT = path.resolve(__dirname, '..');

async function readJson(filePath) {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readText(filePath) {
    return fs.readFile(filePath, 'utf8');
}

function sectionAfter(text, marker) {
    const index = text.indexOf(marker);
    if (index === -1) return '';
    return text.slice(index + marker.length);
}

function sectionBefore(text, marker) {
    const index = text.indexOf(marker);
    if (index === -1) return text;
    return text.slice(0, index);
}

function assertLegacyScriptsAreExplicit(packageJson, label) {
    const scripts = packageJson.scripts || {};
    const expectedStart = label === 'workspace-root'
        ? 'node sp4_core_agent/sp4.js start'
        : 'node sp4.js start';

    assert.equal(scripts.start, expectedStart, `${label}: default start must point to sp4.js start`);
    assert.ok(!('http' in scripts), `${label}: default http script must not exist`);
    assert.ok(!('server' in scripts), `${label}: default server script must not exist`);

    for (const [scriptName, command] of Object.entries(scripts)) {
        const isLegacyCommand = /start-http-server\.js|(?:^|\s)server\.js(?:$|\s)/.test(command);
        if (isLegacyCommand) {
            assert.match(scriptName, /legacy/i, `${label}: legacy launcher must stay behind an explicit legacy script name`);
        }
    }
}

function assertOrdered(text, parts, label) {
    let cursor = 0;
    for (const part of parts) {
        const index = text.indexOf(part, cursor);
        assert.notEqual(index, -1, `${label}: missing or out of order marker "${part}"`);
        cursor = index + part.length;
    }
}

async function run() {
    const workspacePackage = await readJson(path.join(WORKSPACE_ROOT, 'package.json'));
    const runtimePackage = await readJson(path.join(RUNTIME_ROOT, 'package.json'));
    const rootReadme = await readText(path.join(WORKSPACE_ROOT, 'README.md'));
    const runtimeReadme = await readText(path.join(RUNTIME_ROOT, 'README.md'));
    const canonicalDocs = await Promise.all([
        readText(path.join(RUNTIME_ROOT, 'docs', 'SP4_IDENTITY_BIBLE.md')),
        readText(path.join(RUNTIME_ROOT, 'docs', 'SP4_COPILOT_DIRECTIVES.md')),
        readText(path.join(RUNTIME_ROOT, 'docs', 'ARCHITECTURE_v1.0.md')),
    ]);
    const [masterAuthority, pathAuthorityMap, sourceOfTruthMap, bugBuckets, identityFinalState, runtimeDiscipline] = await Promise.all([
        readText(path.join(WORKSPACE_ROOT, 'SP4_MASTER_AUTHORITY.md')),
        readText(path.join(WORKSPACE_ROOT, 'PATH_AUTHORITY_MAP.md')),
        readText(path.join(WORKSPACE_ROOT, 'SOURCE_OF_TRUTH_MAP.md')),
        readText(path.join(WORKSPACE_ROOT, 'BUG_BUCKETS.md')),
        readText(path.join(WORKSPACE_ROOT, 'SP4_IDENTITY_FINAL_STATE.md')),
        readText(path.join(RUNTIME_ROOT, 'docs', 'guides', 'RUNTIME_DISCIPLINE.md')),
    ]);
    const repoTruth = await readText(path.join(WORKSPACE_ROOT, 'REPO_TRUTH.md'));

    assertLegacyScriptsAreExplicit(workspacePackage, 'workspace-root');
    assertLegacyScriptsAreExplicit(runtimePackage, 'runtime-root');

    assert.match(runtimePackage.scripts['test:gate'], /test_runtime_authority_contract\.js/, 'runtime test:gate must include runtime authority contract');
    assert.match(runtimePackage.scripts['test:gate:win'], /test_runtime_authority_contract\.js/, 'runtime test:gate:win must include runtime authority contract');
    assert.equal(runtimePackage.scripts['test:live:battletest'], 'node battletest.js', 'runtime default battletest script must stay on the canonical battletest wrapper');
    assert.match(runtimePackage.scripts['test:live:battletest:50'], /SP4_BATTLETEST_ID=test_010/, 'runtime legacy 50-case battletest script must stay explicit');

    const boot = await runBootSequence({ quiet: true, autoStartOllama: false });
    assert.equal(boot.version, SP4_VERSION, 'boot sequence version must match src/version.js');
    assert.equal(runtimePackage.version, SP4_VERSION, 'package.json version must match src/version.js');

    assert.match(rootReadme, /sp4\.js start/i, 'root README must document sp4.js start');
    assert.match(rootReadme, /sp4\.js status/i, 'root README must document sp4.js status');
    assert.match(rootReadme, /sp4\.js doctor/i, 'root README must document sp4.js doctor');
    assert.doesNotMatch(rootReadme, /\bnpm run serve\b/i, 'root README must not mention removed serve flow');

    const rootLegacySection = sectionAfter(rootReadme, '## Legacy izolácia');
    const rootPreLegacy = sectionBefore(rootReadme, '## Legacy izolácia');
    assert.match(rootLegacySection, /server:legacy|http:legacy/i, 'root README legacy section must name explicit legacy scripts');
    assert.doesNotMatch(rootPreLegacy, /start-http-server\.js|server\.js|\bnpm run serve\b/i, 'root README active section must stay free of legacy launchers');

    assert.match(runtimeReadme, /Workspace onboarding source of truth/i, 'runtime README must declare owner boundary');
    assert.doesNotMatch(runtimeReadme, /\bnpm run serve\b/i, 'runtime README must not mention removed serve flow');
    const runtimeLegacySection = sectionAfter(runtimeReadme, '### LEGACY HTTP flow');
    const runtimePreLegacy = sectionBefore(runtimeReadme, '### LEGACY HTTP flow');
    assert.match(runtimeLegacySection, /server:legacy|http:legacy/i, 'runtime README legacy section must keep explicit legacy names');
    assert.doesNotMatch(runtimePreLegacy, /start-http-server\.js|server\.js/i, 'runtime README active section must stay free of legacy launchers');
    assert.match(runtimeReadme, /test:live:battletest[\s\S]{0,120}default:\s*test_014[\s\S]{0,40}214 otázok/i, 'runtime README must describe test_014 as the default battletest');
    assert.match(runtimeReadme, /Legacy 50-case baseline[\s\S]{0,120}test_010[\s\S]{0,160}test:live:battletest:50/i, 'runtime README must keep test_010 only as the explicit legacy baseline');

    for (const documentText of canonicalDocs) {
        assert.match(documentText, /law\/contract only/i, 'canonical docs must mark contract-only scope');
        assert.match(documentText, /nie je runtime source of truth/i, 'canonical docs must say they are not runtime source of truth');
    }

    assert.match(masterAuthority, /podriadené orientačné mapy/i, 'master authority must declare SOURCE/PATH maps subordinate');
    assert.match(masterAuthority, /sp4_core_agent\/docs\/SYSTEM_RUNTIME_MAP\.json/i, 'master authority must name the canonical SYSTEM_RUNTIME_MAP path');
    assert.match(masterAuthority, /`?test_runtime_authority_contract\.js`?[\s\S]{0,80}kritické tvrdenia/i, 'master authority must reflect that the contract test now covers critical governance claims');

    assert.match(pathAuthorityMap, /glitchNormalizeSk/i, 'path authority map tail description must mention glitchNormalizeSk');
    assert.match(pathAuthorityMap, /applyFallbackTruth/i, 'path authority map tail description must mention applyFallbackTruth');
    assert.match(pathAuthorityMap, /validateGroundedResponse/i, 'path authority map tail description must mention validateGroundedResponse');
    assert.match(pathAuthorityMap, /INTEGRATION_TAIL_AUDIT\.md/i, 'path authority map must point to the current-state tail audit');
    assert.doesNotMatch(pathAuthorityMap, /Inline tail: sanitizeAiCliches, cleanupWeirdSlovak, stripResidualEnglish, enforceSlovak/i, 'path authority map must not regress to the stale tail shorthand');

    assert.match(sourceOfTruthMap, /Runtime law \/ current-state tail authority/i, 'source of truth map must declare runtime law / current-state tail authority');
    assert.match(sourceOfTruthMap, /SP4_MASTER_AUTHORITY\.md/i, 'source of truth map must list active governance authority docs');
    assert.match(sourceOfTruthMap, /PATH_AUTHORITY_MAP\.md/i, 'source of truth map must list path authority map as active governance authority');
    assert.match(sourceOfTruthMap, /SP4_IDENTITY_FINAL_STATE\.md/i, 'source of truth map must list SP4_IDENTITY_FINAL_STATE as active governance authority');
    assert.doesNotMatch(sourceOfTruthMap, /autoritativny audit vsetkych identity vrstiev/i, 'source of truth map must not describe archived governance audit as current authority');

    assertOrdered(repoTruth, [
        'Toto je pravidlo import + authority.',
        'SP4 nie je repo-driven systém; je authority-driven systém.',
        'SP4 nie je repo-driven systém; je authority-driven systém. Source of truth pre runtime je git repo sp4_core_agent_private v C:\\SP4KULT\\sp4_core_agent; C:\\SP4KULT je integračný workspace obal a live systém zároveň používa potvrdené workspace-level závislosti mimo tohto repo.',
        '1. Pri konflikte nevyhráva automaticky sp4_core_agent. Vyhráva komponent, ktorý je označený ako autorita v SP4_MASTER_AUTHORITY.md alebo PATH_AUTHORITY_MAP.md. sp4_core_agent má prednosť iba vtedy, ak neexistuje explicitná výnimka.'
    ], 'repo truth authority snapshot');
    assert.doesNotMatch(repoTruth, /Ak je konflikt medzi root workspace a sp4_core_agent, vždy vyhráva sp4_core_agent\./i, 'repo truth must not keep the stale unconditional runtime-first rule');

    assert.match(bugBuckets, /držať runtime tail contract/i, 'bug buckets must frame tail follow-up as contract maintenance');
    assert.match(bugBuckets, /RUNTIME_DISCIPLINE\.md/i, 'bug buckets must point to runtime discipline');
    assert.match(bugBuckets, /INTEGRATION_TAIL_AUDIT\.md/i, 'bug buckets must point to integration tail audit');
    assert.doesNotMatch(bugBuckets, /^1\. postprocess guardy, ktoré ešte vedia zhoršiť dobrý text po generovaní/m, 'bug buckets must not keep the stale broad cleanup priority');

    assertOrdered(identityFinalState, [
        'normalizePersona()',
        'extractIntent()',
        'detectIdentityHardening()',
        'buildPrompt()'
    ], 'identity final state flow');
    assert.match(identityFinalState, /applyFallbackTruth\(\) → validateGroundedResponse\(\)/, 'identity final state must show grounded validation before immune / response control');
    assert.doesNotMatch(identityFinalState, /detectIdentityHardening\(\) → identityPatterns\.js/, 'identity final state must not place detectIdentityHardening inside post-processing');

    assert.match(runtimeDiscipline, /source-of-truth check \(`node tests\/test_runtime_authority_contract\.js`\)/i, 'runtime discipline docs-only exception must name the source-of-truth command');
    assert.match(runtimeDiscipline, /authority consistency check \(`node tests\/test_runtime_authority_contract\.js`\)/i, 'runtime discipline docs-only exception must name the authority consistency command');

    const defaultPolicy = resolvePolicy({});
    assert.equal(defaultPolicy.allowCloud, false, 'default policy must stay local-first');
    assert.equal(defaultPolicy.route, 'local-first', 'default policy route must stay local-first');

    const explicitCloudPolicy = resolvePolicy({ allowCloud: true });
    assert.equal(explicitCloudPolicy.allowCloud, true, 'cloud must require explicit opt-in');

    console.log('PASS: runtime authority contract');
}

run().catch((error) => {
    console.error(`FAIL: ${error.message}`);
    process.exitCode = 1;
});
