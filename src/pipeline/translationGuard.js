export function isExplicitTranslationTask(message) {
  const text = String(message || '').trim().toLowerCase();

  return (
    /(nap[ií]š|vytvor|daj)\s+.*(po nemecky|v nem[cč]ine)/i.test(text) &&
    /(prelo[žz]|preklad)\s+.*(do sloven[cč]iny|po slovensky)/i.test(text)
  );
}

export function buildTranslationTaskPrompt(userMessage) {
  return `Splň presne túto úlohu používateľa.

PRAVIDLÁ:
1. Ak používateľ chce vetu v cudzom jazyku a potom preklad do slovenčiny, vráť presne 2 riadky.
2. Formát:
DE: ...
SK: ...
3. Nepíš anglické meta vety, komentáre ani vysvetlenia.
4. Nepíš "Here is", "Final answer", "Preklad:" ani nič navyše.
5. Zachovaj význam jednoducho a prirodzene.

Úloha používateľa:
${userMessage}`.trim();
}
