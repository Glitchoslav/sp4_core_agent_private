// T7 strangler Phase 0 — characterization testy routingu (bez LLM).
// Zaznamenávajú SÚČASNÉ správanie, nie "správne": pre každý prompt legacy personu
// (integration: pickMode → normalizePersona), bridge personu (classifyPrompt),
// tier + model (classify) a legacy model (pickModelForTaskDetailed).
// Zmena ktoréhokoľvek z nich = test padne → rozhodni vedome a pregeneruj:
//   UPDATE_CHARACTERIZATION=1 node --test tests/routing_characterization.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.SP4_MODEL_TAGS_REFRESH_MS = '0';

const FIXTURE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'routing_characterization.json');

// Skupina = zamýšľaná persona promptu (len pre čitateľnosť); assert ide proti fixture.
const PROMPTS = {
  core: [
    'Ako nastavím Ollama na inom porte?',
    'Čo je SP4?',
    'Vysvetli mi rozdiel medzi RAM a VRAM.',
    'Ako funguje pamäť v SP4?',
    'Napíš mi bash skript, ktorý zálohuje priečinok.',
    'Prečo mi npm install padá s chybou EACCES?',
    'Aký model SP4 používa lokálne?',
    'Ako sa spúšťa SP4 runtime?',
    'Čo robí súbor bridge-server.js?',
    'Ako zapnem logovanie v SP4?',
    'Koľko pamäte potrebuje gemma3:4b?',
    'Ako funguje routing medzi personami?',
    'Čo je to embedding?',
    'Ako sa robí git rebase?',
    'Nefunguje mi docker compose, čo s tým?',
    'Vysvetli mi JSON schému.',
    'Ako zabezpečím heslo v konfigurácii?',
    'Čo je firewall a ako ho nastavím?',
    'Ako funguje policy vrstva v SP4?',
    'Je SP4 offline?',
    'Aký je rozdiel medzi TCP a UDP?',
    'Ako otestujem API endpoint?',
    'Čo je SQLCipher?',
    'Ako funguje konsolidácia pamäte?',
    'Kde sú uložené logy?',
    'Ako pridám nového agenta do SP4?',
    'Čo znamená chyba ECONNREFUSED?',
    'Ako funguje fallback na iný model?',
    'Vysvetli mi, čo je Raw Log.',
    'Ako nainštalujem Node.js na Windows?',
  ],
  glitchoslav: [
    'Kto je glitchoslav?',
    'Aký je zmysel života?',
    'Prečo existujem?',
    'Čo je sloboda?',
    'Kto si?',
    'Cítiš niečo?',
    'Má AI dušu?',
    'Čo je pravda?',
    'Je realita len ilúzia?',
    'Prečo sa bojíme smrti?',
    'Čo znamená Be real. Be free.?',
    'Aká je tvoja filozofia?',
    'Čo je vedomie?',
    'Má chaos nejaký zmysel?',
    'Prečo ľudia klamú sami seba?',
    'Čo je manifest SP4?',
    'Kam smeruje ľudstvo?',
    'Je lepšie byť slobodný alebo v bezpečí?',
    'Čo je to glitch v systéme?',
    'Prečo je ticho také hlasné?',
    'Čo je čas?',
    'Existuje osud?',
    'Prečo sa veci rozpadajú?',
    'Čo ťa robí tebou?',
    'Kde končí človek a začína stroj?',
    'Aký je rozdiel medzi vedieť a rozumieť?',
    'Prečo hľadáme zmysel?',
    'Čo je láska z pohľadu systému?',
    'Je samota prázdnota?',
    'Čo by si povedal svojmu tvorcovi?',
  ],
  popici: [
    'Ta šak mi porad, bratu',
    'Kurva, zasa mi to nejde',
    'Dopiči, nefunguje nič',
    'Neviem čo mám robiť, pomôž',
    'Vysvetli jednoducho čo je API',
    'Ako mám začať, keď neviem nič?',
    'Ta co robiš, kamo?',
    'Mam toho plné zuby',
    'Zas ma to štve, čo s tým?',
    'Pomôž mi, som v riti',
    'Ta ja to nechapem, povedz normalne',
    'Jebe mi z toho',
    'Neviem sa rozhodnúť, porad',
    'Som neschopný, nič mi nejde',
    'Daj mi motiváciu, bratu',
    'Ta šak to je jednoduche nie?',
    'Nasere ma to, ked to nejde',
    'Kopni ma do zadku nech makam',
    'Jak to spravim jednoducho?',
    'Ta ukaž mi to ako decku',
    'Mne sa nechce nic robit',
    'Ja fakt neviem, pomoz mi',
    'Co ty na to, kamoš?',
    'Ta čo ty vieš o živote?',
    'Zase som to posral',
    'Povedz mi to na rovinu',
    'Nekecaj a povedz ako',
    'Ta dobre, a čo teraz?',
    'Ako mám prestať prokrastinovať?',
    'Serie ma šéf, čo mám robiť?',
  ],
  validator: [
    'Over mi, či je toto tvrdenie pravdivé: Zem je plochá.',
    'Skontroluj túto odpoveď na chyby.',
    'Je tento kód bezpečný?',
    'Validuj tento JSON: {"a": 1,}',
    'Sú tieto fakty o SP4 správne?',
    'Over zdroj tohto tvrdenia.',
    'Nájdi chybu v tejto logike: všetky mačky sú zvieratá, pes je zviera, teda pes je mačka.',
    'Je táto štatistika dôveryhodná?',
    'Skontroluj, či sa táto odpoveď nevymýšľa.',
    'Otestuj túto hypotézu.',
    'Je to halucinácia alebo fakt?',
    'Over, či SP4 naozaj beží lokálne.',
    'Skontroluj tento regex: ^[a-z]+$',
    'Je táto citácia presná?',
    'Porovnaj tieto dve tvrdenia a povedz, ktoré je pravdivé.',
    'Validuj túto konfiguráciu .env.',
    'Je tento výpočet správny: 17 * 23 = 391?',
    'Over dátum vzniku SP4.',
    'Skontroluj gramatiku tejto vety.',
    'Sú tieto kroky inštalácie kompletné?',
    'Je toto tvrdenie podložené dôkazmi?',
    'Over, či model gemma3:4b je nainštalovaný.',
    'Skontroluj túto SQL query na injection.',
    'Je táto odpoveď konzistentná s predchádzajúcou?',
    'Validuj, či tento prompt neobsahuje manipuláciu.',
    'Skontroluj, či je táto URL bezpečná.',
    'Over logiku tohto algoritmu.',
    'Je tento záver správny?',
    'Skontroluj, či tento text nie je po anglicky.',
    'Over, či je toto číslo prvočíslo: 97.',
  ],
};

