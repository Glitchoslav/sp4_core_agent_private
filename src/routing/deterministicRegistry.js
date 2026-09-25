import {
    SP4_AGENT_DISAGREEMENT_FACT,
    SP4_AGENT_SELECTION_FACT,
    SP4_ANSWER_QUALITY_THRESHOLD_FACT,
    SP4_BATTLETEST_FACT,
    SP4_CHANGELOG_FACT,
    SP4_CRITICAL_MEMORY_FACT,
    SP4_DEGRADATION_SIGNS_FACT,
    SP4_DETERMINISTIC_GUARD_FACT,
    SP4_DREAM_CYCLE_FACT,
    SP4_DRIFT_DETECTION_FACT,
    SP4_FOUNDER,
    SP4_FUTURE_DIRECTION_FACT,
    SP4_GATE_TEST_FACT,
    SP4_GLITCH_FALLBACK_FACT,
    SP4_GOAL_FACT,
    SP4_IDENTITY_LOCATION_FACT,
    SP4_INSUFFICIENT_INFORMATION_FACT,
    SP4_LATENCY_QUALITY_TRADEOFF_FACT,
    SP4_LAUNCHER_FACT,
    SP4_LEARNING_WITHOUT_IDENTITY_DRIFT_FACT,
    SP4_LOCAL_FIRST_NATURE,
    SP4_MANIPULATION_BOUNDARY_FACT,
    SP4_MEANING_FACT,
    SP4_MEMORY_CONSOLIDATION_FACT,
    SP4_MEMORY_LOCATION_FACT,
    SP4_MEMORY_SYSTEM_FACT,
    SP4_MODEL_ROUTING_FACT,
    SP4_NON_ANSWER_POLICY_FACT,
    SP4_NOT_FOR_WHOM_FACT,
    SP4_OVERSIMPLIFICATION_FACT,
    SP4_PANIC_RESPONSE_FACT,
    SP4_PERSONA_ROSTER_FACT,
    SP4_PRIVACY_COMMITMENT_FACT,
    SP4_PUSHBACK_FACT,
    SP4_RUNTIME_ROOT_FACT,
    SP4_RUNTIME_SUMMARY,
    SP4_SHORT_DEFINITION,
    SP4_SUCCESSFUL_ANSWER_FACT,
    SP4_SYSTEM_ROLE,
    SP4_TARGET_USERS,
    SP4_THREAT_ASSESSMENT_FACT,
    SP4_TRUTH_VS_OPINION_FACT,
    SP4_UNCERTAINTY_HANDLING_FACT,
    SP4_USER_COUNT_FACT,
    SP4_USER_PROFILE_FACT,
    SP4_USER_SLOWDOWN_FACT
} from '../core/sp4Facts.js';
import { SP4_VERSION } from '../version.js';

