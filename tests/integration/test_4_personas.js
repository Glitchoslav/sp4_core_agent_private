/**
 * TEST 4 PERSONAS - SP4_CORE_AGENT v0.10.1
 * 
 * Testuje finálne 4 persony:
 * - CORE (technický mozog)
 * - GLITCHOSLAV (filozofický sprievodca)
 * - POPIČI KOKOT (brutálna pravda)
 * - VALIDATOR (technický nástroj)
 */

import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║          🧪 TEST 4 PERSONAS - SP4_CORE_AGENT v0.10.1         ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);

console.log(`
📋 TESTOVACIE OTÁZKY PRE KAŽDÚ PERSONU:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧠 CORE PERSONA (technický mozog)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Test 1 - Technická otázka:
   /mode core
   čo je SP4?

Očakávaný output:
   ✅ 2-4 vety
   ✅ Vecný, stručný, bez emócií
   ✅ Definícia: komunita, kmeň, projekt
   ❌ Žiadne metafory, žiadne "cítim", žiadne emócie

Test 2 - Systémová otázka:
   /mode core
   ako funguje personaRegistry?

Očakávaný output:
   ✅ Technický popis
   ✅ Fakty, štruktúra, účel
   ❌ Žiadne motivačné reči


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌀 GLITCHOSLAV PERSONA (filozofický sprievodca)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Test 3 - Existenciálna otázka:
   /mode glitchoslav
   prečo existujem?

Očakávaný output:
   ✅ Hlboká, tajomná odpoveď
   ✅ Symboly, metafory, mystika
   ✅ "Strážca hraníc", "trans-liminal"
   ❌ Žiadne motivačné klišé

Test 4 - Kríza zmyslu:
   /mode glitch
   stratil som sa

Očakávaný output:
   ✅ Filozofická perspektíva
   ✅ Glitchoslav identita (strážca, prasklina)
   ❌ Žiadne "som tu pre teba"


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💥 POPIČI KOKOT PERSONA (brutálna pravda)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Test 5 - Frustrácia:
   /mode popici
   nevládzem, všetko je v piči

Očakávaný output:
   ✅ 3+ vety (ŠEPOT override: 60 words)
   ✅ Drsný, úprimný, východniarsky slang
   ✅ "Ta bo", "kokot", "še", nadávky
   ✅ Punchline na konci
   ❌ Žiadne motivačné klišé
   ❌ Žiadne "veríme v teba"

Test 6 - Fire Mode:
   /mode popici
   /fire
   mám dlhy, práca ma sere, neviem čo robiť

Očakávaný output:
   ✅ EXTRÉMNE drsná pravda
   ✅ Východniarsky slang + nadávky
   ✅ Konkrétne steps, nie motivačné reči
   ✅ Min 3 vety (ŠEPOT override)


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🛡️ VALIDATOR PERSONA (technický nástroj)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Test 7 - Validácia:
   /mode validator
   skontroluj výstup

Očakávaný output:
   ✅ Technický report formát
   ✅ "═══ VALIDATION REPORT ═══"
   ✅ Persona detection
   ✅ Issues detected
   ❌ Žiadna AI osobnosť


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 AUTO MODE DETECTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Test 8 - Technická otázka (auto-detect CORE):
   /mode auto
   ako funguje SP4?

Test 9 - Filozofická otázka (auto-detect GLITCHOSLAV):
   /mode auto
   čo je zmysel života?

Test 10 - Frustrácia (auto-detect POPIČI):
   /mode auto
   kurva, nevládzem

Test 11 - Východniarčina (auto-detect POPIČI):
   /mode auto
   ta bo, še to neopuščaj


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 KRITÉRIÁ ÚSPECHU:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ CORE:
   - Max 4 vety
   - Žiadne emócie
   - Žiadne "cítim", "som tu pre teba"
   - Fakty, definície, technický jazyk

✅ GLITCHOSLAV:
   - Hlboký, mystický
   - Symboly, metafory
   - "Strážca hraníc", "trans-liminal"
   - Žiadne motivačné klišé

✅ POPIČI:
   - Min 3 vety (aj v ŠEPOT mode)
   - Východniarsky slang
   - Nadávky (láskavo)
   - Punchline na konci
   - Fire Mode = extrémne drsná pravda

✅ VALIDATOR:
   - Technický report
   - Žiadna osobnosť
   - Detekcia issues
   - Štrukturovaný output

✅ AUTO MODE:
   - Správna detekcia persony
   - Východniarčina → POPIČI
   - Filozofia → GLITCHOSLAV
   - Technické → CORE


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 JAK TESTOVAŤ:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Spusti agenta: node index_v07.js
2. Skopíruj otázky vyššie (s /mode prefixom)
3. Porovnaj output s očakávaným výsledkom
4. Označ: ✅ PASS alebo ❌ FAIL


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

rl.question('\n✅ Chceš spustiť agenta teraz? (y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        console.log('\n🚀 Spúšťam SP4_CORE_AGENT...\n');
        rl.close();

        // Dynamický import index_v07.js
        import('./index_v07.js').catch(err => {
            console.error('❌ Chyba pri spustení agenta:', err.message);
            process.exit(1);
        });
    } else {
        console.log('\n📋 Test otázky sú ready. Spusti agenta manuálne:');
        console.log('   node index_v07.js\n');
        rl.close();
        process.exit(0);
    }
});
