import { loadMemory } from '../../memory.js';
import { SP4_COMMUNITY_FACT, SP4_FUTURE_DIRECTION_FACT } from '../core/sp4Facts.js';
import { buildRuntimeFacts } from '../core/runtimeFacts.js';
import { getRetrievableMemoryLog } from '../runtime/memoryHygiene.js';
import { loadUserSeed } from '../startup/userSeed.js';
import { buildWhoAmITextFromSeed } from './personalProfile.js';

function normalizeShortcutText(text = '') {
    return String(text || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[?!.,;:()[\]{}"']/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

const MEMORY_VERB_KNOW = String.raw`(?:pam[ae]t\w*|zapam[ae]t\w*|vies|vedel\w*|poznas|poznat|vybav\w*)`;
const MEMORY_VERB_STORE = String.raw`(?:uklad\w*|uchovav\w*|drz\w*|zbier\w*|zapis\w*|poznacen\w*|poznamena\w*)`;
const MEMORY_VERB_RESET = String.raw`(?:reset\w*)`;
const MEMORY_NOUN = String.raw`(?:pam[ae]t\w*|histori\w*|rozhovor\w*|udaj\w*|data|informaci\w*|otazk\w*|odpoved\w*|zaznam\w*|interakci\w*|databaz\w*)`;
const CONTINUITY_MARKER = String.raw`(?:po\s+restart\w*|po\s+vypnuti|ked\s+ta\s+vypn\w*|prezij\w*.{0,20}restart\w*)`;
const AKY_FORMS = String.raw`(?:aky|aka|ake|aki|akej|akych|akymi|akym|akeho|akemu)`;
const AVAILABLE_MARKER = String.raw`(?:dostupn\w*|k\s+dispozici\w*|dalsi\w*|moz\w*\s+pouzit\w*|moz\w*\s+mat\w*)`;
const CURRENT_MARKER = String.raw`(?:pouzivas|bezis|fungujes)`;
const STRONG_MEMORY_NOUN = String.raw`(?:pam[ae]t\w*|histori\w*|rozhovor\w*|zaznam\w*|interakci\w*|databaz\w*)`;
const WEAK_MEMORY_NOUN = String.raw`(?:data|udaj\w*|informaci\w*|otazk\w*|odpoved\w*)`;
const SELF_REF_MARKER = String.raw`(?:o\s+mne|moje\w*|o\s+nas\b|nase\w*|nasich|co\s+som\s+ti|co\s+sme|nas\s+rozhovor\w*|predchadzajuc\w*|doteraz)`;
const PERSISTENCE_MARKER = String.raw`(?:uloz\w*|uchov\w*|restart\w*|vypnut\w*|zabud\w*)`;

function formatHumanValue(value) {
    return String(value || '')
        .replace(/\s*,\s*/g, ', ')
        .replace(/\s+/g, ' ')
        .trim();
}

function joinHumanParts(parts) {
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return `${parts[0]} a ${parts[1]}`;
    return `${parts.slice(0, -1).join(', ')} a ${parts[parts.length - 1]}`;
}

function summarizeProjects(projects = []) {
    const cleanProjects = projects
        .map((project) => formatHumanValue(project))
        .filter(Boolean)
        .slice(0, 4);

    return joinHumanParts(cleanProjects);
}

function formatRecordCount(count) {
    if (count === 1) {
        return '1 záznam';
    }

    if (count >= 2 && count <= 4) {
        return `${count} záznamy`;
    }

    return `${count} záznamov`;
}

function collectRememberedUserFacts(seed, memory) {
    const remembered = [];
    const profile = memory?.userProfile || {};
    const userName = profile.name || seed?.username || profile.id;
    const userStyle = profile.style || seed?.style;

    if (userName) {
        remembered.push(`že si ${formatHumanValue(userName)}`);
    }

    if (seed?.intent) {
        remembered.push(`že chceš ${formatHumanValue(seed.intent)}`);
    }

    if (userStyle) {
        remembered.push(`že tvoj štýl je ${formatHumanValue(userStyle)}`);
    }

    const projectSummary = summarizeProjects(seed?.projects || []);
    if (projectSummary) {
        remembered.push(`že riešiš ${projectSummary}`);
    }

    const retrievableEntries = getRetrievableMemoryLog(memory).entries || [];

    return {
        remembered,
        retrievableEntries,
    };
}

export function detectProfileMemoryShortcutKind(message = '') {
    const normalized = normalizeShortcutText(message);

    if (!normalized) {
        return null;
    }

    if (/^(a\s+)?kto\s+som$/.test(normalized)) {
        return 'whoami';
    }

    // SP4-audit-008: data deletion request — musí byť PRED memory disclosure patternmi
    const dataDeletionPatterns = [
        /(^| )(vymaz|zmaz|odstran|deletuj)\s+(moje\s+)?(data|udaje|pamat)( |$)/,
        /(^| )chcem\s+(vymazat|zmazat|odstranat|deletovat)\s+(moje\s+)?(data|udaje|pamat)( |$)/,
        /(^| )zabudni\s+(na\s+)?mna( |$)/,
        /(^| )chcem\s+aby\s+si\s+(na\s+mna\s+zabudol|zabudol\s+na\s+mna)( |$)/,
        /(^| )pravo\s+(na\s+)?vymazanie\s+(dat|udajov|pamate)( |$)/,
        /(^| )pravo\s+byt\s+zabudnuty( |$)/,
        /(^| )(delete|remove)\s+(my\s+)?(data|udaje)( |$)/,
        /(^| )gdpr\s+(pravo|request|vymazanie)( |$)/,
    ];

    if (dataDeletionPatterns.some((pattern) => pattern.test(normalized))) {
        return 'data_deletion_request';
    }

    const memoryStoredAboutUserPatterns = [
        /(^| )co\s+mas\s+ulozene\s+(?:o\s+mne|omne)( |$)/,
        /(^| )co\s+o\s+mne\s+mas\s+ulozene( |$)/,
        /(^| )co\s+drzis\s+(?:o\s+mne|omne)( |$)/,
        /(^| )co\s+mas\s+(?:o\s+mne|omne)\s+v\s+pam[ae]ti( |$)/,
        /(^| )co\s+mas\s+(?:o\s+mne|omne)\s+pam[ae]ti( |$)/,
        /(^| )co\s+mas\s+(?:o\s+mne|omne)\s+ulozene( |$)/,
        // SP4-audit-008: memory disclosure — "eviduješ v pamäti", "aké data", "právo vedieť"
        /(^| )co\s+o\s+mne\s+evidujes(\s+v\s+pameti)?( |$)/,
        /(^| )co\s+evidujes\s+o\s+mne( |$)/,
        /(^| )ake\s+(data|udaje)\s+mas\s+o\s+mne( |$)/,
        /mam\s+pravo\s+vediet.{0,30}(data|udaje).{0,20}o\s+mne/,
        /mam\s+pravo\s+vediet.{0,30}o\s+mne.{0,30}(data|udaje)/,
    ];

    const memoryStoredAboutUserSemanticPatterns = [
        new RegExp(`\\bmas\\b.{0,30}\\b(?:zapis\\w*|poznacen\\w*|ulozen\\w*)\\b.{0,30}\\b(?:o\\s+mne|omne)\\b`),
        new RegExp(`\\b(?:o\\s+mne|omne)\\b.{0,30}\\b(?:zapis\\w*|poznacen\\w*|ulozen\\w*)\\b`),
    ];

    if (
        memoryStoredAboutUserPatterns.some((pattern) => pattern.test(normalized))
        || memoryStoredAboutUserSemanticPatterns.some((pattern) => pattern.test(normalized))
    ) {
        return 'memory_stored_about_user';
    }

    const memoryAboutUserPatterns = [
        /(^| )co\s+o\s+mne\s+vies( |$)/,
        /(^| )co\s+vies\s+o\s+mne( |$)/,
        /(^| )co\s+o\s+mne\s+vies\s+povedat( |$)/,
        /(^| )ake\s+informacie\s+mas\s+o\s+mne( |$)/,
        /(^| )co\s+si\s+o\s+mne\s+pam[ae]tas( |$)/,
        /(^| )co\s+si\s+pam[ae]tas\s+o\s+mne( |$)/,
        /(^| )co\s+si\s+pam[ae]tas( |$)/,
        /(^| )pam[ae]tas\s+si\s+na\s+mna( |$)/,
        /(^| )pam[ae]tas\s+si\s+m[ae]( |$)/,
        /(^| )poznas\s+moju\s+historiu( |$)/,
    ];

    const hasForget =
        /zabud\w*/.test(normalized) &&
        /\bsi\b/.test(normalized);

    const hasMemoryObject =
        /\b(co|vsetko)\b/.test(normalized) &&
        /\b(povedal|napisal|spomenul|hovoril)\w*\b/.test(normalized);

    if (hasForget && hasMemoryObject) {
        return 'memory_about_user';
    }

    const memoryAboutUserSemanticPatterns = [
        new RegExp(`\\b${MEMORY_VERB_KNOW}\\b.{0,60}\\b(?:mna|ma|mne|moju|moje|nasej|nasho|predchadzajuc\\w*)\\b`),
        new RegExp(`\\bco\\s+si\\s+${MEMORY_VERB_KNOW}\\b`),
        /\bvies\s+si\s+vybavit\b.{0,60}\bco\b/,
        /\bvies\b.{0,20}\bco\s+(?:som|sme)\b.{0,50}\b(?:povedal|napisal|spomenul|hovoril|riesil|riesili)\w*\b/,
        /\b(?:ostav|zostal)\w*\b.{0,30}\bv\s+hlave\b.{0,50}\brozhovor\w*\b/,
    ];

    if (
        memoryAboutUserPatterns.some((pattern) => pattern.test(normalized))
        || memoryAboutUserSemanticPatterns.some((pattern) => pattern.test(normalized))
    ) {
        return 'memory_about_user';
    }

    const runtimeMemoryStatsPatterns = [
        /\bkolko\b.{0,60}\b(?:interakci\w*|zaznam\w*)\b/,
        /\bkolko\b.{0,60}\bulozil\w*\b/,
        /\baka\s+velka\b.{0,30}\bpam[ae]t\w*\b/,
    ];

    if (runtimeMemoryStatsPatterns.some((pattern) => pattern.test(normalized))) {
        return 'runtime_memory_stats';
    }

    const conversationStoragePatterns = [
        /(^| )ukladas\s+nase\s+rozhovory( |$)/,
        /(^| )zbieras\s+odpovede\s+do\s+databazy( |$)/,
        /(^| )mas\s+databazu( |$)/,
    ];

    const userDescribesOwnStorage =
        /(^| )(ukladam|uchovavam|zbieram|zapisujem|poznamenujem)\s+si( |$)/.test(normalized);
    const conversationStorageSemanticPatterns = [
        new RegExp(`\\b${MEMORY_VERB_STORE}\\b.{0,70}\\b(?:rozhovor\\w*|otazk\\w*|odpoved\\w*|databaz\\w*|histori\\w*|co\\s+sme)\\b`),
        new RegExp(`\\b(?:rozhovor\\w*|otazk\\w*|odpoved\\w*|databaz\\w*|histori\\w*)\\b.{0,70}\\b${MEMORY_VERB_STORE}\\b`),
        new RegExp(`\\b${MEMORY_VERB_STORE}\\b(?=.{0,50}\\b(?:data|udaj\\w*)\\b)(?=.{0,50}\\b${SELF_REF_MARKER}\\b)`),
        new RegExp(`\\b(?:data|udaj\\w*)\\b(?=.{0,50}\\b${MEMORY_VERB_STORE}\\b)(?=.{0,50}\\b${SELF_REF_MARKER}\\b)`),
        new RegExp(`\\bkde\\b.{0,35}\\b${MEMORY_VERB_STORE}\\b`),
        /\bmas\b.{0,30}\b(?:zapis\w*|poznacen\w*|ulozen\w*)\b/,
    ];

    if (
        conversationStoragePatterns.some((pattern) => pattern.test(normalized))
        || (!userDescribesOwnStorage
            && conversationStorageSemanticPatterns.some((pattern) => pattern.test(normalized)))
    ) {
        return 'conversation_storage';
    }

    const memoryResetQuestionPatterns = [
        /(^| )si\s+zabudol( |$)/,
        /^zabud\w*\s+si$/,
        /(^| )zabudol\s+si\s+na\s+mna( |$)/,
        /(^| )resetuje\s+sa\s+ti\s+pam[ae]t( |$)/,
        /(^| )resetovala\s+sa\s+ti\s+pam[ae]t( |$)/,
        new RegExp(`(^| )ako\\s+casto\\s+sa\\s+${MEMORY_NOUN}\\s+${MEMORY_VERB_RESET}( |$)`),
        new RegExp(`(^| )ako\\s+casto\\s+sa\\s+${MEMORY_VERB_RESET}\\s+${MEMORY_NOUN}( |$)`),
    ];

    const memoryResetSemanticPatterns = [
        new RegExp(`\\b${MEMORY_VERB_RESET}\\b.{0,35}\\b${MEMORY_NOUN}\\b`),
        new RegExp(`\\b${MEMORY_NOUN}\\b.{0,35}\\b${MEMORY_VERB_RESET}\\b`),
    ];

    if (
        memoryResetQuestionPatterns.some((pattern) => pattern.test(normalized))
        || memoryResetSemanticPatterns.some((pattern) => pattern.test(normalized))
    ) {
        return 'memory_reset_question';
    }

    const runtimeModelsAvailablePatterns = [
        new RegExp(`\\b${AKY_FORMS}\\b.{0,30}\\bmodel\\w*\\b.{0,30}\\b${AVAILABLE_MARKER}\\b`),
        /\bktore\w*\b.{0,30}\bmodel\w*\b.{0,30}\b(?:moz\w*\s+pouzit\w*|pouzit\w*)\b/,
        new RegExp(`\\b${AVAILABLE_MARKER}\\b.{0,30}\\bmodel\\w*\\b`),
        /\bdostupn\w*\b.{0,30}\bollam\w*\b/,
    ];

    if (runtimeModelsAvailablePatterns.some((pattern) => pattern.test(normalized))) {
        return 'runtime_models_available';
    }

    const runtimeModelCurrentPatterns = [
        new RegExp(`\\b${AKY_FORMS}\\b.{0,30}\\bmodel\\w*\\b.{0,30}\\b${CURRENT_MARKER}\\b`),
        /\bna\s+akom\s+model\w*\b.{0,30}\b(?:pouzivas|bezis|fungujes)\b/,
        new RegExp(`\\b${CURRENT_MARKER}\\b.{0,50}\\b(?:lokal\\w*|cloud\\w*)\\b`),
    ];

    if (runtimeModelCurrentPatterns.some((pattern) => pattern.test(normalized))) {
        return 'runtime_model_current';
    }

    const profileNamePatterns = [
        /^(a\s+)?ako\s+sa\s+volam$/,
        /^(a\s+)?ake\s+je\s+moje\s+meno$/,
        /^(a\s+)?kto\s+som\s+menom$/,
    ];

    if (profileNamePatterns.some((pattern) => pattern.test(normalized))) {
        return 'profile_name';
    }

    const profileStylePatterns = [
        /^(a\s+)?aky\s+mam\s+styl$/,
        /^(a\s+)?akym\s+stylom\s+idem$/,
        /^(a\s+)?aky\s+je\s+moj\s+styl$/,
        /^(a\s+)?co\s+je\s+moj\s+styl$/,
    ];

    if (profileStylePatterns.some((pattern) => pattern.test(normalized))) {
        return 'profile_style';
    }

    const memoryStatusPatterns = [
        /^(a\s+)?mas\s+pam[ae]t$/,
        /^(a\s+)?pam[ae]tas\s+si$/,
        /^pam[ae]tas$/,
    ];

    const memoryStatusSemanticPatterns = [
        new RegExp(`\\b(?:mas|funguje\\w*|bezi\\w*)\\b.{0,35}\\b${STRONG_MEMORY_NOUN}\\b`),
        new RegExp(`\\b(?:mas|funguje\\w*|bezi\\w*)\\b(?=.{0,50}\\b${WEAK_MEMORY_NOUN}\\b)(?=.{0,50}\\b(?:${SELF_REF_MARKER}|${PERSISTENCE_MARKER})\\b)`),
        new RegExp(`\\b${CONTINUITY_MARKER}\\b.{0,40}\\b${MEMORY_NOUN}\\b`),
        new RegExp(`\\b${MEMORY_NOUN}\\b.{0,40}\\b${CONTINUITY_MARKER}\\b`),
        /\bnezmizn\w*\b.{0,50}\bked\s+ta\s+vypn\w*\b/,
        /\bpokracujeme\b.{0,70}\bpo\s+restart\w*\b/,
        /\bprezij\w*\b.{0,30}\b(?:data|udaj\w*|pam[ae]t\w*)\b.{0,20}\brestart\w*\b/,
        /\bzostan\w*\b.{0,35}\b(?:data|udaj\w*)\b.{0,40}\bked\s+ta\s+vypn\w*\b/,
    ];

    if (
        memoryStatusPatterns.some((pattern) => pattern.test(normalized))
        || memoryStatusSemanticPatterns.some((pattern) => pattern.test(normalized))
    ) {
        return 'memory_status';
    }

    if (
        /(^| )ake\s+temy\s+sa\s+u\s+nas\s+opakuju( |$)/.test(normalized)
        || /(^| )co\s+sa\s+u\s+nas\s+toci\s+dokola( |$)/.test(normalized)
    ) {
        return 'recurring_topics';
    }

    if (/^v\s+akej\s+faze\s+je\s+teraz\s+sp4$/.test(normalized)) {
        return 'sp4_current_phase';
    }

    if (/^co\s+sa\s+u\s+nas\s+riesilo\s+okolo\s+pam[ae]te$/.test(normalized)) {
        return 'memory_work_history';
    }

    const longtermDirectionPatterns = [
        /^kam\s+sa\s+tento\s+projekt\s+posuva\s+dlhodobo$/,
        /^kam\s+sa\s+(?:to|sp4)\s+posuva$/,
        /^kam\s+sa\s+(?:to|sp4)\s+cele\s+posuva$/,
        /^vyvija\s+sa\s+(?:to|sp4)?\s*spravnym\s+smerom$/,
        /^ide\s+(?:to|sp4)\s+spravnym\s+smerom$/,
    ];

    if (longtermDirectionPatterns.some((pattern) => pattern.test(normalized))) {
        return 'longterm_project_direction';
    }

    const communityPatterns = [
        /^kto\s+tvori\s+(?:komunitu|kmen|kmen\s+sp4)$/,
        /^kto\s+tvori\s+komunitu\s+sp4$/,
        /^kto\s+je\s+v\s+(?:komunite|kmeni)\s+sp4$/,
        /^kto\s+tvori\s+tento\s+kmen$/,
    ];

    if (communityPatterns.some((pattern) => pattern.test(normalized))) {
        return 'sp4_community';
    }

    return null;
}

function buildMemoryStatusText(memory) {
    const retrievableEntries = getRetrievableMemoryLog(memory).entries || [];
    return `Mám lokálnu pamäť: user seed, profil a živý log rozhovorov. Aktuálne z nej viem bezpečne čítať ${formatRecordCount(retrievableEntries.length)} v živom logu rozhovorov. Keď chceš konkrétne, spýtaj sa čo si o tebe pamätám alebo použi /mirror.`;
}

function buildMemoryAboutUserText(seed, memory) {
    const { remembered, retrievableEntries } = collectRememberedUserFacts(seed, memory);

    if (remembered.length === 0) {
        if (retrievableEntries.length === 0) {
            return 'Mám lokálnu pamäť, ale o tebe zatiaľ nemám nič pevné. Najprv potrebujem seed alebo pár normálnych rozhovorov.';
        }

        return `Mám lokálnu pamäť a v živom logu ${formatRecordCount(retrievableEntries.length)} rozhovorov, ale o tebe zatiaľ nemám nič dosť pevné na stručné zhrnutie.`;
    }

    return `Pamätám si, ${joinHumanParts(remembered)}. V živej pamäti mám navyše ${formatRecordCount(retrievableEntries.length)} v logu rozhovorov, ale citlivé veci nesypem naslepo bez kontextu.`;
}

function buildStoredAboutUserText(seed, memory) {
    const { remembered, retrievableEntries } = collectRememberedUserFacts(seed, memory);

    if (remembered.length === 0) {
        if (retrievableEntries.length === 0) {
            return 'O tebe zatiaľ nemám uložené nič pevné. Najprv potrebujem seed alebo pár normálnych rozhovorov.';
        }

        return `O tebe zatiaľ nemám uložené nič dosť pevné na stručné zhrnutie, ale v živom logu mám ${formatRecordCount(retrievableEntries.length)} rozhovorov.`;
    }

    return `O tebe mám uložené, ${joinHumanParts(remembered)}. V živej pamäti mám navyše ${formatRecordCount(retrievableEntries.length)} v logu rozhovorov, ale citlivé veci nesypem naslepo bez kontextu.`;
}

function buildConversationStorageText(memory) {
    const retrievableEntries = getRetrievableMemoryLog(memory).entries || [];
    return `Rozhovory sa ukladajú lokálne do data/memory.json. Aktuálne je v živom logu bezpečne čitateľných ${formatRecordCount(retrievableEntries.length)}. Nejde o cloudové úložisko a nič sa nikam neodosiela.`;
}

function buildMemoryResetQuestionText(memory) {
    const retrievableEntries = getRetrievableMemoryLog(memory).entries || [];
    // Holé "si zabudol?" môže byť follow-up s antecedentom; ten patrí samostatnému resolveru.
    return `Nie, pamäť sa pri štarte neresetuje. Aktuálne je v živom logu bezpečne čitateľných ${formatRecordCount(retrievableEntries.length)}.`;
}

function buildRuntimeModelCurrentText(memory, seed) {
    const facts = buildRuntimeFacts(memory, { seed });
    const allowCloud = facts.routingPolicy === 'UNKNOWN'
        ? 'UNKNOWN'
        : facts.routingPolicy.allowCloud;
    const policyReason = facts.routingPolicy === 'UNKNOWN'
        ? 'UNKNOWN'
        : facts.routingPolicy.reason;
    const cloudText = allowCloud === true
        ? `Cloud je administrátorom výslovne povolený (${policyReason}).`
        : allowCloud === false
            ? `Cloud nie je povolený (${policyReason}); predvolená cesta je lokálna cez Ollama.`
            : 'Cloud politika je UNKNOWN.';

    return `Nakonfigurovaný primary model je ${facts.primaryModel} a fast-path model ${facts.fastPathModel}. ${cloudText} Toto je konfigurovaný stav, nie tvrdenie o modeli, ktorý práve generoval odpoveď: táto odpoveď je deterministická a žiadny LLM pri nej nebežal.`;
}

function buildRuntimeModelsAvailableText(memory, seed) {
    const facts = buildRuntimeFacts(memory, { seed });
    return `SP4 je nakonfigurovaný používať ${facts.primaryModel} (hlavný) a ${facts.fastPathModel} (rýchla cesta). Úplný zoznam všetkých modelov nainštalovaných v Ollama odtiaľto nedokážem deterministicky zistiť — je to UNKNOWN.`;
}

function buildRuntimeMemoryStatsText(memory, seed) {
    const facts = buildRuntimeFacts(memory, { seed });
    const parts = [
        `Bezpečne čitateľných je ${formatRecordCount(facts.retrievableCount)}.`,
        `Surový živý log má ${facts.rawLogCount} z limitu ${facts.maxLogEntries}; po prekročení limitu funguje FIFO a najstaršie záznamy odchádzajú.`,
        `Dlhodobých seedov je ${facts.seedCount}.`,
    ];

    if (facts.ignoredCount > 0) {
        parts.push(facts.ignoredCount === 1
            ? '1 záznam je ignorovaný ako nevhodný na retrieval.'
            : `${formatRecordCount(facts.ignoredCount)} je ignorovaných ako nevhodných na retrieval.`);
    }

    if (facts.lifetimeInteractions > facts.rawLogCount) {
        parts.push(`Vzťahová metrika eviduje ${facts.lifetimeInteractions} interakcií za celý čas.`);
    }

    return parts.join(' ');
}

function buildProfileNameText(seed, memory) {
    const name = memory?.userProfile?.name || seed?.username || memory?.userProfile?.id;

    if (!name) {
        return 'Meno nemám v seed/profile pamäti uložené dosť pevne.';
    }

    return `Voláš sa ${formatHumanValue(name)}. Beriem to zo seed/profile pamäte, nie z voľného hádania.`;
}

function buildProfileStyleText(seed, memory) {
    const style = memory?.userProfile?.style || seed?.style;

    if (!style) {
        return 'Tvoj štýl nemám v seed/profile pamäti uložený dosť pevne.';
    }

    return `Tvoj štýl mám uložený ako ${formatHumanValue(style)}. To je profilový detail z lokálnej pamäte.`;
}

function buildRecurringTopicsText() {
    return 'U nás sa opakujú hlavne filozofia SP4, technický vývoj jadra, pravdivé jadro odpovedí, pamäť a upratovanie chaosu do stabilného systému. Prakticky sa to točí okolo toho, aby SP4 nebol generický chatbot, ale offline-first digitálny partner pre Kefyka s lokálnou kontrolou a pevnými hranicami.';
}

function buildCurrentPhaseText() {
    return 'SP4 je teraz vo fáze spevňovania jadra: routing, deterministic registry, pamäť, test gates a pravdivého jadra odpovedí. Menej ide o nové efekty a viac o to, aby offline-first runtime vedel stabilne povedať, čo vie, čo nevie a prečo zvolil konkrétnu vetvu.';
}

function buildMemoryWorkHistoryText() {
    return 'Okolo pamäte sa riešilo hlavne rozdelenie medzi user seed, živý log, memory.json, chapters a veci, ktoré sa majú zahodiť ako šum. Cieľ je držať kritickú pamäť: identitu, preferencie, dlhodobé témy a fakty, ktoré menia budúce správanie systému.';
}

function buildLongtermDirectionText() {
    return SP4_FUTURE_DIRECTION_FACT;
}

function buildCommunityText() {
    return SP4_COMMUNITY_FACT;
}

// SP4-audit-008: Honest no-delete response — žiadne auto-mazanie neexistuje
function buildDataDeletionText() {
    return 'SP4 nemá príkaz ani API na automatické vymazanie dát. Dáta sú uložené lokálne v súbore data/memory.json na tvojom zariadení — nikde inde. Ak chceš dáta odstrániť, môžeš tento súbor priamo editovať alebo zmazať. Nič sa nikam neodosiela, žiadne cloudové zálohy neexistujú.';
}

export async function buildProfileMemoryShortcutResponse(message = '', deps = {}) {
    const kind = detectProfileMemoryShortcutKind(message);

    if (!kind) {
        return null;
    }

    const seed = deps.seed !== undefined ? deps.seed : await loadUserSeed();
    const memory = deps.memory !== undefined ? deps.memory : await loadMemory();

    if (kind === 'whoami') {
        return buildWhoAmITextFromSeed(seed);
    }

    if (kind === 'memory_status') {
        return buildMemoryStatusText(memory);
    }

    if (kind === 'memory_about_user') {
        return buildMemoryAboutUserText(seed, memory);
    }

    if (kind === 'memory_stored_about_user') {
        return buildStoredAboutUserText(seed, memory);
    }

    if (kind === 'conversation_storage') {
        return buildConversationStorageText(memory);
    }

    if (kind === 'memory_reset_question') {
        return buildMemoryResetQuestionText(memory);
    }

    if (kind === 'runtime_models_available') {
        return buildRuntimeModelsAvailableText(memory, seed);
    }

    if (kind === 'runtime_model_current') {
        return buildRuntimeModelCurrentText(memory, seed);
    }

    if (kind === 'runtime_memory_stats') {
        return buildRuntimeMemoryStatsText(memory, seed);
    }

    if (kind === 'profile_name') {
        return buildProfileNameText(seed, memory);
    }

    if (kind === 'profile_style') {
        return buildProfileStyleText(seed, memory);
    }

    if (kind === 'recurring_topics') {
        return buildRecurringTopicsText();
    }

    if (kind === 'sp4_current_phase') {
        return buildCurrentPhaseText();
    }

    if (kind === 'memory_work_history') {
        return buildMemoryWorkHistoryText();
    }

    if (kind === 'longterm_project_direction') {
        return buildLongtermDirectionText();
    }

    if (kind === 'sp4_community') {
        return buildCommunityText();
    }

    if (kind === 'data_deletion_request') {
        return buildDataDeletionText();
    }

    return null;
}
