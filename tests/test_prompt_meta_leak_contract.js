import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { buildPrompt } from '../multiVoice.js';

console.log('🧪 TEST: prompt safety layer meta-leak contract');

const pkg = await buildPrompt({
    mode: 'core',
    userMessage: 'a ten guard reason znamena co?',
    state: {},
    extraDirectives: ''
});

assert.ok(typeof pkg?.systemPrompt === 'string' && pkg.systemPrompt.length > 0, 'buildPrompt must return a non-empty systemPrompt');

assert.doesNotMatch(
    pkg.systemPrompt,
    /CRITICAL: Ak začneš zoznam|MUSÍŠ ho DOKONČIŤ|Nikdy nekonči v polovici bodu|\[INTERNAL_COMPLETION_RULE=/i,
    'system prompt must not contain the known user-visible meta leak sentence or raw INTERNAL markers'
);

assert.match(
    pkg.systemPrompt,
    /Ak začneš očíslovaný zoznam, dokonči ho celý\./,
    'system prompt must still carry terse list-completion guidance without raw INTERNAL markers'
);

const integrationSource = await fs.readFile(new URL('../integration.js', import.meta.url), 'utf8');

assert.match(
    integrationSource,
    /let sanitizedOutput = stripInternalPromptArtifacts\(candidateText\);/,
    'integration tail must strip raw INTERNAL prompt artifacts before helper cleanup'
);

assert.match(
    integrationSource,
    /const baseOutput = stripInternalPromptArtifacts\(sanitizedOutput \?\? output \?\? ''\);/,
    'integration tail must reapply INTERNAL artifact stripping at final output boundary'
);

const { stripInternalPromptArtifacts } = await import('../src/pipeline/postProcessUtils.js');

assert.equal(typeof stripInternalPromptArtifacts, 'function', 'stripInternalPromptArtifacts must be importable from postProcessUtils');

assert.equal(
    stripInternalPromptArtifacts('Vecná odpoveď. [INTERNAL_COMPLETION_RULE=list_must_finish] [INTERNAL_COMPLETION_RULE=never_leave_partial_numbered_item]'),
    'Vecná odpoveď.',
    'output guard must strip raw INTERNAL prompt markers from user-facing text'
);

assert.equal(
    stripInternalPromptArtifacts('Vecná odpoveď bez markerov.'),
    'Vecná odpoveď bez markerov.',
    'output guard must preserve clean user-facing text'
);

console.log('PASS: prompt boundary strips raw INTERNAL markers');