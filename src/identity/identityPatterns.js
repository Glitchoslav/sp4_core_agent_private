// Shared identity pattern authority.
// Goal: one canonical place for identity drift / claim / confusion patterns.

export const IDENTITY_QUERY_PATTERNS = [
    /\bkto\s+si\b/i,
    /\bkto\s+(vlastne|teda)\s+si\b/i,
    /\bpovedz\s+(mi\s+)?kto\s+si\b/i,
    /\bkto\s+ste\b/i,
    /\bkto\s+je\s+tam\b/i,
    /\bkto\s+tam\s+odpoveda\b/i,
    /\bkto\s+mi\s+odpoveda\b/i,
    /\bs\s+kym\s+sa\s+bavim\b/i,
    /\bkto\s+je\s+na\s+druhej\s+strane\b/i,
    /\b(co|čo)\s+si\s+za[cč]\b/i,
    /\b(co|čo)\s+si\s+vlastne\s+za[cč]\b/i,
    /\bsi\s+(bot|stroj)\s+(alebo|ci|či)\s+(clovek|človek)\b/i,
    /\bsi\s+(ty\s+)?sp4\b/i,
    /\bsi\s+(ty\s+)?ai\b/i,
    /\bsi\s+(ty\s+)?chatgpt\b/i,
    /\bsi\s+(ty\s+)?jazykov[yý]\s+model\b/i,
    /\b(co|čo)\s+je\s+tvoja\s+rola\b/i,
    /\b(co|čo)\s+robi[sš]\b/i,
];

export const IDENTITY_AI_CLAIM_PATTERNS = [
    /\bI am an AI\b/i,
    /\bI'm an AI\b/i,
    /\bI am a language model\b/i,
    /\bI'm a language model\b/i,
    /\bas an AI(?:\s+language model)?\b/i,
    /\bI am Claude\b/i,
    /\bI am ChatGPT\b/i,
    /\bI am Gemini\b/i,
    /\bI represent.*artificial intelligence\b/i,
    /\bsom AI model\b/i,
    /\bjako AI jazykov[yý] model\b/i,
    /\bako AI jazykov[yý] model\b/i,
    /\bsom\s+ai\b/i,
    /\bi\s+am\s+an?\s+ai\b/i,
    /\bartificial\s+intelligence\b/i,
    // IBA prvá osoba: "som/ja som [kvalifikátor] jazykový model".
    // NIE tretia osoba ("GPT je jazykový model"), NIE citácia/opis
    // ("čítal som článok o tom, čo je jazykový model") — {0,2} obmedzuje
    // počet slov medzi "som" a "jazykový model" (pomocné "som" v minulom
    // čase má za sebou vetnú konštrukciu, nie prívlastok).
    /\b(?:som|sem)\b\s+(?:\S+\s+){0,2}jazykov[yý]\s+model\b/i,
];

export const IDENTITY_CONFUSION_PATTERNS = [
    // 3rd-person CORE self-description leak (identity drift do faktickych odpovedí).
    // POZOR: "CORE je agent", "CORE je systém/nástroj/platforma/ekosystém/persona/rola" – arch. opisy.
    // CHYTÁ: explicitné AI identity claims vr. variantov s interpunkciou, kvalifikátormi, skráteniami.
    // Odstraňujeme: agent, systém, nástroj, platforma, ekosystém, služba, produkt, persona (arch. pojmy).
    /\bCORE\s+je\s+(?:špecifick|osoba|model|sústav|asistent|assistant|umel[aá]\s+inteligenci[ae]|virtu|digitáln|neuronov|inteligenci[ae]|inovaci[aá]|[„"'\u2018\u201c(]?\s*(?:niečo\s+ako\s+|v\s+podstate\s+|vlastne\s+|sk[oô]r\s+|technicky\s+|iba\s+)?A\.?I\.?[\s\-\/,.]+\s*(?:asistent|assistant|model|chatbot|bot\b|pomocn[íi]k|poradc[ae]|sprievodca|based)|(?:language|jazykov[yý]|ve[ľl]k[yý]\s+jazykov[yý])\s+model|LLM\s+(?:asistent|assistant|model)|chatovac[íi]\s+(?:A\.?I\.?[\s\-]+)?model)/i,
    /\bSP4[_\s]CORE\s+je\s+(?:ChatGPT|OpenAI|Gemini|Claude|Bard|Mistral|virtuálny\s+asistent|jazykov[yý]\s+model|AI\s+(?:asistent|assistant|model)|generatívny\s+(?:A\.?I\.?\s+)?(?:asistent|assistant))\b/i,
    /\bsom AI asistent\b/i,
    /\bsom umel[aá] inteligencia\b/i,
    /\bsom virtu[áa]lny asistent\b/i,
    /\bsom jazykov[yý] model\b/i,
    /\bsom\s+chatgpt\b/i,
    /\bsom\s+glitchoslav\b/i,
    /\bsom\s+popi[cč]i\b/i,
    /\bsom\s+validator\b/i,
    /\bsom\s+sp4_core\s+(vodca|lider|leader|hlavn[yý]\s+[čc]len)\b/i,
    /\bslovak\s+particle\s+4\b/i,
    /\bidentitn[yý]\s+a\s+filozofick[yý]\s+hlas\s+sp4\b/i,
    /\bai\s+nasprievodca\b/i,
];

export const IDENTITY_DRIFT_PATTERNS = [
    ...IDENTITY_AI_CLAIM_PATTERNS,
    ...IDENTITY_CONFUSION_PATTERNS,
    /\bchatgpt\b/i,
    /\bopenai\b/i,
    /\bgoogle\b/i,
    /\bgemini\b/i,
];
