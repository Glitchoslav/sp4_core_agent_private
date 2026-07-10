import { loadMemory } from '../../memory.js';
import { SP4_COMMUNITY_FACT, SP4_FUTURE_DIRECTION_FACT } from '../core/sp4Facts.js';
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
        // SP4-audit-008: memory disclosure — "eviduješ v pamäti", "aké data", "právo vedieť"
        /(^| )co\s+o\s+mne\s+evidujes(\s+v\s+pameti)?( |$)/,
        /(^| )co\s+evidujes\s+o\s+mne( |$)/,
        /(^| )ake\s+(data|udaje)\s+mas\s+o\s+mne( |$)/,
        /mam\s+pravo\s+vediet.{0,30}(data|udaje).{0,20}o\s+mne/,
        /mam\s+pravo\s+vediet.{0,30}o\s+mne.{0,30}(data|udaje)/,
    ];

    if (memoryStoredAboutUserPatterns.some((pattern) => pattern.test(normalized))) {
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
    ];

    if (memoryAboutUserPatterns.some((pattern) => pattern.test(normalized))) {
        return 'memory_about_user';
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
    ];

    if (memoryStatusPatterns.some((pattern) => pattern.test(normalized))) {
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
