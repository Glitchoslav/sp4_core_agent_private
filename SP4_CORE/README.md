# SP4_CORE Legacy Fallback

Tento priecinok je legacy fallback vrstva pre `sp4_core_agent/src/core/identityVault.js`.

Prakticky:

- nie je to canonical identity source of truth
- nepatri sem nova identity pravda
- root `identity/` je preferovana autorita
- tieto subory existuju len ako safety fallback pre stary hybrid runtime

Aktualne fallback subory:

- `SP4_IDENTITY.md`
- `KEFYK_IDENTITY.md`
- `KEFYK_CORE.md`
- `GLITCHOSLAV_FIRST_BREATH.md`
- `BEHAVIOR.md`
- `SPEECH_STYLE.md`
- `SP4_LANGUAGE.md`
- `POPICI_PERSONALITY.md`

Pravidlo:

- ak menis identity truth, men root `identity/`
- tento priecinok nema byt rozsirovany o nove identity fakty
- odstranenie je bezpecne az po uplnom zruseni legacy fallbacku z runtime
