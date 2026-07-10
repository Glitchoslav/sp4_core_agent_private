// Rýchly manuálny test language enforcer + greeting/poem režimov
// Spúšťaj z koreňa sp4_core_agent: node test_language_enforcer.js

import { enforceSlovak } from './src/core/languageEnforcer.js';

async function runCase(label, text, context) {
    console.log(`\n===== ${label} =====`);
    console.log('User message:', context.userMessage);
    console.log('Original text:', text);

    const result = await enforceSlovak(text, context);

    console.log('--- RESULT ---');
    console.log('mode       :', result.mode);
    console.log('wasEnglish :', result.wasEnglish);
    console.log('changed    :', result.changed);
    console.log('retried    :', result.retried);
    console.log('usedFallback:', result.usedFallback);
    console.log('text:\n', result.text);
}

async function main() {
    // 1) Greeting case – krátky pozdrav
    await runCase(
        'GREETING',
        'Final answer: Kamo, priatelia SP4! Som tu ako tvoja hlava v offline režime AI, aby som ti pomohol.',
        {
            userMessage: 'nazdar kamo z sp4',
            persona: 'glitchoslav',
            model: 'local-test'
        }
    );

    // 2) Poem request – anglická báseň
    const englishPoem = `In the domain of truth and fire,
where chaos fuels the tribe's desire,
SP4 rises, wild and free,
a glitch of light in what could be.`;

    await runCase(
        'POEM',
        englishPoem,
        {
            userMessage: 'Povedz mi básničku o SP4',
            persona: 'glitchoslav',
            model: 'local-test'
        }
    );

    // 3) Normálna EN odpoveď o SP4 manifeste
    const englishEssay = 'Final answer: The purpose of SP4 is to build a decentralized culture project where people own their minds, data and stories, instead of feeding corporate AI silos.';

    await runCase(
        'ESSAY',
        englishEssay,
        {
            userMessage: 'what is the purpose of SP4?',
            persona: 'glitchoslav',
            model: 'local-test'
        }
    );

    // 4) Krátka slovenská otázka – nemalo by sa meniť (len minimálne)
    await runCase(
        'SHORT_SLOVAK',
        'SP4 je tvoj lokálny AI parťák, ktorý ti drží chrbát.',
        {
            userMessage: 'čo je sp4?',
            persona: 'core',
            model: 'local-test'
        }
    );

    // 5) Dlhší SK text s miernym bordelom – sk_edit režim
    const messySlovak = 'SP4 je offline režime AI, ale hlavne kmeň ktorý nechce corporate creativity ani true bullshit.';

    await runCase(
        'MESSY_SLOVAK',
        messySlovak,
        {
            userMessage: 'vysvetli mi manifest sp4 po slovensky',
            persona: 'core',
            model: 'local-test'
        }
    );

    // 6) EN + SK mix – malo by to skončiť ako čistá slovenčina
    const mixedText = 'Final answer: SP4 is your offline-first AI partner, ktrý ti drží chrbát, keď svet horí.';

    await runCase(
        'MIXED_EN_SK',
        mixedText,
        {
            userMessage: 'povedz mi po svojom, čo je sp4',
            persona: 'glitchoslav',
            model: 'local-test'
        }
    );

    // 7) Emočná otázka – seriózny tón
    const englishSerious = 'Final answer: You feel lost and exhausted, but SP4 is here to help you rebuild a sense of meaning and direction without fake positivity.';

    await runCase(
        'SERIOUS_EN',
        englishSerious,
        {
            userMessage: 'cítim sa stratený, čo s tým?',
            persona: 'core',
            model: 'local-test',
            emotionalAnalysis: { isSerious: true }
        }
    );
}

main().catch(err => {
    console.error('Test script error:', err);
    process.exit(1);
});
