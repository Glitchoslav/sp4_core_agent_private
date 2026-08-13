/**
 * SP4 bridge — komunitný hlas (2026-08-13)
 * Voliteľný `voice` string z /ask sa vloží do systemPrompt.
 * Samostatný modul bez side-effectov (testovateľný).
 */
export function buildVoiceBlock(voice) {
  const v = String(voice || '').trim();
  if (!v) return '';
  return `\n\n## Komunitný hlas\n${v}\n`;
}
