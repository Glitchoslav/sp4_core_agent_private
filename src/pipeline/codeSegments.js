// Ochrana kódu počas post-processingu odpovedí.
// Čistiace kroky (zhlukovanie medzier, delenie na vety, typo regexy) zlučovali kódové bloky
// do jedného riadku a ničili odsadenie. preserveCodeSegments() kód pred krokom nahradí
// tokenmi a po ňom ho vráti bajt po bajte. Text bez kódu ide do kroku nezmenený.

const FENCE_RE = /```[\s\S]*?```/g;
const INLINE_RE = /`[^`\n]+`/g;
// Dlhý alfanumerický token: prežije \s-zhlukovanie, delenie na vety aj dĺžkové kontroly (< 20 znakov).
// Zachytí aj medzery okolo tokenu — pri bloku kódu sa nahradia koncom riadku.
const TOKEN_RE = /([ \t]*)SP4CODESEGMENT_(\d+)_PRESERVED([ \t]*)/g;

/**
 * @param {string} text
 * @param {(masked: string) => string} transform - čistiaci krok
 * @returns {string} výsledok kroku s pôvodným kódom
 */
export function preserveCodeSegments(text, transform) {
    if (typeof text !== 'string' || !text.includes('`')) {
        return transform(text);
    }

    const segments = [];
    const hold = (kind) => (match) => {
        segments.push({ kind, text: match });
        return `SP4CODESEGMENT_${segments.length - 1}_PRESERVED`;
    };
    const masked = text.replace(FENCE_RE, hold('fence')).replace(INLINE_RE, hold('inline'));
    if (segments.length === 0) {
        return transform(text);
    }

    const result = transform(masked);
    if (typeof result !== 'string' || result.length === 0) {
        return result;
    }

    return result.replace(TOKEN_RE, (match, pre, index, post, offset, whole) => {
        const segment = segments[Number(index)];
        if (!segment) return match;
        if (segment.kind === 'inline') return `${pre}${segment.text}${post}`;
        // Blok kódu musí stáť na vlastných riadkoch, aj keď krok zlúčil okolie do jedného riadku.
        const end = offset + match.length;
        const before = offset === 0 || whole[offset - 1] === '\n' ? '' : '\n';
        const after = end === whole.length || whole[end] === '\n' ? '' : '\n';
        return `${before}${segment.text}${after}`;
    });
}

export default { preserveCodeSegments };
