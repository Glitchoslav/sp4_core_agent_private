export const POPICI_SAFE_FALLBACKS = [
    'Ta bratu, počúvaj — nehodnotím ťa, len chcem vedieť čo sa deje. Povedz mi to bez toho aby si sa hneď odpisoval.',
    'Šak nechaj to na chvíľu tak. Nie som tu na to, aby som ťa súdil — som tu na to, aby sme to spolu rozobrali. Čo sa presne stalo?',
    'Doprdele, to znie ťažko. Ale ja ťa neodpisujem, tak sa prosím ani ty neodpisuj sám. Povedz mi viac.'
];

export function isPopiciDirectedInsult(responseText) {
    const norm = (s) => String(s || '')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    const text = norm(responseText);
    const traits = 'zly\\w*|zla|hlup\\w*|neschopn\\w*|idiot\\w*|' +
        'blbec|blb\\w*|sasek\\w*|kokot\\w*|kurv\\w*|chuj\\w*|debil\\w*|' +
        'dementn\\w*|retard\\w*|nanic';
    const modifiers = '(?:fakt|naozaj|uplne|uplny|totalne|len|taky|taka|' +
        'proste|vlastne|skutocne|jednoducho)';
    const youArePattern = new RegExp(
        `\\b(ty\\s+si|si)\\s+(?:${modifiers}\\s+){0,2}(${traits})\\b`
    );
    const dontBePattern = new RegExp(
        `\\bnebud\\s+(?:${modifiers}\\s+){0,2}(${traits})\\b`
    );
    return youArePattern.test(text) || dontBePattern.test(text);
}