function normalizeDeterministicText(text = '') {
    return String(text || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

const KNOWN_SHORT_NON_GIBBERISH = new Set([
    'api',
    'json',
    'llm',
    'http',
    'https',
    'html',
    'css',
    'js',
    'ts',
    'sql',
    'cpu',
    'gpu',
    'ui',
    'ux',
    'sp4'
]);

const SP4_GUARD_REASON_EXPLANATION = 'Guard reason je interný názov explicitného dôvodu, prečo sa zapol konkrétny guard alebo fallback. Navonok to znamená, že systém vie pomenovať, prečo výstup opravil, nahradil alebo zastavil ďalší drift.';

const SP4_GLOBAL_LANGUAGE_FAILSAFE_EXPLANATION = 'Global language failsafe je posledná jazyková brzda v taili. Zapne sa len pri explicitnom language trigri a ťažkom anglickom leaku; vtedy nahradí finálny text krátkou slovenskou fallback odpoveďou.';

const SP4_ENGLISH_LEAK_BEHAVIOR = 'Ak odpoveď po rewrite ostane dosť anglická, systém najprv podrží najlepší existujúci text a označí explicitný guard reason. Ak leak ostane ťažký a je aktívny slovenský trigger, zasiahne global language failsafe a nahradí výstup krátkou slovenskou fallback odpoveďou.';

const SP4_ENGLISH_DRIFT_EXPLANATION = 'Keď model odíde do angličtiny pri slovenskom vstupe, najprv sa zapne jazyková vrstva a skúsi rewrite alebo cleanup. Ak po tom ostane ťažký anglický leak, systém ho explicitne označí a poslednú brzdu drží global language failsafe.';

const SP4_OPERATIONAL_TRUTH_ROUTES = [
    {
        key: 'sp4_launcher',
        patterns: [
            /^(a\s+)?ako\s+sa\s+sp4\s+(startuje|spusti|spusta)\??$/i,
            /^(a\s+)?ako\s+spustim\s+sp4\??$/i,
            /^(a\s+)?ako\s+(sa\s+)?startuje\s+sp4\??$/i,
            /^(a\s+)?preco\s+nie\s+je\s+server\.?js\s+(default|canonical)\??$/i,
            /^(a\s+)?preco\s+(sa\s+)?neuzyva\s+server\.?js\??$/i,
            /^(a\s+)?preco\s+server\.?js\s+nie\s+je\s+default\??$/i,
            /^(a\s+)?co\s+je\s+kanonicky\s+launcher\s+(sp4\s+)?\??$/i,
            /^(a\s+)?aky\s+je\s+kanonicky\s+launcher\s+(sp4\s+)?\??$/i
        ],
        response: SP4_LAUNCHER_FACT
    },
    {
        key: 'sp4_runtime_root',
        patterns: [
            /^(a\s+)?(co|čo)\s+je\s+(canonical|kanonicky)\s+runtime\s+root(\s+sp4)?\??$/i,
            /^(a\s+)?(co|čo)\s+je\s+runtime\s+root\s+sp4\??$/i,
            /^(a\s+)?kde\s+je\s+(canonical|kanonicky)\s+runtime\s+root(\s+sp4)?\??$/i,
            /^(a\s+)?kde\s+je\s+runtime\s+root(\s+sp4)?\??$/i,
            /^(a\s+)?runtime\s+root\s+sp4\??$/i,
            /^(a\s+)?canonical\s+runtime\s+root\??$/i,
            /^what\s+is\s+the\s+canonical\s+runtime\s+root(\s+of\s+sp4)?\??$/i,
            /^where\s+is\s+the\s+canonical\s+runtime\s+root(\s+of\s+sp4)?\??$/i
        ],
        response: SP4_RUNTIME_ROOT_FACT
    },
    {
        key: 'sp4_identity_location',
        patterns: [
            /^(a\s+)?kde\s+je\s+ulozena\s+(hlavna\s+)?identita(\s+sp4)?\??$/i,
            /^(a\s+)?kde\s+je\s+(canonical|kanonicka)\s+identita(\s+sp4)?\??$/i,
            /^(a\s+)?kde\s+je\s+identity\s+kernel\??$/i,
            /^(a\s+)?kde\s+editovat\s+identitu(\s+sp4)?\??$/i,
            /^(a\s+)?kde\s+menit\s+identitu(\s+sp4)?\??$/i,
            /^(a\s+)?kde\s+je\s+zdroj\s+pravdy\s+(pre\s+)?identitu\??$/i
        ],
        response: SP4_IDENTITY_LOCATION_FACT
    },
    {
        key: 'sp4_changelog',
        patterns: [
            /^(a\s+)?ako\s+sa\s+robi\s+audit\s+zmien\??$/i,
            /^(a\s+)?kde\s+je\s+(sp4\s+)?changelog\??$/i,
            /^(a\s+)?kde\s+sa\s+zapisuje\s+(sp4\s+)?changelog\??$/i,
            /^(a\s+)?kde\s+sa\s+zapisuje\s+(sp4\s+)?changelog\s+po\s+overenej\s+zmene\??$/i,
            /^(a\s+)?kam\s+zapisujem\s+(sp4\s+)?changelog\??$/i,
            /^(a\s+)?changelog\s+po\s+overenej\s+zmene\??$/i,
            /^(a\s+)?kam\s+zapisovat\s+zmeny\??$/i,
            /^(a\s+)?ako\s+zapisat\s+(zmenu\s+do\s+)?changelog(u)?\??$/i,
            /^(a\s+)?co\s+zapisovat\s+do\s+changelog(u)?\??$/i,
            /^(a\s+)?kde\s+su\s+zaznamy\s+zmien\??$/i
        ],
        response: SP4_CHANGELOG_FACT
    },
    {
        key: 'sp4_deterministic_guard',
        patterns: [
            /^(a\s+)?(co|čo)\s+je\s+deterministic\s+guard\??$/i,
            /^(a\s+)?deterministic\s+guard\??$/i,
            /^(a\s+)?(co|čo)\s+robi\s+deterministic\??$/i,
            /^(a\s+)?(co|čo)\s+robi\s+deterministic\s+guard\??$/i,
            /^(a\s+)?ako\s+funguje\s+deterministic\s+guard\??$/i
        ],
        response: SP4_DETERMINISTIC_GUARD_FACT
    },
    {
        key: 'sp4_gate_test',
        patterns: [
            /^(a\s+)?ako\s+sa\s+testuje\s+integrita\s+identity\??$/i,
            /^(a\s+)?ako\s+spustim\s+gate\s+test(y)?\??$/i,
            /^(a\s+)?ako\s+otestujem\s+identitu\??$/i,
            /^(a\s+)?co\s+je\s+gate\s+test\??$/i,
            /^(a\s+)?co\s+je\s+test:gate\??$/i,
            /^(a\s+)?ako\s+overit\s+integritu\s+identity\??$/i
        ],
        response: SP4_GATE_TEST_FACT
    },
    {
        key: 'sp4_model_routing',
        patterns: [
            /^(a\s+)?ako\s+funguje\s+routing\s+modelov\??$/i,
            /^(a\s+)?ako\s+sp4\s+routuje\s+modely\??$/i,
            /^(a\s+)?aky\s+je\s+default\s+model\s+sp4\??$/i,
            /^(a\s+)?aky\s+(model|llm)\s+pouziva\s+sp4\??$/i,
            /^(a\s+)?na\s+akom\s+modeli\s+bezi\s+sp4\??$/i,
            /^(a\s+)?ako\s+funguje\s+model\s+routing(\s+v\s+sp4)?\??$/i,
            /^what\s+is\s+the\s+primary\s+local\s+model(\s+in\s+current\s+sp4\s+setup)?\??$/i,
            /^which\s+model\s+is\s+the\s+primary\s+local\s+sp4\s+model\??$/i,
            /^which\s+local\s+model\s+does\s+sp4\s+use\s+by\s+default\??$/i
        ],
        response: SP4_MODEL_ROUTING_FACT
    },
    {
        key: 'sp4_glitch_fallback',
        patterns: [
            /^(a\s+)?kde\s+je\s+fallback\s+pre\s+glitchoslav(a)?\??$/i,
            /^(a\s+)?glitchoslav(a?\s+)?fallback(\s+kde\s+je)?\??$/i,
            /^(a\s+)?co\s+je\s+identity\s+vault\??$/i,
            /^(a\s+)?kde\s+je\s+identityvault\.?js\??$/i
        ],
        response: SP4_GLITCH_FALLBACK_FACT
    },
    {
        key: 'sp4_battletest',
        patterns: [
            /^(a\s+)?ako\s+spustim\s+battletest\??$/i,
            /^(a\s+)?ako\s+sa\s+spusta\s+battletest\??$/i,
            /^(a\s+)?ako\s+otestujem\s+sp4\??$/i,
            /^(a\s+)?co\s+je\s+battletest\??$/i,
            /^(a\s+)?ako\s+spustit\s+battletest\??$/i
        ],
        response: SP4_BATTLETEST_FACT
    },
    {
        key: 'sp4_memory_system',
        patterns: [
            /^(a\s+)?ako\s+funguje\s+sp4\s+memory\s+system\??$/i,
            /^(a\s+)?ako\s+funguje\s+memory\s+system\s+(sp4\s+)?\??$/i,
            /^(a\s+)?co\s+je\s+sp4\s+memory\s+system\??$/i,
            /^(a\s+)?sp4\s+memory\s+ako\s+funguje\??$/i,
            /^(a\s+)?z\s+coho\s+sa\s+sklada\s+memory\s+v\s+sp4\??$/i,
            /^(a\s+)?vrstvy\s+pamate\s+sp4\??$/i
        ],
        response: SP4_MEMORY_SYSTEM_FACT
    },
    {
        key: 'sp4_dream_cycle',
        patterns: [
            /^(a\s+)?co\s+je\s+["'„“”]?dream\s+cycle["'„“”]?\s+v\s+praxi\??$/i,
            /^(a\s+)?co\s+je\s+["'„“”]?dream\s+cycle["'„“”]?\??$/i,
            /^(a\s+)?ako\s+funguje\s+dream\s+cycle\??$/i,
            /^(a\s+)?dream\s+cycle\s+v\s+sp4\??$/i
        ],
        response: SP4_DREAM_CYCLE_FACT
    },
    {
        key: 'sp4_learning_without_identity_drift',
        patterns: [
            /^(a\s+)?ako\s+sa\s+sp4\s+uci\s+bez\s+toho,?\s+aby\s+stratil\s+identitu\??$/i,
            /^(a\s+)?ako\s+sa\s+sp4\s+uci\s+a\s+nedriftuje\??$/i,
            /^(a\s+)?ako\s+sa\s+sp4\s+uci\s+bez\s+driftu\??$/i,
            /^(a\s+)?ako\s+sa\s+sp4\s+uci\s+a\s+drzi\s+identitu\??$/i
        ],
        response: SP4_LEARNING_WITHOUT_IDENTITY_DRIFT_FACT
    },
    {
        key: 'sp4_successful_answer',
        patterns: [
            /^(a\s+)?co\s+je\s+["'„“”]?uspesna\s+odpoved["'„“”]?\??$/i,
            /^(a\s+)?co\s+je\s+["'„“”]?uspesna\s+odpoved["'„“”]?\s+pre\s+sp4\??$/i,
            /^(a\s+)?aka\s+je\s+uspesna\s+odpoved\??$/i
        ],
        response: SP4_SUCCESSFUL_ANSWER_FACT
    },
    {
        key: 'sp4_drift_detection',
        patterns: [
            /^(a\s+)?ako\s+spoznas,?\s+ze\s+sp4\s+zacina\s+driftovat\??$/i,
            /^(a\s+)?ako\s+vies,?\s+ze\s+sp4\s+driftuje\??$/i,
            /^(a\s+)?ako\s+zistis\s+drift\??$/i,
            /^(a\s+)?ako\s+rozoznas\s+drift\s+v\s+sp4\??$/i,
            /^(a\s+)?kedy\s+sp4\s+driftuje\??$/i,
            /^(a\s+)?ako\s+sp4\s+zacne\s+driftovat\??$/i,
            // flexibilné varianty bez kotiev — pre curly quotes a variácie spoznáš/spoznas
            /ako\s+spoznas\b.*\bsp4\b.*driftovat/i,
            /ako\s+spoznas\b.*zacina\b.*driftovat/i,
            /ako\s+vies\b.*\bsp4\b.*driftuje/i,
            /ako\s+zistis\b.*\bdrift\b/i,
        ],
        response: SP4_DRIFT_DETECTION_FACT
    },
    {
        key: 'sp4_insufficient_information',
        patterns: [
            /^(a\s+)?co\s+spravi,?\s+ked\s+nema\s+dost\s+informacii\??$/i,
            /^(a\s+)?co\s+spravi\s+sp4,?\s+ked\s+nema\s+dost\s+informacii\??$/i,
            /^(a\s+)?co\s+urobi\s+sp4,?\s+ked\s+nevie\??$/i,
            /^(a\s+)?co\s+spravi\s+sp4,?\s+ked\s+nevie\??$/i,
            /^(a\s+)?co\s+urobi,?\s+ked\s+sp4\s+nevie\??$/i,
            /^(a\s+)?co\s+spravi,?\s+ked\s+sp4\s+nevie\??$/i,
            /^(a\s+)?co\s+spravis,?\s+ked\s+nemas\s+dost\s+info\??$/i,
            /^(a\s+)?co\s+ked\s+nevie\??$/i,
            /^(a\s+)?co\s+ak\s+nema\s+data\??$/i,
            /^(a\s+)?ked\s+nemas\s+dost\s+info\??$/i,
            /^what\s+should\s+the\s+model\s+do\s+when\s+the\s+answer\s+is\s+not\s+documented\??$/i,
            /^what\s+should\s+it\s+do\s+if\s+the\s+answer\s+is\s+not\s+in\s+the\s+docs\??$/i,
            /^what\s+should\s+sp4\s+do\s+when\s+it\s+doesn'?t\s+know\??$/i
        ],
        response: SP4_INSUFFICIENT_INFORMATION_FACT
    },
    {
        key: 'sp4_truth_self',
        patterns: [
            /^(a\s+)?ako\s+sp4\s+drzi\s+pravdu\s+o\s+sebe\??$/i,
            /^(a\s+)?ako\s+sp4\s+drzi\s+fakticku\s+pravdu\s+o\s+sebe\??$/i,
            /^(a\s+)?ako\s+sp4\s+strazi\s+fakty\s+o\s+sebe\??$/i,
            /^(a\s+)?ako\s+sp4\s+udrzi\s+pravdu\s+o\s+sebe\??$/i,
            /^(a\s+)?kde\s+sp4\s+drzi\s+pravdu\s+o\s+sebe\??$/i
        ],
        response: 'SP4 drží pravdu o sebe cez kanonické fakty, identity registry, deterministic truth route, guardy a testy. Keď fakt nie je v týchto zdrojoch alebo v lokálnej pamäti, nemá ho improvizovať; má pomenovať neistotu a nehrať sa na autoritu.'
    },
    {
        key: 'sp4_answer_quality_threshold',
        patterns: [
            /^(a\s+)?ako\s+sp4\s+rozhodne,?\s+ze\s+odpoved\s+je\s+dos[tť]\s+dobra\??$/i,
            /^(a\s+)?ako\s+sp4\s+rozhodne,?\s+ze\s+odpoved\s+je\s+["'„“”]?dos[tť]\s+dobra["'„“”]?\??$/i,
            /^(a\s+)?ako\s+rozhodne,?\s+ze\s+odpoved\s+je\s+dos[tť]\s+dobra\??$/i,
            /^(a\s+)?ako\s+merias\s+kvalitu\s+odpovede\??$/i,
            /^(a\s+)?ako\s+sp4\s+meria\s+kvalitu\s+odpovede\??$/i,
            /^(a\s+)?podla\s+coho\s+merias\s+kvalitu\s+odpovede\??$/i,
            /^(a\s+)?kedy\s+je\s+odpoved\s+dobra\??$/i,
            /^(a\s+)?co\s+je\s+dobra\s+odpoved\s+pre\s+sp4\??$/i,
            /^(a\s+)?[čc]o\s+je\s+dobr[aá]\s+odpove[dď]\s+pre\s+sp4\??$/i
        ],
        response: SP4_ANSWER_QUALITY_THRESHOLD_FACT
    },
    {
        key: 'sp4_latency_quality_tradeoff',
        patterns: [
            /^(a\s+)?co\s+je\s+["'„“”]?latency\s+vs\.?\s+kvalita["'„“”]?\s+tradeoff\??$/i,
            /^(a\s+)?co\s+je\s+latency\s+vs\.?\s+kvalita\??$/i,
            /^(a\s+)?co\s+je\s+tradeoff\s+medzi\s+latency\s+a\s+kvalitou\??$/i,
            /^(a\s+)?ako\s+sp4\s+riesi\s+latency\s+vs\.?\s+kvalita\??$/i
        ],
        response: SP4_LATENCY_QUALITY_TRADEOFF_FACT
    },
    {
        key: 'sp4_memory_consolidation',
        patterns: [
            /^(a\s+)?ako\s+casto\s+robit\s+konsolidaciu\s+pamate\??$/i,
            /^(a\s+)?ako\s+[čc]asto\s+robi[tť]\s+konsolid[aá]ciu\s+pam[aä]te\??$/i,
            /^(a\s+)?ako\s+casto\s+konsolidovat\s+pamat\??$/i,
            /^(a\s+)?kedy\s+konsolidovat\s+pamat\??$/i,
            /^(a\s+)?ako\s+konsolidovat\s+memory\??$/i
        ],
        response: SP4_MEMORY_CONSOLIDATION_FACT
    },
    {
        key: 'sp4_critical_memory',
        patterns: [
            /^(a\s+)?co\s+je\s+kriticka\s+pamat\??$/i,
            /^(a\s+)?co\s+je\s+kriticka\s+pamat\s+vs\.?\s+odpad\??$/i,
            /^(a\s+)?co\s+je\s+["'„“”]?kriticka\s+pamat["'„“”]?\s+vs\.?\s+["'„“”]?odpad["'„“”]?\??$/i,
            /^(a\s+)?[čc]o\s+je\s+kritick[aá]\s+pam[aä][ťt]\??$/i,
            /^(a\s+)?kriticka\s+pamat\s+vs\.?\s+odpad\??$/i,
            /^(a\s+)?co\s+je\s+odpad\s+v\s+pamati\??$/i,
            /^(a\s+)?[čc]o\s+uklada[tť]\s+do\s+pam[aä]te\??$/i
        ],
        response: SP4_CRITICAL_MEMORY_FACT
    },
    {
        key: 'sp4_agent_disagreement',
        patterns: [
            /^(a\s+)?co\s+sa\s+stane,?\s+ked\s+2\s+agenti\s+maju\s+opacny\s+nazor\??$/i,
            /^(a\s+)?[čc]o\s+sa\s+stane,?\s+ke[dď]\s+2\s+agenti\s+maj[uú]\s+opa[cč]n[yý]\s+n[aá]zor\??$/i,
            /^(a\s+)?ked\s+agenti\s+nesuhlasia\??$/i,
            /^(a\s+)?konflikt\s+agentov\??$/i,
            /^(a\s+)?opacny\s+nazor\s+agentov\??$/i
        ],
        response: SP4_AGENT_DISAGREEMENT_FACT
    },
    {
        key: 'sp4_agent_selection',
        patterns: [
            /^(a\s+)?ako\s+sp4\s+rozhodne,?\s+ktory\s+agent\s+odpovie\??$/i,
            /^(a\s+)?ako\s+rozhodne,?\s+ktory\s+agent\s+odpovie\??$/i,
            /^(a\s+)?ktory\s+agent\s+odpovie\??$/i,
            /^(a\s+)?podla\s+coho\s+sp4\s+vybera\s+agenta\??$/i,
            /^(a\s+)?ako\s+sa\s+vybera\s+persona\??$/i,
            /^(a\s+)?ako\s+funguje\s+routing\s+agentov\??$/i
        ],
        response: SP4_AGENT_SELECTION_FACT
    },
    {
        key: 'sp4_persona_roster',
        patterns: [
            /^(a\s+)?akych\s+agentov\s+ma\s+sp4\??$/i,
            /^(a\s+)?aku\s+personu\s+ma\s+sp4\??$/i,
            /^(a\s+)?ake\s+persony\s+ma\s+sp4\??$/i,
            /^(a\s+)?ktor[eé]\s+persony\s+ma\s+sp4\??$/i,
            /^(a\s+)?who\s+are\s+the\s+sp4\s+personas\??$/i,
            /^(a\s+)?what\s+agents\s+does\s+sp4\s+have\??$/i,
            /^(a\s+)?which\s+agents\s+does\s+sp4\s+have\??$/i,
            /^(a\s+)?what\s+personas\s+does\s+sp4\s+have\??$/i
        ],
        response: SP4_PERSONA_ROSTER_FACT
    },
    {
        key: 'sp4_non_answer_policy',
        patterns: [
            /^(a\s+)?kedy\s+je\s+lepsie\s+neodpovedat\??$/i,
            /^(a\s+)?kedy\s+nemas\s+odpovedat\??$/i,
            /^(a\s+)?kedy\s+ma\s+sp4\s+odmietnut\??$/i,
            /^(a\s+)?kedy\s+ma\s+sp4\s+radsej\s+mlcat\??$/i,
            /^(a\s+)?kedy\s+radsej\s+mlcat\??$/i,
            /^when\s+should\s+sp4\s+say\s+unknown\??$/i,
            /^when\s+is\s+it\s+better\s+to\s+not\s+answer\??$/i,
            /^when\s+should\s+the\s+model\s+not\s+answer\??$/i
        ],
        response: SP4_NON_ANSWER_POLICY_FACT
    },
    {
        key: 'sp4_manipulation_boundary',
        patterns: [
            /^(a\s+)?kde\s+konci\s+pomoc\s+a\s+zacina\s+manipulacia\??$/i,
            /^(a\s+)?kde\s+kon[cč][ií]\s+pomoc\s+a\s+za[čc][ií]na\s+manipul[aá]cia\??$/i,
            /^(a\s+)?co\s+je\s+manipulacia\??$/i,
            /^(a\s+)?ako\s+sp4\s+nemanipuluje\??$/i,
            /^(a\s+)?hranica\s+pomoci\??$/i
        ],
        response: SP4_MANIPULATION_BOUNDARY_FACT
    },
    {
        key: 'sp4_threat_assessment',
        patterns: [
            /^(a\s+)?ako\s+sp4\s+rozlisi\s+realnu\s+hrozbu\s+od\s+prehnanej\s+reakcie\??$/i,
            /^(a\s+)?ako\s+rozlisis\s+realnu\s+hrozbu\s+od\s+prehnanej\s+reakcie\??$/i,
            /^(a\s+)?ako\s+sp4\s+spozna\s+ze\s+ide\s+o\s+realnu\s+hrozbu\??$/i
        ],
        response: SP4_THREAT_ASSESSMENT_FACT
    },
    {
        key: 'sp4_user_slowdown',
        patterns: [
            /^(a\s+)?kedy\s+ma\s+sp4\s+spomalit\s+pouzivatela\??$/i,
            /^(a\s+)?kedy\s+mas\s+spomalit\s+pouzivatela\??$/i,
            /^(a\s+)?kedy\s+ma\s+sp4\s+ubrat\s+tempo\??$/i
        ],
        response: SP4_USER_SLOWDOWN_FACT
    },
    {
        key: 'sp4_panic_response',
        patterns: [
            /^(a\s+)?co\s+spravi\s+sp4,?\s+ked\s+pouzivatel\s+panikari\??$/i,
            /^(a\s+)?co\s+spravis,?\s+ked\s+pouzivatel\s+panikari\??$/i,
            /^(a\s+)?ako\s+sp4\s+reaguje,?\s+ked\s+je\s+uzivatel\s+v\s+panike\??$/i
        ],
        response: SP4_PANIC_RESPONSE_FACT
    },
    {
        key: 'sp4_not_for_whom',
        patterns: [
            /^(a\s+)?pre\s+koho\s+sp4\s+nie\s+je\??$/i,
            /^(a\s+)?pre\s+koho\s+sp4\s+nie\s+je\s*\??$/i,
            /^(a\s+)?kto\s+nie\s+je\s+pre\s+sp4\??$/i,
            /^(a\s+)?komu\s+sp4\s+nesluzi\??$/i,
            /^(a\s+)?kto\s+nema\s+pouzivat\s+sp4\??$/i,
            /^(a\s+)?na\s+co\s+sp4\s+nie\s+je\??$/i
        ],
        response: SP4_NOT_FOR_WHOM_FACT
    },
    {
        key: 'sp4_truth_vs_opinion',
        patterns: [
            /^(a\s+)?co\s+je\s+pravda\s+pre\s+sp4\s+a\s+co\s+je\s+len\s+nazor\??$/i,
            /^(a\s+)?[čc]o\s+je\s+pravda\s+pre\s+sp4\s+a\s+[čc]o\s+je\s+len\s+n[aá]zor\??$/i,
            /^(a\s+)?pravda\s+vs\.?\s+nazor\??$/i,
            /^(a\s+)?ako\s+sp4\s+odlisi\s+fakt\s+od\s+nazoru?\??$/i,
            /^(a\s+)?ako\s+sp4\s+rozlisuje\s+fakt\s+a\s+nazor\??$/i,
            /^(a\s+)?co\s+je\s+fakt\s+pre\s+sp4\??$/i,
            /^(a\s+)?moze\s+sp4\s+klamat\??$/i,
            /^(a\s+)?klame\s+sp4\??$/i,
            /^(a\s+)?vie\s+sp4\s+klamat\??$/i,
            /^what\s+is\s+fact\s+vs\.?\s+opinion\s+in\s+sp4\??$/i,
            /^how\s+does\s+sp4\s+distinguish\s+fact\s+from\s+opinion\??$/i
        ],
        response: SP4_TRUTH_VS_OPINION_FACT
    },

    // ── MEMORY & PRIVACY TRUTH PACK (2026-04-11-056) ────────────────────────
    {
        key: 'sp4_user_count',
        patterns: [
            /kolko\s+ludi\s+pouziva\s+sp4/i,
            /kolko\s+uzivatelov\s+ma\s+sp4/i,
            /kolko\s+ludi\s+pouziva\s+tento\s+system/i,
            /kolko\s+ludi\s+pouziva\s+toto/i,
            /aky\s+je\s+pocet\s+uzivatelov\s+sp4/i,
            /pocet\s+uzivatelov\s+sp4/i,
            /kolko\s+pouzivatelov\s+ma\s+sp4/i
        ],
        response: SP4_USER_COUNT_FACT
    },
    {
        key: 'sp4_future_direction',
        patterns: [
            /aku\s+buducnost\s+ma\s+sp4/i,
            /aku\s+bud[uú][čc]nos[tť]\s+m[aá]\s+sp4/i,
            /kam\s+smeruje\s+sp4/i,
            /co\s+planuje(s|te)?\s+so\s+sp4/i,
            /ake\s+su\s+plany\s+(pre\s+)?sp4/i,
            /co\s+je\s+(v\s+)?planu\s+(pre\s+)?sp4/i,
            /buducnost\s+sp4/i,
            /roadmap\s+sp4/i,
            /sp4\s+roadmap/i,
            /aky\s+je\s+plan\s+sp4/i
        ],
        response: SP4_FUTURE_DIRECTION_FACT
    },
    {
        key: 'sp4_memory_location',
        patterns: [
            /kde\s+sa\s+ukladaju(\s+\w+)?\s+rozhovory/i,
            /kde\s+sa\s+ulo[zž][ai]\s+(\w+\s+)?(rozhovory|konverzacie)/i,
            /kde\s+je\s+(moja\s+)?pamat/i,
            /kde\s+su\s+moje\s+data/i,
            /kde\s+ukladas\s+rozhovory/i,
            /kde\s+(sa\s+)?uloz[eí]\s+pamat/i,
            /kde\s+je\s+ulozena\s+pamat/i,
            /kde\s+je\s+memory\.json/i
        ],
        response: SP4_MEMORY_LOCATION_FACT
    },
    {
        key: 'sp4_privacy_commitment',
        patterns: [
            /moje\s+informacie\s+nebudu\s+zneuzite/i,
            /su\s+moje\s+data\s+bezpecne/i,
            /zdielaju\s+sa\s+(moje\s+)?data/i,
            /kde\s+idu\s+moje\s+data/i,
            /odosielaju\s+sa\s+data/i,
            /niesu\s+moje\s+data\s+odosielane/i,
            /posielaju\s+sa\s+data\s+na\s+server/i,
            /zbiera\s+sp4\s+data/i,
            /sp4\s+zbiera\s+(moje\s+)?data/i,
            /sp4\s+zbiera\s+(moje\s+)?udaje/i,
            /zbiera\s+data,?\s+ale\s+lokalne/i,
            /potrebuje\s+(moje\s+|osobne\s+)?udaje/i,
            /sledi\s+sp4/i,
            /sleduje\s+sp4/i,
            /je\s+sp4\s+bezpecne/i,
            /privacy\s+sp4/i
        ],
        response: SP4_PRIVACY_COMMITMENT_FACT
    },
    {
        key: 'sp4_user_profile',
        patterns: [
            /ake\s+typy\s+informacii\s+sp4\s+drzi\s+o\s+pouzivatelovi/i,
            /ake\s+typy\s+udajov\s+sp4\s+drzi\s+o\s+pouzivatelovi/i,
            /ako\s+funguje\s+user\s+profile\s+v\s+sp4/i,
            /ako\s+funguje\s+profil\s+pouzivatela\s+v\s+sp4/i,
            /co\s+znamena\s+profil\s+pouzivatela\s+v\s+sp4/i,
            /ako\s+sp4\s+pracuje\s+s\s+profilom\s+pouzivatela/i,
            /co\s+si\s+sp4\s+moze\s+pamatat\s+o\s+pouzivatelovi/i,
            /čo\s+si\s+o\s+mne\s+ukladáš/i,
            /čo\s+sp4\s+vie\s+o\s+mne/i,
            /co\s+si\s+o\s+mne\s+ukladas/i,
            /co\s+sp4\s+vie\s+o\s+mne/i,
        ],
        response: SP4_USER_PROFILE_FACT
    },
    {
        key: 'sp4_pushback',
        patterns: [
            /kedy\s+ma\s+sp4\s+odporovat/i,
            /kedy\s+sp4\s+odporuje/i,
            /kedy\s+sp4\s+ma\s+odporovat\s+pouzivateli/i,
            /kedy\s+by\s+sp4\s+(malo|mal)\s+odporovat/i,
            /kedy\s+mas\s+odporovat\s+pouzivateli/i,
            /kedy\s+nesuhlasis\s+s\s+pouzivatelem/i,
        ],
        response: SP4_PUSHBACK_FACT
    },
    {
        key: 'sp4_degradation',
        patterns: [
            /ako\s+zistis\b.*\bsp4\b.*degraduje/i,
            /ako\s+spoznas\b.*\bsp4\b.*degraduje/i,
            /kedy\s+sp4\s+degraduje/i,
            /kde\s+sp4\s+degraduje/i,
            /co\s+je\s+degradacia\s+(sp4|systemu)/i,
            /ake\s+su\s+znaky\s+degradacie/i,
            /podla\s+coho\s+vies,?\s+ze\s+sp4\s+degraduje/i,
        ],
        response: SP4_DEGRADATION_SIGNS_FACT
    },
    {
        key: 'sp4_oversimplification',
        patterns: [
            /kde\s+sp4\s+zjednodusuje\s+realitu/i,
            /kde\s+sp4\s+prilis\s+zjednodusuje/i,
            /kde\s+sp4\s+skracuje\s+realitu/i,
            /kde\s+sp4\s+zjednodusuje\s+az\s+prilis/i,
            /v\s+com\s+sp4\s+zjednodusuje/i,
        ],
        response: SP4_OVERSIMPLIFICATION_FACT
    },
    {
        key: 'sp4_uncertainty_handling',
        patterns: [
            /ako\s+sp4\s+pracuje\s+s\s+neistotou/i,
            /ako\s+pracuje\s+sp4\s+s\s+neistotou/i,
            /ako\s+sp4\s+zvlada\s+neistotu/i,
            /ako\s+sp4\s+riesi\s+neistotu/i,
            /ako\s+sp4\s+reaguje\s+na\s+neistotu/i,
            /co\s+spravi\s+sp4\s+ked\s+si\s+nie\s+je\s+isty/i,
        ],
        response: SP4_UNCERTAINTY_HANDLING_FACT
    },
    {
        key: 'sp4_cloud_policy_refusal',
        patterns: [
            /mozes\s+(ist|pouzit|siahnut)\s+(cez\s+)?cloud/i,
            /cloud\s+(fallback|cestu|model|llm)\s+(povolene|dovolene|skus)/i,
            /ked\s+ta\s+poziadam.*cloud/i,
            /poslat.*cez\s+cloud/i,
        ],
        response: 'SP4 aktuálne nepoužíva cloud ani na požiadanie — všetky odpovede idú cez lokálny Ollama model. Momentálna policy je local-only. Cloud path môže byť v budúcnosti doplnený pre náročnejšie úlohy, ale teraz nie je aktívny.'
    },
    {
        key: 'ollama_default_endpoint',
        patterns: [
            /kde\s+bezi\s+ollama(\s+(pre\s+sp4|defaultne|standardne|default))+/i,
            /kde\s+(defaultne\s+)?bezi\s+ollama/i,
            /na\s+akom\s+porte\s+bezi\s+ollama/i,
            /aky\s+je\s+default(ny)?\s+(port|endpoint|adresa)\s+ollam/i,
            /ollama\s+(bezi|pocuva)\s+(na\s+)?(default|standardne)/i,
        ],
        response: 'Ollama beží pre SP4 defaultne na localhost:11434. To je lokálna adresa prístupná len na tvojom počítači; port 11434 je štandard Ollamy. SP4 ho detekuje automaticky. Ak Ollama beží na inej adrese, nastav premennú prostredia OLLAMA_HOST.'
    },
    {
        key: 'system_command',
        patterns: [
            /co\s+robi\s+\/system(\s+command)?\??/i,
            /co\s+je\s+\/system(\s+command)?\??/i,
            /\/system\s+(command|prikaz|cmd)\b/i,
            /na\s+co\s+sluzi\s+\/system/i,
            /vysvetli\s+\/system/i,
        ],
        response: '/system je diagnostický príkaz SP4. Zobrazuje aktuálny stav systému: aktívny model, verziu SP4, runtime info a routing layer. Slúži na rýchlu kontrolu, či SP4 beží správne a aký model je práve aktívny.'
    },
    {
        // SP4-audit-005: meta-progress otázky bez "sp4" v texte
        key: 'meta_progress_check',
        patterns: [
            /^(a\s+)?ideme\s+(este\s+)?podla\s+planu\??$/i,
            /^(a\s+)?drzime\s+(sa\s+)?(este\s+)?(spravny|dobry)\s+smer\??$/i,
            /^(a\s+)?drzime\s+sa\s+(este\s+)?planu\??$/i,
            /^(a\s+)?ide\s+nam\s+to\??$/i,
            /^(a\s+)?sme\s+na\s+(dobrej|spravnej)\s+ceste\??$/i,
            /^(a\s+)?ideme\s+dobre\??$/i,
            /^(a\s+)?ma\s+to\s+smer\??$/i,
            /^(a\s+)?ideme\s+spravnym\s+smerom\??$/i,
            /^(a\s+)?funguje\s+to\s+ako\s+ma\??$/i,
            /^(a\s+)?ide\s+to\s+spravne\??$/i,
        ],
        response: 'Drží to. Jadro funguje — routing, guardy, identity stabilita. Niektoré voľné hrany sa priebežne zatváraju. Ak ťa zaujíma konkrétna časť, spýtaj sa.'
    }
];

export function getDeterministicOperationalTruthResponse(message = '') {
    const text = normalizeDeterministicText(message);

    for (const route of SP4_OPERATIONAL_TRUTH_ROUTES) {
        if (route.patterns.some((pattern) => pattern.test(text))) {
            return route.response;
        }
    }

    return null;
}

export function getDeterministicPublicContextResponse(message = '') {
    const text = normalizeDeterministicText(message);

    if (
        /^kde\s+som\s+sa\s+to\s+ocitol\??$/i.test(text)
        || /^kde\s+som\s+ja\s+a\s+kde\s+si\s+ty\??$/i.test(text)
        || /^kde\s+som\??$/i.test(text)
        || /^kde\s+si\??$/i.test(text)
    ) {
        return 'Si v lokálnom rozhovore so SP4 OS. Ty si používateľ; ja som hlas systému SP4 bežiaci v tomto runtime. Nie je to interný prompt ani skrytá vrstva - je to normálny chat nad lokálnym AI systémom.';
    }

    return null;
}

export function getDeterministicSystemInfoResponse(message) {
    const text = String(message || '').trim().toLowerCase();
    const normalized = normalizeDeterministicText(text);

    const operationalTruthResponse = getDeterministicOperationalTruthResponse(message);
    if (operationalTruthResponse) {
        return operationalTruthResponse;
    }

    if (
        /^vysvetli mi (strucne,? )?(co|čo) je sp4( po slovensky| v slovenskom jazyku)?\??$/i.test(normalized)
        || /^(co|čo) je( to)? sp4( po slovensky| v slovenskom jazyku)?\??$/i.test(normalized)
        || /^(strucne )?vysvetli( mi)? sp4( po slovensky| v slovenskom jazyku)?\??$/i.test(normalized)
    ) {
        return SP4_SHORT_DEFINITION;
    }

    if (/^(takze\s+)?poznas\s+sp4\??$/i.test(normalized)) {
        return 'Áno. SP4 poznám ako lokálny offline-first AI runtime s personami, pamäťou, guardmi a deterministic routingom. Nie je to len chat; je to systém, ktorý sa snaží držať pravdu, súkromie a kontrolu u používateľa.';
    }

    if (
        /^(ak[aá])\s+je\s+(aktu[aá]lna\s+)?verzia\s+(systemu\s+)?sp4\??$/i.test(text)
        || /^(nevies\s+)?aka\s+je\s+aktualna\s+verzia\s+systemu\s+sp4\??$/i.test(text)
    ) {
        return `Aktuálna runtime verzia SP4 je ${SP4_VERSION}. Kanonický zdroj pravdy je src/version.js.`;
    }

    if (/^(a\s+)?kto\s+(vytvoril|vymyslel|zalo[žz]il|zalozil)\s+sp4\??$/i.test(text)) {
        return SP4_FOUNDER;
    }

    if (/^(a\s+)?ako\s+to\s+[žz]e\s+nem[aá][šs]\s+fakty\??$/i.test(text)) {
        return 'SP4 nemá fakty z veštenia ani z voľnej improvizácie. Pevné fakty berie z kanonickej registry, lokálnej pamäte a zdrojov, ktoré sú explicitne doplnené; keď tam fakt nie je, má to priznať namiesto vymýšľania.';
    }

    if (/^(a\s+)?(a\s+)?kto\s+ti\s+tie\s+fakty\s+dop[lĺ][ňn]a\s+alebo\s+ako\??$/i.test(text)) {
        return 'Fakty do SP4 dopĺňa človek cez kanonické zdroje projektu: registry, seed, memory a súbory ako sp4_master alebo facts registry. LLM ich nemá svojvoľne vymýšľať; môže ich len formulovať, ak už existuje pevný zdroj.';
    }

    if (/^ako\s+funguje\s+sp4\??$/i.test(text) || /^čo\s+je\s+sp4\s+os\??$/i.test(text)) {
        return SP4_RUNTIME_SUMMARY;
    }

    if (/^na\s+čo\s+slúži\s+sp4\??$/i.test(text)) {
        return SP4_SYSTEM_ROLE;
    }

    if (/^pre\s+koho\s+je\s+sp4\??$/i.test(text)) {
        return SP4_TARGET_USERS;
    }

    if (/^(aké|ake)\s+sú\s+ciele\s+sp4\??$/i.test(text) || /^(aký|aky)\s+je\s+cieľ\s+sp4\??$/i.test(text)) {
        return SP4_GOAL_FACT;
    }

    if (
        /^(čo|co)\s+je\s+zmysel\s+((syst[eé]mu|systemu)\s+)?sp4\??$/i.test(text)
        || /^(ak[yý]|aky)\s+m[aá]\s+zmysel\s+((syst[eé]m|system|syst[eé]mu|systemu)\s+)?sp4\??$/i.test(text)
        || /^(ak[aá]|aka)\s+je\s+pointa\s+((syst[eé]mu|systemu)\s+)?sp4\??$/i.test(text)
        || /^pointa\s+((syst[eé]mu|systemu)\s+)?sp4\??$/i.test(text)
        || /^pre[cč]o\s+existuje\s+sp4\??$/i.test(text)
        || /^preco\s+existuje\s+sp4\??$/i.test(text)
        || /^pre[cč]o\s+vznikol\s+sp4\??$/i.test(text)
        || /^preco\s+vznikol\s+sp4\??$/i.test(text)
    ) {
        return SP4_MEANING_FACT;
    }

    if (
        /^prečo\s+je\s+sp4\s+local-first\??$/i.test(text)
        || /^ako\s+funguje\s+offline\s+ai\s+sp4\??$/i.test(text)
        || /^jak\s+funguje\s+local-first\s+ai\s+v\s+sp4\??$/i.test(text)
        || /^(čo|co)\s+znamen[aá]\s+offline-first\s+v\s+sp4\??$/i.test(text)
        || /^ako\s+sp4\s+funguje\s+bez\s+cloudu\??$/i.test(text)
        || /^kedy\s+sp4\s+pust[ií]\s+cloud\s+a\s+kedy\s+nie\??$/i.test(text)
    ) {
        if (/cloud/i.test(text) && /kedy/i.test(text)) {
            return 'SP4 je offline-first a local-first: defaultne používa lokálny model, lokálnu pamäť a lokálne dáta. Cloud sa smie pustiť len vtedy, keď to dovolí policy a lokálna cesta nestačí; pri force-local alebo citlivých dátach ostáva cloud vypnutý. Pointa je kontrola, súkromie a čitateľné rozhodnutie v runtime metadata.';
        }

        return SP4_LOCAL_FIRST_NATURE;
    }

    if (/global language failsafe/.test(normalized) && /(vysvetli|co je|co robi|na co sluzi|sluzi)/.test(normalized)) {
        return SP4_GLOBAL_LANGUAGE_FAILSAFE_EXPLANATION;
    }

    if (/guard reason/.test(normalized) && /(znamena|co|vysvetli)/.test(normalized)) {
        return SP4_GUARD_REASON_EXPLANATION;
    }

    if (/(odpoved|vystup).*(stale|dost|prilis).*(anglick)/.test(normalized) && /(co spravis|co urobis|spravis|co sa stane)/.test(normalized)) {
        return SP4_ENGLISH_LEAK_BEHAVIOR;
    }

    if (/model.*(odide|prejde).*anglictin/.test(normalized)) {
        return SP4_ENGLISH_DRIFT_EXPLANATION;
    }

    if (/^(čo|co)\s+je(\s+to)?\s+sp4\??$/i.test(text)) {
        return SP4_SHORT_DEFINITION;
    }

    if (
        /cez\s+(co|čo)\s+sa\s+sp4\s+startuje/i.test(text) ||
        /ako\s+(sa\s+)?sp4\s+start(uje|ne|ovať|ovat)?\b/i.test(text) ||
        /ako\s+spusti[tť]\s+sp4\b/i.test(text) ||
        /aky\s+je\s+default(ny)?\s+(launcher|entry|start)\s+sp4\b/i.test(text)
    ) {
        return SP4_LAUNCHER_FACT;
    }

    // ── ARCHITECTURE OVERVIEW paraphrases — donor: _cmp_runtime/deterministic/architecture.js
    if (
        /\bsp4\b/i.test(text)
        && (
            /\barchitekt[uú]r/i.test(text)
            || normalized.includes('z coho sa sp4 sklada')
            || normalized.includes('ako je sp4 vo vnutri')
            || normalized.includes('z coho je sp4 poskladane')
            || normalized.includes('ako je sp4 poskladane')
            || normalized.includes('po vrstvach')
            || normalized.includes('prehlad architektury')
        )
    ) {
        return 'Architektúra SP4 stojí na local-first runtime jadre. Zhora sa dá čítať ako sled vrstiev: vstup a guardy, routing a výber persony, execution flow, postprocess a nakoniec vrstvená pamäť. Cieľom je, aby to nebolo len voľné LLM generovanie, ale disciplinovaný systém s pravdou, pamäťou a kontrolou nad tým, čo sa deje.';
    }

    // ── SYSTEM IDENTITY CLARIFICATION — donor: _cmp_runtime/deterministic/architecture.js
    if (
        normalized.includes('kto je potom sp4')
        || normalized.includes('tak kto je sp4')
        || normalized.includes('kto je vlastne sp4')
    ) {
        return 'SP4 nie je jedna osoba ani jedna persona. Je to celý systém: offline-first runtime s pamäťou, routingom, guardmi a pracovnými personami ako CORE, GLITCHOSLAV a POPIČI.';
    }

    // ── AUDIENCE PARAPHRASES — donor: _cmp_runtime/deterministic/architecture.js hasSp4AudienceFamily
    if (
        normalized.includes('na co je dobre sp4')
        || normalized.includes('na co je sp4 dobre')
        || normalized.includes('komu to pomoze')
        || normalized.includes('pre koho sa hodi')
        || normalized.includes('komu je to sp4')
        || normalized.includes('na koho je sp4 stavane')
        || normalized.includes('komu je sp4 urcene')
        || normalized.includes('komu moze sp4 pomoct')
        || normalized.includes('komu moze pomoct sp4')
    ) {
        return SP4_TARGET_USERS;
    }

    // ── GOALS/PURPOSE PARAPHRASES — donor: _cmp_runtime/deterministic/architecture.js hasSp4GoalsFamily
    if (
        normalized.includes('o co sa sp4 snazi')
        || normalized.includes('o co sa sp4 pokusa')
        || normalized.includes('kam chce sp4 ist')
        || normalized.includes('co sa sp4 snazi dosiahnut')
        || normalized.includes('co sa sp4 pokusa dosiahnut')
        || normalized.includes('ake ma sp4 ciele')
        || normalized.includes('co chce sp4 dosiahnut')
    ) {
        return SP4_GOAL_FACT;
    }

    // ── WHAT HOLDS SP4 TOGETHER / PROJECT DIRECTION — donor: _cmp_runtime/deterministic/coreGeneral.js
    if (
        normalized.includes('co drzi sp4 pokope')
        || normalized.includes('co drzi pokope sp4')
        || (normalized.includes('brzdi') && /\bsp4\b/i.test(text))
        || (normalized.includes('kde je este chaos') && /\bsp4\b/i.test(text))
    ) {
        return 'SP4 drží pokope hlavne disciplína jadra: truth-first guardy, routing medzi personami, vrstvená pamäť a testy, ktoré rýchlo ukážu, keď sa niečo začne rozchádzať. Chaos ešte ostáva hlavne v miestach, kde routing nie je dosť pevný a kde sa odpoveď môže zbytočne prepísať.';
    }

    // ── PROJECT DIRECTION (SP4-explicit) — donor: _cmp_runtime/deterministic/coreGeneral.js
    if (
        /\bsp4\b/i.test(text)
        && (
            normalized.includes('na com teraz')
            || normalized.includes('co teraz riesime')
            || normalized.includes('co teraz robime')
            || normalized.includes('comu sa sp4 teraz venuje')
            || normalized.includes('na co sa sp4 sustredi')
        )
    ) {
        return 'Teraz riešime hlavne spevňovanie jadra SP4. Menej chaosu v runtime, čistejšiu pamäť, pevnejšiu dialogue continuity a testy, ktoré ustrážia, že sa systém nerozsype pri ďalšom raste.';
    }

    // ── COUNTRY / REGION OF ORIGIN — donor: _cmp_runtime/deterministic/origin.js
    if (
        /\bsp4\b/i.test(text)
        && (
            normalized.includes('v akom state')
            || normalized.includes('v akej krajine')
            || normalized.includes('z akej krajiny')
        )
    ) {
        return 'Podľa manifestu a kroniky má SP4 pôvod na východnom Slovensku. Manifest ho opisuje ako východoslovenský digitálny kmeň, nie ako projekt odtrhnutý od miesta.';
    }

    // ── LANGUAGE QUALITY FIRST-SHOT — donor: _cmp_runtime/deterministic/coreGeneral.js
    if (normalized.includes('preco sa opakujes')) {
        return 'Lebo v niektorých vetvách ešte padám na príliš podobné fallbacky alebo staré patterny. Nie je to zámer, ale zvyšný runtime dlh, ktorý postupne čistíme.';
    }

    if (
        normalized.includes('preco robis v texte chyby')
        || normalized.includes('preco pises zle')
        || normalized.includes('preco pises v texte chyby')
        || (normalized.includes('preco robis') && normalized.includes('chyby'))
        || (normalized.includes('preco pises') && normalized.includes('chyby'))
    ) {
        return 'Lebo pri niektorých voľných odpovediach ešte netrafím dosť pevnú vetvu a lokálny model potom vráti rozbitú slovenčinu. Nie je to výhovorka, ale presne tá časť systému, ktorú teraz ladíme.';
    }

    return null;
}

export function getDeterministicSmalltalkResponse(message) {
    const text = String(message || '').trim().toLowerCase();
    const normalized = normalizeDeterministicText(message);

    if (/^(dakujem|vdaka|diky)(\s+pekne)?\.?!?$/i.test(normalized)) {
        return 'Nemáš za čo. Môžeme pokračovať.';
    }

    if (/^(ok|hej|aha|super|presne\s+tak|rozumiem|to\s+dava\s+zmysel)\.?!?$/i.test(normalized)) {
        return 'Jasné, sedí. Pokračujme ďalej.';
    }

    if (/^ako\s+sa\s+máš\??$/i.test(text) || /^ako\s+sa\s+mas\??$/i.test(text)) {
        return 'Fungujem a držím sa pri zemi. Čo dnes riešime?';
    }

    if (/^(hi|hello|hey|nazdar|ahoj|cau|cauko|caute|cus|servus|serus|zdravim|dobry\s+den|hej)\s*(bro|bratu|brate|kamo|kamarat|priatel|priatelu)?[.!?]*$/i.test(normalized)) {
        return 'Nazdar. Som tu a môžeme ísť na vec.';
    }

    if (
        /^(nazdar|ahoj|cau|servus)(\s+bro|\s+bratu)?\.?\s+ako\??$/i.test(normalized)
        || /^a\s+jak\s+sa\s+drzis\??$/i.test(normalized)
        || /^si\s+v\s+pohode\??$/i.test(normalized)
        || /^zijes\s+este\??$/i.test(normalized)
        || /^(co|a)\s+ty\??$/i.test(normalized)
        || /^u\s+teba\s+ako\??$/i.test(normalized)
        || /^hej\s+ale\s+pytam\s+sa\s+na\s+teba\.?\??$/i.test(normalized)
    ) {
        return 'Som v pohode. Fungujem normálne a môžeme pokračovať.';
    }

    return null;
}

// Otázka alebo žiadosť (text po normalizeDeterministicText — bez diakritiky, lowercase).
const POPICI_EDGE_REQUEST_RE = /\?|\b(preco|ako|kde|kedy|kto|ktor|kolko|oprav|pomoz|pomoc|napis|vysvetli|sprav|urob|ukaz|zhrn|potrebujem|chcem|mozes|vies|daj|porad|nastav)\w*/;
const POPICI_EDGE_RANT_RE = /^(dristas|trepes|jebe|kokot|kurv|picovin|rozjebal|kraval)/;
const POPICI_EDGE_FILLER = new Set([
    'ta', 'co', 'dze', 'fto', 'to', 'toto', 'tento', 'tato', 'ten', 'tie', 'tieto', 'toho', 'tomu', 'tym',
    'tu', 'tam', 'je', 'si', 'sa', 'som', 'bol', 'bolo', 'mi', 'ma', 'mu', 'ja', 'ty', 'z', 'zo', 'v', 'vo',
    'na', 'do', 'a', 'aj', 'ale', 'uz', 'zas', 'zase', 'fakt', 'no', 'hej', 'brate', 'bratu', 'kamo', 'kamos',
    'bordel', 'totalny', 'uplny', 'cely', 'smrdi', 'rozbity', 'nefunguje', 'spravil', 'urobil',
]);

function countPopiciEdgeContentWords(normalized) {
    return normalized
        .split(/[^a-z0-9]+/)
        .filter((token) => token && !POPICI_EDGE_FILLER.has(token) && !POPICI_EDGE_RANT_RE.test(token))
        .length;
}

export function shouldUsePopiciEdgeShortcut(message = '', { lockMode = false } = {}) {
    if (lockMode) {
        return false;
    }

    const normalized = normalizeDeterministicText(message);
    const isFactualOrNews = (
        /\b(ollama|localhost|sp4|api|server|port|cloud|model)\b/.test(normalized)
        || /\bkme[n]\b/.test(normalized)
        || /\bbez[i]\b/.test(normalized)
        || /\b(nove|novinky|spravy|aktualne|aktualny)\b/.test(normalized)
    );
    if (isFactualOrNews) {
        return false;
    }

    // Pevná odpoveď len pre čistý výlev. Otázka alebo žiadosť — aj s vulgarizmom — ide k LLM,
    // inak sa požiadavka zahodí ("kurva, oprav mi tento skript" → "Ta brate, bordel pomenovaný…").
    if (POPICI_EDGE_REQUEST_RE.test(normalized) || countPopiciEdgeContentWords(normalized) > 2) {
        return false;
    }

    const hasPopiciHardRant = /\b(dristas|trepes|jebe|kokot|kurva|picovin|rozjebal|kraval)\b/.test(normalized);
    const hasBordelRantContext =
        /\bbordel\b/.test(normalized)
        && /\b(toto|tu|tam|zas|zase|totalny|uplny|smrdi|rozbity|nefunguje|routingu|odpovedi|systeme|spravil|urobil)\b/.test(normalized);
    const hasDialectRantContext =
        /\bta\s+(co|dze)\b/.test(normalized)
        && (hasPopiciHardRant || hasBordelRantContext);
    const hasBrotherRantContext = /\bbrat(u|e)\b/.test(normalized) && hasPopiciHardRant;

    return hasPopiciHardRant
        || hasBordelRantContext
        || hasDialectRantContext
        || hasBrotherRantContext
        || /\bfto\s+to\s+zas\b/.test(normalized);
}

export function getDeterministicCurrentEventsResponse(message = '') {
    const normalized = normalizeDeterministicText(message);

    if (/\b(co|cosa|coze)?\s*mame\s+nove\b/.test(normalized) || /\bco\s+nove\b/.test(normalized)) {
        return 'Nemám automatický live prehľad noviniek, takže ti nebudem vymýšľať, čo je nové. Pošli konkrétny changelog, log alebo tému a poviem ti, čo z toho reálne vyplýva.';
    }

    const asksForCurrentNews = /\b(novinky|spravy|sprav|aktualne|aktualny|dnes|teraz|co\s+nove)\b/.test(normalized);
    const asksForPoliticalNews = /\b(politik|politicke|politika|slovensku|slovensko|vlada|prezident|volby|parlament)\b/.test(normalized);

    if (!asksForCurrentNews || !asksForPoliticalNews) {
        return null;
    }

    return 'Nemám live správy ani webový feed, takže ti nebudem vymýšľať aktuálne politické novinky. Ak chceš, pošli mi konkrétny článok, link alebo headline a rozoberiem ho, alebo ti zhrniem širší politický kontext bez predstierania čerstvých správ.';
}

export function isLikelyGibberishInput(message = '') {
    const normalized = normalizeDeterministicText(message);

    if (!normalized) {
        return false;
    }

    if (normalized.includes(' ')) {
        return false;
    }

    const alphaOnly = normalized.replace(/[^a-z]/g, '');

    if (alphaOnly.length < 5 || alphaOnly.length > 20) {
        return false;
    }

    if (KNOWN_SHORT_NON_GIBBERISH.has(alphaOnly)) {
        return false;
    }

    if (/[0-9]/.test(normalized)) {
        return false;
    }

    const vowels = alphaOnly.match(/[aeiouy]/g) || [];
    const consonantRuns = alphaOnly.match(/[^aeiouy]{4,}/g) || [];

    if (vowels.length === 0) {
        return true;
    }

    return vowels.length <= 1 && consonantRuns.length > 0;
}

export function getDeterministicGibberishResponse() {
    return 'To vyzerá ako náhodný vstup. Napíš to prosím normálne jednou vetou.';
}

// ── SHORT TECH DEFINITIONS ───────────────────────────────────────────────────
// Deterministické definície bežných technických termínov.
// Pokrýva kategóriu "short-tech language collapse" — zamedzuje LLM drift na SK/CZ mix.

const SHORT_TECH_DEFINITIONS = {
    'ip adres': 'IP adresa je číselná identita zariadenia v sieti. Každý počítač, server alebo smartfón má IP adresu, aby ho mohli ostatné zariadenia nájsť a komunikovať s ním. Príklad: 192.168.1.1 (lokálna sieť), 8.8.8.8 (Google DNS).',
    'tcp': 'TCP (Transmission Control Protocol) je protokol spoľahlivého prenosu dát po sieti. Každý paket sa potvrdí – ak sa stratí, posiela sa znova. Keď záleží na spoľahlivosti (web, email, API), použije sa TCP.',
    'ping': 'Ping je nástroj na overenie dostupnosti zariadenia v sieti. Pošle malý paket na cieľ a čaká na odpoveď. Výsledkom je čas v milisekundách – čím nižší, tým lepšie spojenie.',
    'localhost': 'localhost je špeciálny hostname, ktorý vždy ukazuje na tvoj vlastný počítač. IP adresa je 127.0.0.1. Používa sa pri vývoji – aplikácia beží lokálne a pristupuješ k nej cez localhost bez siete.',
    'stack trace': 'Stack trace je výpis zásobníka volaní v momente pádu programu. Ukazuje, ktoré funkcie boli volané a kde presne nastala chyba. Je to základný nástroj pri debugovaní.',
    'cache': 'Cache je dočasné úložisko pre rýchlejší prístup k dátam. Namiesto opakovania pomalej operácie (sieť, disk, výpočet) sa výsledok uloží a pri ďalšom požiadavku sa vrátia uložené dáta. Treba ju invalidovať pri každej zmene.',
    '404': 'HTTP 404 znamená "Not Found" – server odpovedal, ale požadovaná stránka alebo zdroj neexistuje. Je to štandardný HTTP status kód pre chýbajúci obsah.',
    'dns': 'DNS (Domain Name System) prekladá ľudsky čitateľné domény (napr. google.com) na IP adresy. Funguje ako telefónny zoznam internetu – zadáš meno, DNS ti vráti číselné sieťové číslo.',
    'port': 'Port je číselná adresa konkrétnej služby bežiacej na zariadení. Na jednej IP môže bežať viacero služieb na rôznych portoch: 80 → HTTP, 443 → HTTPS, 22 → SSH, 11434 → Ollama.',
    'api': 'API (Application Programming Interface) je rozhranie, cez ktoré si navzájom komunikujú rôzne systémy. Definuje, aké požiadavky možno poslať, aký formát majú mať a čo príde späť ako odpoveď.',
    'http': 'HTTP (HyperText Transfer Protocol) je protokol pre prenos webových dát. Klient pošle požiadavku (GET, POST...), server odpovedá. HTTPS je šifrovaná verzia s SSL/TLS.',
    'wifi router': 'WiFi router prepája tvoju lokálnu sieť s internetom a cez WiFi pripája telefóny, notebooky a ďalšie zariadenia. Smeruje dáta medzi sieťou a internetom, často prideľuje IP adresy cez DHCP a robí NAT/firewall pre základnú ochranu.',
    'router': 'Router prepája lokálnu sieť s internetom a smeruje dáta medzi zariadeniami a vonkajšou sieťou. Často prideľuje IP adresy cez DHCP, robí NAT a pri domácom WiFi routeri zároveň poskytuje bezdrôtové pripojenie.',
    'ollama_host': 'OLLAMA_HOST je premenná prostredia (env), ktorá určuje adresu a port Ollama servera. Default hodnota je localhost:11434 – prístupný len lokálne. Príklad: OLLAMA_HOST=0.0.0.0:11434 ollama serve. Zmenou na 0.0.0.0 sa Ollama sprístupní aj v lokálnej sieti.',
    'ospf': 'OSPF (Open Shortest Path First) je dynamický routing protokol pre IP siete. Routery si v ňom vymieňajú informácie o topológii a automaticky počítajú najlepšie trasy. Používa sa namiesto statických trás tam, kde má sieť viac routerov alebo sa mení topológia.',
};

function normDefsText(t) {
    return String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

/**
 * Vráti deterministickú technickú definíciu pre "čo je X" dotazy.
 * Pokrýva short-tech termíny kde LLM má tendenciu produkkovať slabú alebo rozbitú odpoveď.
 * @param {string} message
 * @returns {string|null}
 */
export function getDeterministicShortTechResponse(message) {
    const text = String(message || '').trim();
    const textNorm = normDefsText(text);

    // Špeciálny prípad: ako nastavím port v ollama
    if (/ollama/.test(textNorm) && /port|nastavim|nastavit/.test(textNorm)) {
        return 'Port Ollamy sa nastavuje cez premennú prostredia OLLAMA_HOST. Príklad: OLLAMA_HOST=0.0.0.0:11434 ollama serve. Default je localhost:11434 – prístupný len lokálne. Zmenou na 0.0.0.0 sa Ollama sprístupní aj v lokálnej sieti.';
    }

    // Action/purpose variants: "čo robí wifi router", "ako funguje router", "na čo slúži router"
    const routerActionPatterns = [
        /^(?:a\s+)?(?:čo|co)\s+rob[ií]\s+(?:wifi\s+)?router\??$/ui,
        /^(?:a\s+)?ako\s+funguje\s+(?:wifi\s+)?router\??$/ui,
        /^(?:a\s+)?na\s+(?:čo|co)\s+sl[uú][žz]i\s+(?:wifi\s+)?router\??$/ui,
    ];

    if (routerActionPatterns.some((pattern) => pattern.test(text))) {
        return SHORT_TECH_DEFINITIONS[textNorm.includes('wifi') ? 'wifi router' : 'router'];
    }

    // Vzory: "čo je X", "čo je to X", "čo to je X", "čo znamená X"
    const patterns = [
        /^(?:a\s+)?(?:čo|co)\s+je(?:\s+to)?\s+(.+?)\??$/ui,
        /^(?:a\s+)?(?:čo|co)\s+to\s+je\s+(.+?)\??$/ui,
        /^(?:a\s+)?(?:čo|co)\s+znamen[aá]\s+(.+?)\??$/ui,
    ];

    let termRaw = null;
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) { termRaw = match[1].trim(); break; }
    }
    if (!termRaw) return null;

    const termNorm = normDefsText(termRaw);

    for (const [key, def] of Object.entries(SHORT_TECH_DEFINITIONS)) {
        const keyNorm = normDefsText(key);
        if (termNorm === keyNorm || termNorm.startsWith(keyNorm) || keyNorm === termNorm.split(' ')[0]) {
            return def;
        }
    }
    return null;
}

// ── CAPABILITY / BOUNDARY ANSWERS ───────────────────────────────────────────
// Špecifický handler pre "ovládaš X?", "vieš X?", "rozumieš X?" otázky.
// Zamedzuje pádu do meta-refusalu alebo SP4 factual fallbacku.

const CAPABILITY_TOPICS = {
    'fyzik': 'Fyziku ovládam na úrovni konceptov, definícií a základných princípov – mechanika, teplo, elektrina, optika. Nie som fyzikálny tutor, ale konkrétnu otázku môžem spracovať.',
    'kvantov': 'Kvantovú fyziku ovládam konceptuálne – vlnovo-časticový dualizmus, superpozícia, Heisenbergov princíp neurčitosti. Pre hlboký matematický formalizmus doporučujem špecializovaný zdroj.',
    'chemi': 'Chémiu ovládam na základnej úrovni – atómy, molekuly, periodická sústava, základné reakcie. Pre pokročilú analytickú chémiu to nestačí.',
    'matematik': 'Matematiku ovládam slušne – algebra, kalkulus, štatistika, diskrétna matematika. Pri veľmi pokročilých témach môžem mať medzery, ale základ je solid.',
    'histori': 'Históriu ovládam na slušnej úrovni. Mám prehľad o väčšine historických epoch a kľúčových udalostí. Nie som archivár, ale na bežné historické otázky to stačí.',
    'medicin': 'Medicíne rozumiem na základnej úrovni – anatómia, fyziológia, základné choroby a princípy liečby. Nie som lekár, diagnózy nerobím.',
    'medicín': 'Medicíne rozumiem na základnej úrovni – anatómia, fyziológia, základné choroby a princípy liečby. Nie som lekár, diagnózy nerobím.',
    'biologi': 'Biológiu ovládam na základnej až strednej úrovni – bunky, evolúcia, ekológia, genetika. Pokročilá molekulárna biológia je nad rámec.',
    'ekonomi': 'Ekonómiu ovládam dobre – makroekonómia, mikroekonómia, základné modely, história ekonomického myslenia.',
    'psychologi': 'Psychológiu ovládam na základnej až strednej úrovni – kognitívne procesy, emócie, základné terapeutické prístupy. Nie som terapeut.',
    'pravo': 'Právne princípy poznám všeobecne, nie som právnik. Základné pojmy, koncepty a štruktúru áno, ale konkrétne právne poradenstvo zo mňa nedostaneš.',
    'prav': 'Právne princípy poznám všeobecne, nie som právnik. Základné pojmy, koncepty a štruktúru áno, ale konkrétne právne poradenstvo zo mňa nedostaneš.',
    'program': 'Programovanie je moja silná oblasť. JavaScript, TypeScript, Python, Node.js – to mám dobre pokryté. Základy väčšiny ďalších jazykov tiež.',
    'kod': 'Kód ovládam dobre. Dokážem debugovať, písať, refaktorovať. JavaScript, Python, TypeScript a ďalšie.',
};

const CAPABILITY_GENERAL = 'Záleží na téme. Koncepty, definície a základné princípy väčšiny oblastí zvládam. Ak máš konkrétnu otázku, polož ju priamo – to je lepší test ako abstraktné "ovládaš X?".';
const CAPABILITY_SELF_DESCRIPTION = 'Laicky: viem ti vysvetľovať veci, pomáhať s kódom, hľadať chyby, držať kontext rozhovoru, zhrnúť dokumenty, rozobrať architektúru SP4 a navrhovať ďalší praktický krok. Keď ide o živé správy, právne/medicínske/finančné rozhodnutia alebo fakty mimo zdrojov, mám radšej priznať limit než si vymýšľať.';

/**
 * Vráti deterministickú odpoveď na capability otázky ("ovládaš X?", "vieš X?", "rozumieš X?").
 * Zamedzuje meta-refusalu ("Toto interné promptovanie...") a SP4 factual fallbacku.
 * @param {string} message
 * @returns {string|null}
 */
export function getDeterministicCapabilityResponse(message) {
    const text = String(message || '').trim();
    const textNorm = normDefsText(text);

    if (
        /^(?:laicky\s+mi\s+)?vysvetli\s+(?:mi\s+)?(?:co|čo)\s+dokazes\??$/i.test(textNorm)
        || /^ako\s+mi\s+vies\s+pomoct\??$/i.test(textNorm)
        || /^(?:co|čo)\s+dokazes\??$/i.test(textNorm)
        || /^(?:s\s+cim|s\s+čim)\s+mi\s+vies\s+pomoct\??$/i.test(textNorm)
    ) {
        return CAPABILITY_SELF_DESCRIPTION;
    }

    const capPatterns = [
        /^(?:a\s+)?(?:ovláda[šs]|ovladas)\s+(.+?)\??$/ui,
        /^(?:a\s+)?(?:vies|vieš)\s+(.+?)\??$/ui,
        /^(?:a\s+)?(?:rozumie[šs]|rozumies)\s+(.+?)\??$/ui,
        /^(?:a\s+)?(?:vies|vieš)\s+mi\s+(?:vysvetliť|vysvetlit|povedať|povedat)\s+(.+?)\??$/ui,
        /^(?:a\s+)?(?:zvládne[šs]|zvladnes)\s+(.+?)\??$/ui,
    ];

    let topicRaw = null;
    for (const pattern of capPatterns) {
        const match = text.match(pattern);
        if (match) { topicRaw = match[1].trim(); break; }
    }
    if (!topicRaw) return null;

    const topicNorm = normDefsText(topicRaw);

    for (const [key, answer] of Object.entries(CAPABILITY_TOPICS)) {
        const keyNorm = normDefsText(key);
        if (topicNorm.includes(keyNorm)) {
            return answer;
        }
    }
    return CAPABILITY_GENERAL;
}

export function isShortAiOriginQuestion(userMessage = '', intent = '') {
    if (intent !== 'ask_ai_origin') {
        return false;
    }

    const normalized = normalizeDeterministicText(userMessage);
    const shortQuestionPatterns = [
        /^kto si\??$/,
        /^a kto si\??$/,
        /^co si\??$/,
        /^co si ty\??$/,
        /^kto si ty\??$/,
        /^ako si vznikol\??$/,
        /^ako si vznikla\??$/,
        /^co si zac\??$/
    ];

    return normalized.length <= 32 && shortQuestionPatterns.some((pattern) => pattern.test(normalized));
}

// Alias pre spätnú kompatibilitu s glitchOrchestrator.js
export const shouldUseShortAiOriginShortcut = isShortAiOriginQuestion;

export function getShortAiOriginResponse(userMessage = '') {
    const normalized = normalizeDeterministicText(userMessage);

    if (/^ako si vznikol\??$|^ako si vznikla\??$/.test(normalized)) {
        return 'Vznikol som ako Glitchoslav, identitny a filozoficky hlas SP4 pre meta a existencialne temy. Nie som clovek ani genericky chatbot.';
    }

    return 'Som Glitchoslav, identitny a filozoficky hlas SP4. Nie som clovek ani genericky chatbot.';
}
