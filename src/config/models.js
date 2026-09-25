// Jednotny zdroj pravdy pre lokalne modely (.env). Bez zavislosti na LLM vrstve,
// aby ho mohol importovat routing (classify) aj llmLocal bez cyklickeho importu.
import 'dotenv/config';

export const PRIMARY_MODEL = process.env.PRIMARY_MODEL || 'gemma3:4b';
export const FALLBACK_MODEL = process.env.FALLBACK_MODEL || 'llama3.2:3b';
export const FAST_PATH_MODEL = process.env.FAST_PATH_MODEL || 'llama3.2:3b';