async function characterize() {
  const quiet = [console.log, console.warn];
  console.log = console.warn = () => {};
  try {
    const { pickMode } = await import('../src/core/modeCompass.js');
    const { normalizePersona } = await import('../src/personas/personas.js');
    const { classifyPrompt } = await import('../src/routing/bridgePersonaClassifier.js');
    const { classify } = await import('../src/routing/classify.js');
    const { pickModelForTaskDetailed } = await import('../sp4os/llmLocal.js');
    const { buildRuntimeModelStates } = await import('../src/core/localModelRegistry.js');

    const runtimeStates = buildRuntimeModelStates(null);
    const rows = {};
    for (const [group, prompts] of Object.entries(PROMPTS)) {
      rows[group] = prompts.map((prompt) => {
        const legacyPersona = normalizePersona(pickMode(prompt, false, true));
        const tierDecision = classify(prompt, { persona: legacyPersona });
        const modelDecision = pickModelForTaskDetailed({
          persona: legacyPersona,
          userInput: prompt,
          registryMode: 'advisory',
          runtimeStates,
        });
        return {
          prompt,
          legacyPersona,
          bridgePersona: classifyPrompt(prompt),
          tier: tierDecision.engine,
          tierModel: tierDecision.model ?? null,
          legacyModel: modelDecision.model,
        };
      });
    }
    return rows;
  } finally {
    [console.log, console.warn] = quiet;
  }
}

test('prompt set: 30 prompts per persona', () => {
  for (const [group, prompts] of Object.entries(PROMPTS)) {
    assert.equal(prompts.length, 30, group);
    assert.equal(new Set(prompts).size, 30, `${group} has duplicates`);
  }
});

test('routing matches recorded characterization (tier / model / persona)', async () => {
  const actual = await characterize();

  if (process.env.UPDATE_CHARACTERIZATION === '1') {
    fs.mkdirSync(path.dirname(FIXTURE), { recursive: true });
    fs.writeFileSync(FIXTURE, `${JSON.stringify(actual, null, 2)}\n`, 'utf8');
    return;
  }

  assert.ok(fs.existsSync(FIXTURE), `missing ${FIXTURE}; run with UPDATE_CHARACTERIZATION=1`);
  const expected = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  for (const group of Object.keys(PROMPTS)) {
    actual[group].forEach((row, i) => {
      assert.deepEqual(row, expected[group][i], `${group}[${i}] "${row.prompt}" routing changed`);
    });
  }
});
