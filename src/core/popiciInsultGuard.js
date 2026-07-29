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
    const traits = 'zly|zla|hlupy|hlupa|neschopny|neschopna|idiot\\w*|' +
        'blbec|blb\\w*|sasek|kokot|kurva|chuj\\w*|debil\\w*|dementny|' +
        'retard\\w*|nanic';
    const youArePattern = new RegExp(
        `\\b(ty\\s+si|si)\\s+(fakt\\s+|naozaj\\s+|uplne\\s+|uplny\\s+|totalne\\s+)?(${traits})\\b`
    );
    const dontBePattern = new RegExp(`\\bnebud\\s+(${traits})\\b`);
    return youArePattern.test(text) || dontBePattern.test(text);
}
