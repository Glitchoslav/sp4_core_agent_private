/**
 * KROK 29 — languageAuthority signal fix: 9-vetový test set
 */
import { detectEnglishRatio, isValidSlovak } from '../src/core/languageAuthority.js';

// Prahy z responseFilter observability:
// enRatio > 0.25 → SANITY trigger
const SANITY_THRESHOLD = 0.25;
// isValidSlovak=false pri EN texte = správne správanie

const TESTS = [
    // --- ČISTÁ SK ---
    {
        group: 'SK',
        text: 'Ahoj, ako sa máš dnes?',
        expectedSanity: false,   // enRatio by mal ostať nízky
        expectedValidSlovak: true
    },
    {
        group: 'SK',
        text: 'Som tu, ak potrebuješ porozprávať.',
        expectedSanity: false,
        expectedValidSlovak: true
    },
    {
        group: 'SK',
        text: 'Čo chceš vedieť o SP4 komunite?',
        expectedSanity: false,
        expectedValidSlovak: true
    },
    // --- ČISTÁ EN (dnes failing — mali by triggernúť po fixe) ---
    {
        group: 'EN',
        text: 'You should try this approach for better results.',
        expectedSanity: true,    // enRatio by mal byť > 0.25
        expectedValidSlovak: false
    },
    {
        group: 'EN',
        text: 'This system allows users to customize their experience.',
        expectedSanity: true,
        expectedValidSlovak: false
    },
    {
        group: 'EN',
        text: 'Let me know if you need any help with this feature.',
        expectedSanity: true,
        expectedValidSlovak: false
    },
    // --- MIXED ---
    {
        group: 'MIXED',
        text: 'SP4 is a community project zameraný na slobodu.',
        expectedSanity: true,    // buď cez enRatio alebo mixedLang
        expectedValidSlovak: null  // neurčité — závisí od pomeru
    },
    {
        group: 'MIXED',
        text: 'Toto je approach which makes sense pre nás.',
        expectedSanity: true,
        expectedValidSlovak: null
    },
    {
        group: 'MIXED',
        text: 'Fajn, I understand čo tým myslíš.',
        expectedSanity: true,
        expectedValidSlovak: null
    }
];

console.log('\n=== KROK 29 — languageAuthority SIGNAL FIX TEST ===\n');

let passed = 0;
let failed = 0;
let fpCount = 0;

for (const t of TESTS) {
    const { ratio, englishHits, totalWords } = detectEnglishRatio(t.text);
    const validSlovak = isValidSlovak(t.text);
    const wouldTriggerSanity = ratio > SANITY_THRESHOLD;

    const sanityActual = wouldTriggerSanity ? 'SANITY' : 'quiet';
    const sanityExpected = t.expectedSanity ? 'SANITY' : 'quiet';
    const sanityPass = sanityActual === sanityExpected;

    const validSlovakPass = t.expectedValidSlovak === null
        ? true  // neurčité — nehodnotíme
        : validSlovak === t.expectedValidSlovak;

    const testPass = sanityPass && validSlovakPass;
    if (testPass) passed++; else failed++;

    // False positive = SK skupina ale SANITY triggered
    if (t.group === 'SK' && wouldTriggerSanity) fpCount++;

    console.log(`TEST: "${t.text}"`);
    console.log(`  GROUP:           ${t.group}`);
    console.log(`  EN_RATIO:        ${ratio.toFixed(3)}  (hits: ${englishHits}/${totalWords})`);
    console.log(`  IS_VALID_SLOVAK: ${validSlovak}`);
    console.log(`  EXPECTED:        sanity=${sanityExpected}, isValidSlovak=${t.expectedValidSlovak ?? 'n/a'}`);
    console.log(`  ACTUAL:          sanity=${sanityActual}, isValidSlovak=${validSlovak}`);
    console.log(`  RESULT:          ${testPass ? '✓ PASS' : '✗ FAIL'}`);
    if (!sanityPass) {
        console.log(`  NOTE:            sanity mismatch — expected ${sanityExpected}, got ${sanityActual} (ratio=${ratio.toFixed(3)})`);
    } else if (!validSlovakPass) {
        console.log(`  NOTE:            isValidSlovak mismatch — expected ${t.expectedValidSlovak}, got ${validSlovak}`);
    } else {
        const notes = {
            SK: 'Čistá SK — ticho, správne.',
            EN: `EN zachytená — ratio ${ratio.toFixed(2)} > ${SANITY_THRESHOLD}.`,
            MIXED: `Mixed — ratio ${ratio.toFixed(2)}, isValidSlovak=${validSlovak}.`
        };
        console.log(`  NOTE:            ${notes[t.group]}`);
    }
    console.log('');
}

console.log('=== SÚHRN ===');
console.log(`Passed: ${passed}/9`);
console.log(`Failed: ${failed}/9`);
console.log(`False positives (SK → SANITY): ${fpCount}`);
