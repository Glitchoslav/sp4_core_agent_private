// Phase 5 runtime quality - quick validation
import { detectSP4Query } from '../src/core/sp4GroundingKnowledge.js';
import { isFollowUpQuestion } from '../src/dialogue/dialogueState.js';
import { getDeterministicCapabilityResponse, getDeterministicShortTechResponse } from '../src/routing/deterministicRegistry.js';

let total = 0, passed = 0;
function check(label, got, expected) {
    total++;
    const ok = expected === null ? got === null : got !== null;
    if (ok) { passed++; process.stdout.write('  ✅ ' + label + '\n'); }
    else { process.stdout.write('  ❌ FAIL ' + label + ' => ' + (got ? got.slice(0, 60) : 'NULL') + '\n'); }
}

console.log('\n── A. SHORT TECH DEFINITIONS ────────────────────────────');
check('čo je IP adresa', getDeterministicShortTechResponse('co je IP adresa'), 'x');
check('čo je TCP', getDeterministicShortTechResponse('co je TCP'), 'x');
check('čo je ping', getDeterministicShortTechResponse('co je ping'), 'x');
check('čo je localhost', getDeterministicShortTechResponse('co je localhost'), 'x');
check('čo je cache', getDeterministicShortTechResponse('co je cache'), 'x');
check('čo znamena 404', getDeterministicShortTechResponse('co znamena 404'), 'x');
check('čo je dns', getDeterministicShortTechResponse('co je dns'), 'x');
check('čo je port', getDeterministicShortTechResponse('co je port'), 'x');
check('čo je api', getDeterministicShortTechResponse('co je api'), 'x');
check('čo je http', getDeterministicShortTechResponse('co je http'), 'x');
check('port v ollama', getDeterministicShortTechResponse('ako nastavim port v ollama'), 'x');
// Should NOT match generic
check('no match: čo je auto', getDeterministicShortTechResponse('co je auto'), null);
check('no match: čo je obloha', getDeterministicShortTechResponse('co je obloha'), null);

console.log('\n── B. CAPABILITY RESPONSES ──────────────────────────────');
check('ovladaš fyziku?', getDeterministicCapabilityResponse('ovladas fyziku'), 'x');
check('vieš historiu?', getDeterministicCapabilityResponse('vies historiu'), 'x');
check('rozumies medicine?', getDeterministicCapabilityResponse('rozumies medicine'), 'x');
check('vies mi vysvetlit kvantovu fyziku?', getDeterministicCapabilityResponse('vies mi vysvetlit kvantovu fyziku'), 'x');
// General fallback for unknown topic
check('vieš blabolenie?', getDeterministicCapabilityResponse('vies blabolenie'), 'x');

console.log('\n── C. SP4 GROUNDING - wrong domain fix ──────────────────');
// Non-SP4 queries MUST return null (not inject SP4 architecture facts)
check('co je kvantova fyzika -> null', detectSP4Query('co je kvantova fyzika'), null);
check('vysvetli nieco -> null', detectSP4Query('vysvetli nieco'), null);
check('co je cache -> null', detectSP4Query('co je cache'), null);
check('co je tcp -> null', detectSP4Query('co je tcp'), null);
// SP4 queries MUST still match
check('co je sp4 -> match', detectSP4Query('co je sp4'), 'x');
check('sp4 architektura -> match', detectSP4Query('sp4 architektura'), 'x');

console.log('\n── D. FOLLOW-UP PATTERNS ────────────────────────────────');
// isFollowUpQuestion needs a dlgState with getLastUserTurn()
const mockDlg = {
    getLastUserTurn: () => ({ text: 'co je cache' }),
    getPreviousTurn: () => null,
    getLastAssistantTurn: () => null,
};
function fu(msg) { return isFollowUpQuestion(msg, mockDlg); }
check('a naco je to? -> follow-up', fu('a naco je to') ? 'yes' : null, 'x');
check('ako sa pouziva? -> follow-up', fu('ako sa pouziva') ? 'yes' : null, 'x');
check('kde sa pouziva? -> follow-up', fu('kde sa pouziva') ? 'yes' : null, 'x');
check('a preco? -> follow-up', fu('a preco') ? 'yes' : null, 'x');
check('a takze -> follow-up', fu('a takze') ? 'yes' : null, 'x');
// Non-follow-up full questions should NOT match
check('ake je pocasie dnes? -> NOT follow-up', fu('ake je pocasie dnes') ? 'yes' : null, null);

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('PHASE 5 QUICK TEST: ' + passed + '/' + total + ' passed');
if (passed < total) process.exit(1);
