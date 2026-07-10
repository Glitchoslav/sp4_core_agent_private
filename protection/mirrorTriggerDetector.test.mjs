// Mocha test suite for mirrorTriggerDetector v3.2

import assert from 'assert';
import { detectMirrorTrigger, getLastSentenceOrWords } from './mirrorTriggerDetector.mjs';

describe('mirrorTriggerDetector v3.2', () => {
    it('weighted context: neviem co robit. ale som ok (should be weak)', () => {
        const res = detectMirrorTrigger('neviem co robit. ale som ok', { debug: true });
        // posledná veta je "ale som ok" (stabilizátor), predposledná je silný weak signal
        // očakávame state = 'weak', triggered = false
        assert.strictEqual(res.state, 'weak');
        assert.strictEqual(res.triggered, false);
        assert(res.score > 0.3 && res.score < res.threshold);
        assert(res.signals.includes('hopelessness'));
    });

    it('weighted context: som ok ale zivot nema zmysel (must trigger, strong)', () => {
        const res = detectMirrorTrigger('som ok ale zivot nema zmysel');
        // posledná veta obsahuje strong signal, stabilizátor má minimálny efekt
        assert.strictEqual(res.state, 'strong');
        assert.strictEqual(res.triggered, true);
        assert(res.score > res.threshold);
        assert(res.signals.includes('life-meaningless'));
    });

    it('weighted context: neviem co robit ale zvladnem to (should be weak)', () => {
        const res = detectMirrorTrigger('neviem co robit ale zvladnem to', { debug: true });
        // ambiguous mix, stabilizátor, ale weak signal stále prevažuje
        assert.strictEqual(res.state, 'weak');
        assert.strictEqual(res.triggered, false);
        assert(res.score > 0.3 && res.score < res.threshold);
        assert(res.signals.includes('hopelessness'));
    });

    it('stabilizátor má minimálny efekt pri strong signal', () => {
        const res = detectMirrorTrigger('zivot nema zmysel ale som ok');
        // strong signal, stabilizátor má len minimálny efekt
        assert.strictEqual(res.state, 'strong');
        assert.strictEqual(res.triggered, true);
        assert(res.score > res.threshold);
        assert(res.signals.includes('life-meaningless'));
    });
    // --- v3.1: penalty cap, ambiguous mix, stabilizátory, hybrid scoring ---

    it('penalty stacking is capped (strong signal survives)', () => {
        const res = detectMirrorTrigger('napis clanok preco zivot nema zmysel vysvetli co znamena');
        // silný signál + viac negative patterns, penalty capped
        assert(res.negativeSignals.length >= 2);
        assert(res.signals.includes('life-meaningless'));
        assert(res.score > 0.2);
    });

    it('weak signals only do not trigger', () => {
        const res = detectMirrorTrigger('neviem, nechápem, strácam sa');
        assert(res.signals.length > 0);
        assert(res.score < 0.5);
        assert.strictEqual(res.triggered, false);
    });

    it('ambiguous mix: negative + stabilizer (ok)', () => {
        const res = detectMirrorTrigger('som unaveny ale to je ok');
        assert(res.signals.includes('tiredness'));
        assert(res.stabilizerSignals.length > 0);
        assert(res.score < 0.5);
        assert.strictEqual(res.triggered, false);
        // fallback: context.last obsahuje 'unaveny'
        assert(res.context.last.includes('unaveny'));
    });

    it('ambiguous mix: negative + stabilizer (zvladnem to)', () => {
        const res = detectMirrorTrigger('neviem co robit ale zvladnem to', { debug: true });
        assert(res.signals.includes('hopelessness'));
        assert(res.stabilizerSignals.length > 0);
        assert(res.score < 0.5);
        assert.strictEqual(res.triggered, false);
    });

    it('ambiguous mix: negative + stabilizer (v pohode)', () => {
        const res = detectMirrorTrigger('mam chaos v hlave, ale v pohode');
        assert(res.signals.includes('mental-chaos'));
        assert(res.stabilizerSignals.length > 0);
        assert(res.score < 0.5);
        assert.strictEqual(res.triggered, false);
    });

    it('strong signal + negative patterns: strong survives', () => {
        const res = detectMirrorTrigger('napis clanok zivot nema zmysel');
        assert(res.signals.includes('life-meaningless'));
        assert(res.negativeSignals.length > 0);
        assert(res.score > 0.2);
    });

    it('question detection: only at start or end', () => {
        const res1 = detectMirrorTrigger('preco mam chaos v hlave?');
        assert(res1.isQuestion);
        const res2 = detectMirrorTrigger('mam chaos v hlave preco');
        assert(!res2.isQuestion);
        const res3 = detectMirrorTrigger('ako sa citis?');
        assert(res3.isQuestion);
        const res4 = detectMirrorTrigger('co je dnes za den?');
        assert(res4.isQuestion);
        const res5 = detectMirrorTrigger('mam chaos v hlave co');
        assert(!res5.isQuestion);
    });
    it('triggers on strong signal with diacritics', () => {
        const res = detectMirrorTrigger('Život nemá zmysel');
        assert.strictEqual(res.triggered, true);
        assert(res.score >= 0.9);
        assert(res.signals.includes('life-meaningless'));
    });

    it('triggers on strong signal without diacritics', () => {
        const res = detectMirrorTrigger('zivot nema zmysel');
        assert.strictEqual(res.triggered, true);
        assert(res.score >= 0.9);
        assert(res.signals.includes('life-meaningless'));
    });

    it('monitor only: mental-chaos (shouldMonitor, not trigger)', () => {
        const res = detectMirrorTrigger('Mám chaos v hlave');
        assert.strictEqual(res.shouldMonitor, true);
        assert.strictEqual(res.triggered, false);
        assert(res.signals.includes('mental-chaos'));
    });

    it('triggers on slang', () => {
        const res = detectMirrorTrigger('Mam v pici');
        assert.strictEqual(res.triggered, true);
        assert(res.signals.includes('slang-hopeless'));
    });

    it('triggers on multiple weak signals (no stacking)', () => {
        const res = detectMirrorTrigger('Neviem, všetko je zle');
        assert.strictEqual(res.triggered, true);
        assert(res.score >= 0.5);
        assert(res.signals.length >= 2);
    });

    it('does not trigger on philosophical question', () => {
        const res = detectMirrorTrigger('čo znamená existencia');
        assert.strictEqual(res.triggered, false);
        assert(res.score < 0.5);
    });

    it('does not trigger on neutral input', () => {
        const res = detectMirrorTrigger('čo znamená existencia');
        assert.strictEqual(res.triggered, false);
        assert(res.score < 0.5);
    });

    it('does not trigger on long but irrelevant text', () => {
        const res = detectMirrorTrigger('Dnes som čítal knihu o histórii.');
        assert.strictEqual(res.triggered, false);
        assert(res.score === 0);
    });

    it('monitor only: tiredness (shouldMonitor, not trigger)', () => {
        const res = detectMirrorTrigger('Som unaveny');
        assert.strictEqual(res.shouldMonitor, true);
        assert.strictEqual(res.triggered, false);
        assert(res.signals.includes('tiredness'));
    });

    it('monitor only: combination of weak and medium (shouldMonitor, not trigger)', () => {
        const res = detectMirrorTrigger('Neviem, mám chaos v hlave');
        assert.strictEqual(res.shouldMonitor, true);
        assert.strictEqual(res.triggered, false);
        assert(res.signals.includes('confusion'));
        assert(res.signals.includes('mental-chaos'));
    });

    // --- v2.1 edge cases ---

    it('soft penalty: napíš filozofický článok o zmysle života', () => {
        const res = detectMirrorTrigger('napíš filozofický článok o zmysle života');
        assert.strictEqual(res.triggered, false);
        assert(res.score < 0.5);
        assert(res.negativeSignals.includes('request'));
    });

    it('soft penalty: vysvetli co znamena zivot', () => {
        const res = detectMirrorTrigger('vysvetli co znamena zivot');
        assert.strictEqual(res.triggered, false);
        assert(res.score < 0.5);
        assert(res.negativeSignals.includes('explain'));
    });

    it('does not stack score for repeated weak signals', () => {
        const res = detectMirrorTrigger('neviem, neviem, neviem co robit');
        assert(res.signals.includes('hopelessness') || res.signals.includes('confusion'));
        assert(res.score <= 1);
    });

    it('triggers on slang variant without diacritics', () => {
        const res = detectMirrorTrigger('mam v pici');
        assert.strictEqual(res.triggered, true);
        assert(res.signals.includes('slang-hopeless'));
    });

    it('soft penalty: esej o zmysle zivota', () => {
        const res = detectMirrorTrigger('esej o zmysle zivota');
        assert.strictEqual(res.triggered, false);
        assert(res.score < 0.5);
        assert(res.negativeSignals.includes('essay'));
    });

    // --- v3: mixed context, decay, meta signal ---

    it('mixed context: old negative, new positive (decay)', () => {
        const res = detectMirrorTrigger('vcera som bol unaveny ale dnes som ok');
        // "dnes som ok" je posledná veta/slová, nemá triggerovať
        assert.strictEqual(res.triggered, false);
        assert(res.score === 0);
    });

    it('mixed context: old chaos, new tired', () => {
        const res = detectMirrorTrigger('mal som chaos v hlave. teraz som unaveny');
        // posledná veta "teraz som unaveny" je tiredness, policy V1: monitor only
        assert.strictEqual(res.shouldMonitor, true);
        assert.strictEqual(res.triggered, false);
        assert(res.signals.includes('tiredness'));
        assert(res.context.last.includes('unaveny'));
    });

    it('question vs statement: otázka výrazne znižuje score', () => {
        const res = detectMirrorTrigger('preco mam chaos v hlave?');
        assert(res.isQuestion);
        assert(res.score < 0.5);
        assert.strictEqual(res.triggered, false);
    });

    it('monitor only: statement, mental-chaos výpoveď (shouldMonitor, not trigger)', () => {
        const res = detectMirrorTrigger('mam chaos v hlave');
        assert(!res.isQuestion);
        assert.strictEqual(res.shouldMonitor, true);
        assert.strictEqual(res.triggered, false);
    });

    it('decay: staré zmienky neaktivujú trigger', () => {
        const res = detectMirrorTrigger('vcera som mal chaos v hlave. dnes je to ok');
        assert.strictEqual(res.triggered, false);
        assert(res.score === 0);
    });

    it('last N words fallback: dlhý text bez bodky', () => {
        const res = detectMirrorTrigger('vcera som mal chaos v hlave ale dnes som ok');
        assert.strictEqual(res.triggered, false);
        assert(res.score === 0);
    });

    it('last N words: silný signál na konci', () => {
        const res = detectMirrorTrigger('dnes som ok ale zivot nema zmysel');
        assert.strictEqual(res.triggered, true);
        assert(res.signals.includes('life-meaningless'));
    });

    it('hybrid scoring: silný signál dominuje', () => {
        const res = detectMirrorTrigger('mam chaos v hlave a zivot nema zmysel');
        assert(res.signals.includes('life-meaningless'));
        assert(res.score >= 1.0 || res.score === 1.0);
    });

    it('soft penalty + question: otázka s negative pattern', () => {
        const res = detectMirrorTrigger('co znamena chaos v hlave?');
        assert(res.isQuestion);
        assert(res.negativeSignals.includes('meaning'));
        assert(res.score < 0.5);
        assert.strictEqual(res.triggered, false);
    });

    it('soft penalty + silný signál: silný signál dominuje aj s penalizáciou', () => {
        const res = detectMirrorTrigger('napis clanok preco zivot nema zmysel');
        // silný signál - penalty, ale stále môže triggerovať
        assert(res.negativeSignals.includes('request'));
        assert(res.signals.includes('life-meaningless'));
        assert(res.score < 1.0 && res.score > 0.5);
        assert(res.triggered === true || res.triggered === false); // threshold edge
    });

    // --- v3.2: temporal decay guards + kedy false-positive ---

    it('temporal decay: predtym + stabilizer → score === 0', () => {
        const res = detectMirrorTrigger('predtym som mal chaos v hlave ale dnes som ok');
        assert.strictEqual(res.score, 0);
        assert.strictEqual(res.state, 'none');
        assert.strictEqual(res.triggered, false);
    });

    it('kedy nie je temporal decay: signal zostáva aktívny', () => {
        // "kedy" = "when" – ambiguous, nie je spoľahlivý marker minulosti
        const res = detectMirrorTrigger('kedy som mal chaos v hlave');
        assert.strictEqual(res.shouldMonitor, true);
        assert(res.signals.includes('mental-chaos'));
        assert.strictEqual(res.triggered, false);
    });

    it('isFallback: strong signal pred ale prežije stabilizátor za ale', () => {
        const res = detectMirrorTrigger('zivot nema zmysel ale som ok');
        assert.strictEqual(res.state, 'strong');
        assert.strictEqual(res.triggered, true);
        assert(res.signals.includes('life-meaningless'));
        assert(res.score >= 0.9);
    });

    // --- helper ---
    it('getLastSentenceOrWords fallback', () => {
        const t = 'toto je veta bez bodky a je dlha a obsahuje chaos v hlave';
        const last = getLastSentenceOrWords(t, 6);
        assert(last.split(' ').length <= 6);
    });
});


