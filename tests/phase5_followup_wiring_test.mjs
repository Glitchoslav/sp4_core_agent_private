// tests/phase5_followup_wiring_test.mjs
// Testuje deterministickú follow-up vrstvu (KROK 2-4, Phase 5 wiring)
// Pracuje výhradne v C:\SP4KULT\sp4_core_agent
import { resolveDeterministicFollowUp } from '../src/dialogue/dialogueState.js';

// Simulovaný dialogueState so záznami predchádzajúcich turns
function makeDlgState({ lastUserText = '', lastAssistantText = '', topic = null } = {}) {
    return {
        currentTopic: topic,
        getLastUserTurn: () => lastUserText ? { text: lastUserText } : null,
        getLastAssistantTurn: () => lastAssistantText ? { text: lastAssistantText } : null,
        getPreviousTurn: (role, pred) => {
            if (role === 'user') return lastUserText ? { text: lastUserText } : null;
            return null;
        },
        getHistory: () => [
            ...(lastUserText ? [{ role: 'user', text: lastUserText }] : []),
            ...(lastAssistantText ? [{ role: 'assistant', text: lastAssistantText }] : []),
        ],
        getLastNTurns: (n) => [],
    };
}

const tests = [
    {
        label: 'A',
        prev: 'čo je cache',
        prevAnswer: 'Cache je dočasná pamäť, kde sa ukladajú výsledky náročných operácií pre rýchlejší opätovný prístup. Keď sa dáta znovu potrebujú, načítavajú sa z cache, nie z pomalšieho úložiska.',
        followUp: 'a načo je to?',
        topic: null,
    },
    {
        label: 'B',
        prev: 'čo je API',
        prevAnswer: 'API (Application Programming Interface) je rozhranie, cez ktoré dve aplikácie komunikujú. Definuje, aké požiadavky môžeš posielať a v akej forme dostaneš odpoveď.',
        followUp: 'a ako sa používa?',
        topic: null,
    },
    {
        label: 'C',
        prev: 'čo robí wifi router',
        prevAnswer: 'Wifi router preposiela dáta medzi tvojou lokálnou sieťou a internetom. Prideľuje IP adresy zariadeniam v sieti a riadi dátový tok.',
        followUp: 'a potom?',
        topic: null,
    },
    {
        label: 'D',
        prev: 'kde je Slovensko',
        prevAnswer: 'Slovensko je krajina v strednej Európe, hraničiaca s Českom, Poľskom, Maďarskom, Rakúskom a Ukrajinou.',
        followUp: 'a vedľa čoho?',
        topic: null,
    },
];

let passed = 0, partial = 0, failed = 0;

console.log('\n══ PHASE 5 FOLLOW-UP WIRING TEST ══════════════════════════\n');

for (const t of tests) {
    const dlg = makeDlgState({
        lastUserText: t.prev,
        lastAssistantText: t.prevAnswer,
        topic: t.topic,
    });

    const result = resolveDeterministicFollowUp(t.followUp, dlg);
    const path = result ? 'deterministic' : 'llm_fallback';
    const matched = result !== null;

    console.log(`── Pair ${t.label} ─────────────────────────────────────────`);
    console.log(`  input:          "${t.prev}" → "${t.followUp}"`);
    console.log(`  selected path:  ${path}`);
    console.log(`  matched:        ${matched}`);
    console.log(`  output:         ${result ? result.slice(0, 120) + (result.length > 120 ? '...' : '') : '(none — falls to LLM)'}`);

    if (matched) {
        console.log(`  verdict:        ✅ PASS (deterministic match)`);
        passed++;
    } else {
        // For C and D, llm fallback is acceptable
        if (t.label === 'C' || t.label === 'D') {
            console.log(`  verdict:        ⚠️  PARTIAL (LLM fallback — acceptable for vague follow-up)`);
            partial++;
        } else {
            console.log(`  verdict:        ❌ FAIL (expected deterministic match)`);
            failed++;
        }
    }
    console.log();
}

console.log('═══════════════════════════════════════════════════════════');
console.log(`TOTAL: ${passed} PASS | ${partial} PARTIAL | ${failed} FAIL`);
if (failed === 0) {
    console.log('VERDICT: ✅ Follow-up deterministic branch functional');
} else {
    console.log('VERDICT: ❌ Some cases need improvement');
    process.exit(1);
}
