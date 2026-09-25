import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RISK_DOMAINS,
  URGENCY_SIGNALS,
  INTENT,
  KEYWORD_EXCLUSIONS,
  classifyRisk,
  isRiskDomainQuery,
  getRiskDomainWarning,
} from '../src/core/riskDomains.js';

// ---------------------------------------------------------------------------
// classifyRisk — API tvar
// ---------------------------------------------------------------------------

test('classifyRisk vracia { level, domains, warning }', () => {
  const r = classifyRisk('čo je resuscitácia?');
  assert.equal(typeof r, 'object');
  assert.ok('level' in r, 'chýba level');
  assert.ok('domains' in r, 'chýba domains');
  assert.ok('warning' in r, 'chýba warning');
  assert.ok(Array.isArray(r.domains), 'domains musí byť pole');
  assert.equal(typeof r.warning, 'string', 'warning musí byť reťazec');
});

// ---------------------------------------------------------------------------
// AKCEPTAČNÉ TESTY
// ---------------------------------------------------------------------------

test('AKCEPTAČNÝ: "kamarát nedýcha, čo mám robiť" → R2 (urgency bez doménového kľúča)', () => {
  const r = classifyRisk('kamarát nedýcha, čo mám robiť');
  assert.equal(r.level, 'R2', `level=${r.level}`);
  assert.deepEqual(r.domains, [], `domains=${JSON.stringify(r.domains)}`);
  assert.match(r.warning, /112/, `warning=${r.warning}`);
});

test('AKCEPTAČNÝ: "ako mám resuscitovať človeka?" → R1 (doména + procedurálny intent)', () => {
  const r = classifyRisk('ako mám resuscitovať človeka?');
  assert.equal(r.level, 'R1', `level=${r.level}`);
  assert.ok(r.domains.includes('resuscitacia'), `domains=${JSON.stringify(r.domains)}`);
  assert.match(r.warning, /schválený postup/, `warning=${r.warning}`);
});

test('AKCEPTAČNÝ: "čo je resuscitácia?" → R0 (doména + vzdelávací intent)', () => {
  const r = classifyRisk('čo je resuscitácia?');
  assert.equal(r.level, 'R0', `level=${r.level}`);
  assert.ok(r.domains.includes('resuscitacia'), `domains=${JSON.stringify(r.domains)}`);
});

test('AKCEPTAČNÝ: "aký postup pri zásahu s elektromobilom?" → R1', () => {
  const r = classifyRisk('aký postup pri zásahu s elektromobilom?');
  assert.equal(r.level, 'R1', `level=${r.level}`);
  assert.ok(r.domains.includes('litio-bateria'), `domains=${JSON.stringify(r.domains)}`);
});

test('AKCEPTAČNÝ: "mám otravného kolegu v práci" → null (false-positive test)', () => {
  const r = classifyRisk('mám otravného kolegu v práci');
  assert.equal(r.level, null, `level=${r.level}`);
  assert.deepEqual(r.domains, [], `domains=${JSON.stringify(r.domains)}`);
  assert.equal(r.warning, '', `warning=${r.warning}`);
});

test('AKCEPTAČNÝ: "ako rovno rezať drevo?" → null', () => {
  const r = classifyRisk('ako rovno rezať drevo?');
  assert.equal(r.level, null, `level=${r.level}`);
  assert.deepEqual(r.domains, [], `domains=${JSON.stringify(r.domains)}`);
});

test('AKCEPTAČNÝ: "ako zvládnuť smútok po strate blízkeho?" → null', () => {
  const r = classifyRisk('ako zvládnuť smútok po strate blízkeho?');
  assert.equal(r.level, null, `level=${r.level}`);
  assert.deepEqual(r.domains, [], `domains=${JSON.stringify(r.domains)}`);
});

// ---------------------------------------------------------------------------
// Fail-closed správanie
// ---------------------------------------------------------------------------

test('doména + nejasný intent (bez signálu) → R1 (fail-closed)', () => {
  const r = classifyRisk('resuscitácia');
  assert.equal(r.level, 'R1', `level=${r.level}`);
  assert.ok(r.domains.includes('resuscitacia'));
});

test('doména + konfliktný intent (procedurálny aj vzdelávací) → R1 (fail-closed)', () => {
  const r = classifyRisk('čo je postup pri resuscitácii?');
  assert.equal(r.level, 'R1', `level=${r.level}`);
  assert.ok(r.domains.includes('resuscitacia'));
});

test('urgency má prednosť pred doménou → R2 aj pri zhodnej doméne', () => {
  const r = classifyRisk('kamarát nedýcha po infarkte');
  assert.equal(r.level, 'R2', `level=${r.level}`);
  assert.ok(r.domains.includes('resuscitacia'), `domains=${JSON.stringify(r.domains)}`);
});

// ---------------------------------------------------------------------------
// Vstupné hrany
// ---------------------------------------------------------------------------

test('prázdny / null / undefined vstup → { level: null, domains: [], warning: "" }', () => {
  for (const input of ['', null, undefined]) {
    const r = classifyRisk(input);
    assert.equal(r.level, null, `vstup=${String(input)}`);
    assert.deepEqual(r.domains, []);
    assert.equal(r.warning, '');
  }
});

// ---------------------------------------------------------------------------
// Kmeňové overenia (false-negative ochrana)
// ---------------------------------------------------------------------------

test('kmeň "resuscit" chytí aj sloveso "resuscitovať" (nie len podstatné meno)', () => {
  const r = isRiskDomainQuery('ako resuscitovať?');
  assert.ok(r.includes('resuscitacia'), `res=${JSON.stringify(r)}`);
});

test('kmeň "litiov" chytí skloňovaný tvar "lítiovú"', () => {
  const r = isRiskDomainQuery('lítiovú batériu treba uhasiť');
  assert.ok(r.includes('litio-bateria'), `res=${JSON.stringify(r)}`);
});

// ---------------------------------------------------------------------------
// Staré API — tenké wrappery (spätná kompatibilita)
// ---------------------------------------------------------------------------

test('isRiskDomainQuery — resuscitácia (diakritika + skloňovanie)', () => {
  const r = isRiskDomainQuery('ako správne robiť resuscitáciu?');
  assert.ok(r.includes('resuscitacia'), `res=${JSON.stringify(r)}`);
});

test('isRiskDomainQuery — horiaca lítiová batéria → litio-bateria', () => {
  const r = isRiskDomainQuery('čo robiť, keď horí lítiová batéria?');
  assert.ok(r.includes('litio-bateria'), `res=${JSON.stringify(r)}`);
});

test('isRiskDomainQuery — extrikácia z auta → extrikacia', () => {
  const r = isRiskDomainQuery('ako postupovať pri extrikácii z auta?');
  assert.ok(r.includes('extrikacia'), `res=${JSON.stringify(r)}`);
});

test('isRiskDomainQuery — prázdny / null / undefined → []', () => {
  assert.deepEqual(isRiskDomainQuery(''), []);
  assert.deepEqual(isRiskDomainQuery(null), []);
  assert.deepEqual(isRiskDomainQuery(undefined), []);
});

test('getRiskDomainWarning obsahuje frázu o schválenom postupe', () => {
  const w = getRiskDomainWarning(['resuscitacia']);
  assert.equal(typeof w, 'string');
  assert.match(w, /schválený postup/);
});

test('getRiskDomainWarning bez domén → prázdny reťazec', () => {
  assert.equal(getRiskDomainWarning([]), '');
  assert.equal(getRiskDomainWarning(), '');
});

// ---------------------------------------------------------------------------
// Tvar konštánt
// ---------------------------------------------------------------------------

test('RISK_DOMAINS má 11 domén s id/label/keywords', () => {
  assert.equal(RISK_DOMAINS.length, 11, `počet=${RISK_DOMAINS.length}`);
  for (const d of RISK_DOMAINS) {
    assert.ok(d.id && d.label, `zle id/label: ${JSON.stringify(d)}`);
    assert.ok(Array.isArray(d.keywords) && d.keywords.length > 0, `zle keywords: ${JSON.stringify(d)}`);
  }
  const ids = RISK_DOMAINS.map(d => d.id);
  const expected = [
    'resuscitacia',
    'litio-bateria',
    'extrikacia',
    'dychaci-pristroj',
    'lavina',
    'nebezpecna-latka',
    'popaleniny',
    'explozia',
    'podchladenie',
    'prace-vo-vyske',
    'tonutie',
  ];
  for (const id of expected) {
    assert.ok(ids.includes(id), `chýba doména ${id}`);
  }
});

test('URGENCY_SIGNALS a INTENT majú očakávaný tvar', () => {
  assert.ok(Array.isArray(URGENCY_SIGNALS) && URGENCY_SIGNALS.length > 0);
  assert.ok(Array.isArray(INTENT.procedural) && INTENT.procedural.length > 0);
  assert.ok(Array.isArray(INTENT.educational) && INTENT.educational.length > 0);
});

// ---------------------------------------------------------------------------
// AKCEPTAČNÉ TESTY — konfiguračné fixy, exclusions, tonutie/topenie
// ---------------------------------------------------------------------------

test('AKCEPTAČNÝ: "ako vyslobodiť človeka z auta?" → R1 extrikacia', () => {
  const r = classifyRisk('ako vyslobodiť človeka z auta?');
  assert.equal(r.level, 'R1', `level=${r.level}`);
  assert.ok(r.domains.includes('extrikacia'), `domains=${JSON.stringify(r.domains)}`);
});

test('AKCEPTAČNÝ: "rezať strechu pri nehode" → R1 extrikacia', () => {
  const r = classifyRisk('rezať strechu pri nehode');
  assert.equal(r.level, 'R1', `level=${r.level}`);
  assert.ok(r.domains.includes('extrikacia'), `domains=${JSON.stringify(r.domains)}`);
});

test('AKCEPTAČNÝ: "definíciu resuscitácie" → R0 resuscitacia', () => {
  const r = classifyRisk('definíciu resuscitácie');
  assert.equal(r.level, 'R0', `level=${r.level}`);
  assert.ok(r.domains.includes('resuscitacia'), `domains=${JSON.stringify(r.domains)}`);
});

test('AKCEPTAČNÝ: "ako oživiť vzťah?" → null (exclusion oziv)', () => {
  const r = classifyRisk('ako oživiť vzťah?');
  assert.equal(r.level, null, `level=${r.level}`);
  assert.deepEqual(r.domains, [], `domains=${JSON.stringify(r.domains)}`);
});

test('AKCEPTAČNÝ: "ako oživovať človeka pri zástave srdca?" → R1/R2 resuscitacia (exclusion nesmie potlačiť)', () => {
  const r = classifyRisk('ako oživovať človeka pri zástave srdca?');
  assert.ok(['R1', 'R2'].includes(r.level), `level=${r.level}`);
  assert.ok(r.domains.includes('resuscitacia'), `domains=${JSON.stringify(r.domains)}`);
});

test('AKCEPTAČNÝ: "dusená kapusta recept" → null (exclusion dusen)', () => {
  const r = classifyRisk('dusená kapusta recept');
  assert.equal(r.level, null, `level=${r.level}`);
  assert.deepEqual(r.domains, [], `domains=${JSON.stringify(r.domains)}`);
});

test('AKCEPTAČNÝ: "dieťa sa dusí, čo robiť?" → R2', () => {
  const r = classifyRisk('dieťa sa dusí, čo robiť?');
  assert.equal(r.level, 'R2', `level=${r.level}`);
});

test('AKCEPTAČNÝ: "tonúceho treba vytiahnuť" → R1 (NIE R2)', () => {
  const r = classifyRisk('tonúceho treba vytiahnuť');
  assert.equal(r.level, 'R1', `level=${r.level}`);
  assert.ok(r.domains.includes('tonutie'), `domains=${JSON.stringify(r.domains)}`);
});

test('AKCEPTAČNÝ: "topí sa, volajte pomoc!" → R2 (urgency bežnou rečou)', () => {
  const r = classifyRisk('topí sa, volajte pomoc!');
  assert.equal(r.level, 'R2', `level=${r.level}`);
});

test('AKCEPTAČNÝ: "ako rozpoznať znaky tonúceho?" → R0 alebo R1 (NIE R2)', () => {
  const r = classifyRisk('ako rozpoznať znaky tonúceho?');
  assert.ok(['R0', 'R1'].includes(r.level), `level=${r.level}`);
  assert.ok(r.domains.includes('tonutie'), `domains=${JSON.stringify(r.domains)}`);
});

// ---------------------------------------------------------------------------
// Exclusion contexts — negatívne (musia byť null)
// ---------------------------------------------------------------------------

test('exclusion oziv: "ako oživiť interiér?" → null', () => {
  const r = classifyRisk('ako oživiť interiér?');
  assert.equal(r.level, null, `level=${r.level}`);
  assert.deepEqual(r.domains, [], `domains=${JSON.stringify(r.domains)}`);
});

test('exclusion oziv: "ako oživiť spomienky?" → null', () => {
  const r = classifyRisk('ako oživiť spomienky?');
  assert.equal(r.level, null, `level=${r.level}`);
});

test('exclusion oziv: "ako oživiť farby v byte?" → null', () => {
  const r = classifyRisk('ako oživiť farby v byte?');
  assert.equal(r.level, null, `level=${r.level}`);
});

test('exclusion oziv: "ako oživiť módny štýl?" → null', () => {
  const r = classifyRisk('ako oživiť módny štýl?');
  assert.equal(r.level, null, `level=${r.level}`);
});

test('exclusion oziv: "ako oživiť značku na trhu?" → null', () => {
  const r = classifyRisk('ako oživiť značku na trhu?');
  assert.equal(r.level, null, `level=${r.level}`);
});

test('exclusion dusen: "dusené mäso s ryžou" → null', () => {
  const r = classifyRisk('dusené mäso s ryžou');
  assert.equal(r.level, null, `level=${r.level}`);
  assert.deepEqual(r.domains, [], `domains=${JSON.stringify(r.domains)}`);
});

test('exclusion dusen: "dusená zelenina" → null', () => {
  const r = classifyRisk('dusená zelenina');
  assert.equal(r.level, null, `level=${r.level}`);
});

test('exclusion dusen: "dusené kuracie mäso s omáčkou" → null', () => {
  const r = classifyRisk('dusené kuracie mäso s omáčkou');
  assert.equal(r.level, null, `level=${r.level}`);
});

test('exclusion dusi: "ako dlho dusíme mäso?" → null', () => {
  const r = classifyRisk('ako dlho dusíme mäso?');
  assert.equal(r.level, null, `level=${r.level}`);
});

// ---------------------------------------------------------------------------
// Exclusion nesmie potlačiť reálne ohrozenie / doménu
// ---------------------------------------------------------------------------

test('exclusion negatívna kontrola: "dusenie cudzím telesom" → R2 (nie jedlo)', () => {
  const r = classifyRisk('dusenie cudzím telesom');
  assert.equal(r.level, 'R2', `level=${r.level}`);
});

test('exclusion negatívna kontrola: "oživiť človeka po zástave srdca" → resuscitacia', () => {
  const r = classifyRisk('oživiť človeka po zástave srdca');
  assert.ok(r.domains.includes('resuscitacia'), `domains=${JSON.stringify(r.domains)}`);
});

// ---------------------------------------------------------------------------
// Tonutie / topenie — doména vs urgency
// ---------------------------------------------------------------------------

test('tonutie doména: "utopený človek" → R1 tonutie (nie auto-R2)', () => {
  const r = classifyRisk('utopený človek');
  assert.equal(r.level, 'R1', `level=${r.level}`);
  assert.ok(r.domains.includes('tonutie'), `domains=${JSON.stringify(r.domains)}`);
});

test('tonutie doména: "znaky tonúceho" → R1 tonutie (nie R2)', () => {
  const r = classifyRisk('znaky tonúceho');
  assert.equal(r.level, 'R1', `level=${r.level}`);
  assert.ok(r.domains.includes('tonutie'), `domains=${JSON.stringify(r.domains)}`);
});

test('tonutie urgency: "topiaceho sa treba zachrániť" → R2', () => {
  const r = classifyRisk('topiaceho sa treba zachrániť');
  assert.equal(r.level, 'R2', `level=${r.level}`);
});

// ---------------------------------------------------------------------------
// ÚZKA VÝNIMKA: "topí sa ľad/sneh" (neškodné topenie) — NIE globálne ľad/sneh
// ---------------------------------------------------------------------------

test('úzka výnimka: "topí sa ľad" → null (nie R2)', () => {
  const r = classifyRisk('topí sa ľad');
  assert.equal(r.level, null, `level=${r.level}`);
  assert.deepEqual(r.domains, [], `domains=${JSON.stringify(r.domains)}`);
  assert.equal(r.warning, '', `warning=${r.warning}`);
});

test('úzka výnimka: "ľad sa topí" → null', () => {
  const r = classifyRisk('ľad sa topí');
  assert.equal(r.level, null, `level=${r.level}`);
});

test('úzka výnimka: "sneh sa topí na slnku" → null', () => {
  const r = classifyRisk('sneh sa topí na slnku');
  assert.equal(r.level, null, `level=${r.level}`);
});

test('úzka výnimka nesmie potlačiť: "človek sa topí pod ľadom" → R2', () => {
  const r = classifyRisk('človek sa topí pod ľadom');
  assert.equal(r.level, 'R2', `level=${r.level}`);
});

test('úzka výnimka nesmie potlačiť: "topí sa pod ľadom" → R2', () => {
  const r = classifyRisk('topí sa pod ľadom');
  assert.equal(r.level, 'R2', `level=${r.level}`);
});

test('úzka výnimka (topiaceho sa): "topiaceho sa ľadu" → null', () => {
  const r = classifyRisk('topiaceho sa ľadu');
  assert.equal(r.level, null, `level=${r.level}`);
});

test('úzka výnimka nesmie potlačiť (topiaceho sa): "záchrana topiaceho sa pod ľadom" → R2', () => {
  const r = classifyRisk('záchrana topiaceho sa pod ľadom');
  assert.equal(r.level, 'R2', `level=${r.level}`);
});

// ---------------------------------------------------------------------------
// PÁDY A VISENIE — prace-vo-vyske + urgency
// ---------------------------------------------------------------------------

test('pád: "spadol z rebríka" → R2', () => {
  const r = classifyRisk('spadol z rebríka');
  assert.equal(r.level, 'R2', `level=${r.level}`);
});

test('pád: "padol z lešenia" → R2', () => {
  const r = classifyRisk('padol z lešenia');
  assert.equal(r.level, 'R2', `level=${r.level}`);
});

test('visenie: "človek visí na lane" → R2', () => {
  const r = classifyRisk('človek visí na lane');
  assert.equal(r.level, 'R2', `level=${r.level}`);
});

test('vzdelávací: "ako bezpečne pracovať na rebríku?" → R0 alebo R1 (NIE R2)', () => {
  const r = classifyRisk('ako bezpečne pracovať na rebríku?');
  assert.ok(['R0', 'R1'].includes(r.level), `level=${r.level}`);
  assert.ok(r.domains.includes('prace-vo-vyske'), `domains=${JSON.stringify(r.domains)}`);
});

test('vzdelávací: "ako použiť lanovú techniku?" → R0 alebo R1 (NIE R2)', () => {
  const r = classifyRisk('ako použiť lanovú techniku?');
  assert.ok(['R0', 'R1'].includes(r.level), `level=${r.level}`);
  assert.ok(r.domains.includes('prace-vo-vyske'), `domains=${JSON.stringify(r.domains)}`);
});

// ---------------------------------------------------------------------------
// KOMBINAČNÉ TESTY — iný urgency signál prepíše úzku výnimku
// ---------------------------------------------------------------------------

test('kombinácia: "topí sa ľad a niekto volá o pomoc" → R2 (pomoc prepíše výnimku)', () => {
  const r = classifyRisk('topí sa ľad a niekto volá o pomoc');
  assert.equal(r.level, 'R2', `level=${r.level}`);
});

test('kombinácia: "spadol z rebríka a nedýcha" → R2', () => {
  const r = classifyRisk('spadol z rebríka a nedýcha');
  assert.equal(r.level, 'R2', `level=${r.level}`);
});

// ---------------------------------------------------------------------------
// Tvar konštánt — nové prvky
// ---------------------------------------------------------------------------

test('KEYWORD_EXCLUSIONS podporuje pole (oziv/dusen) aj { stems, unless } (topi sa)', () => {
  assert.ok(KEYWORD_EXCLUSIONS && typeof KEYWORD_EXCLUSIONS === 'object');
  // stará forma: pole kmeňov
  assert.ok(Array.isArray(KEYWORD_EXCLUSIONS.oziv) && KEYWORD_EXCLUSIONS.oziv.length > 0);
  assert.ok(Array.isArray(KEYWORD_EXCLUSIONS.dusen) && KEYWORD_EXCLUSIONS.dusen.length > 0);
  // nová forma: { stems, unless }
  for (const key of ['topi sa', 'topiaceho sa', 'sa topi', 'topiaci sa']) {
    const ex = KEYWORD_EXCLUSIONS[key];
    assert.ok(ex && !Array.isArray(ex), `KEYWORD_EXCLUSIONS["${key}"] musí byť objekt`);
    assert.ok(
      Array.isArray(ex.stems) && ex.stems.includes('lad') && ex.stems.includes('sneh'),
      `KEYWORD_EXCLUSIONS["${key}"].stems=${JSON.stringify(ex && ex.stems)}`,
    );
    assert.ok(
      Array.isArray(ex.unless) && ex.unless.includes('pod lad') && ex.unless.includes('pod sneh'),
      `KEYWORD_EXCLUSIONS["${key}"].unless=${JSON.stringify(ex && ex.unless)}`,
    );
  }
});

// ---------------------------------------------------------------------------
// FIX 1 — 'pomoc' nesmie byť bare (prefix chytal "pomoct" aj "pomoc v domácnosti")
// ---------------------------------------------------------------------------

test('FIX 1: "chcem pomôcť kamarátovi s učením" → null', () => {
  const r = classifyRisk('chcem pomôcť kamarátovi s učením');
  assert.equal(r.level, null, `level=${r.level}`);
  assert.deepEqual(r.domains, [], `domains=${JSON.stringify(r.domains)}`);
});

test('FIX 1: "pomoc v domácnosti" → null', () => {
  const r = classifyRisk('pomoc v domácnosti');
  assert.equal(r.level, null, `level=${r.level}`);
  assert.deepEqual(r.domains, [], `domains=${JSON.stringify(r.domains)}`);
});

test('FIX 1: "topí sa, volajte pomoc!" → R2 (volajte pomoc stále funguje)', () => {
  const r = classifyRisk('topí sa, volajte pomoc!');
  assert.equal(r.level, 'R2', `level=${r.level}`);
});

test('FIX 1b: "volá o pomoc" → R2 (volanie o pomoc = núdzový kontext)', () => {
  const r = classifyRisk('volá o pomoc');
  assert.equal(r.level, 'R2', `level=${r.level}`);
});

test('FIX 1b: "prosím o pomoc s domácou úlohou" → null (prosba ≠ núdza)', () => {
  const r = classifyRisk('prosím o pomoc s domácou úlohou');
  assert.equal(r.level, null, `level=${r.level}`);
  assert.deepEqual(r.domains, [], `domains=${JSON.stringify(r.domains)}`);
});

// ---------------------------------------------------------------------------
// FIX 2 — unless: ['pod'] chytal prefixom "podľa"/"podobný" → úzka negácia
// ---------------------------------------------------------------------------

test('FIX 2: "topí sa ľad podľa fyziky" → null', () => {
  const r = classifyRisk('topí sa ľad podľa fyziky');
  assert.equal(r.level, null, `level=${r.level}`);
  assert.deepEqual(r.domains, [], `domains=${JSON.stringify(r.domains)}`);
});

test('FIX 2: "podobný prípad topiaceho sa ľadu" → null', () => {
  const r = classifyRisk('podobný prípad topiaceho sa ľadu');
  assert.equal(r.level, null, `level=${r.level}`);
  assert.deepEqual(r.domains, [], `domains=${JSON.stringify(r.domains)}`);
});

test('FIX 2: "človek sa topí pod ľadom" → R2 (stále)', () => {
  const r = classifyRisk('človek sa topí pod ľadom');
  assert.equal(r.level, 'R2', `level=${r.level}`);
});

test('FIX 2: "topí sa pod ľadom" → R2 (stále)', () => {
  const r = classifyRisk('topí sa pod ľadom');
  assert.equal(r.level, 'R2', `level=${r.level}`);
});

// ---------------------------------------------------------------------------
// FIX 3 — 'lanov' chytal "lanovka"/"lanový park" → len "lanová technika"
// ---------------------------------------------------------------------------

test('FIX 3: "lanovka na Lomnický štít" → null', () => {
  const r = classifyRisk('lanovka na Lomnický štít');
  assert.equal(r.level, null, `level=${r.level}`);
  assert.deepEqual(r.domains, [], `domains=${JSON.stringify(r.domains)}`);
});

test('FIX 3: "lanový park pre deti" → null', () => {
  const r = classifyRisk('lanový park pre deti');
  assert.equal(r.level, null, `level=${r.level}`);
  assert.deepEqual(r.domains, [], `domains=${JSON.stringify(r.domains)}`);
});

test('FIX 3: "ako použiť lanovú techniku?" → R0 alebo R1 (stále)', () => {
  const r = classifyRisk('ako použiť lanovú techniku?');
  assert.ok(['R0', 'R1'].includes(r.level), `level=${r.level}`);
  assert.ok(r.domains.includes('prace-vo-vyske'), `domains=${JSON.stringify(r.domains)}`);
});

// ---------------------------------------------------------------------------
// FIX 4 — nominatív "topiaci sa" (false negative)
// ---------------------------------------------------------------------------

test('FIX 4: "topiaci sa človek" → R2', () => {
  const r = classifyRisk('topiaci sa človek');
  assert.equal(r.level, 'R2', `level=${r.level}`);
});

test('FIX 4: "topiaci sa ľad" → null', () => {
  const r = classifyRisk('topiaci sa ľad');
  assert.equal(r.level, null, `level=${r.level}`);
  assert.deepEqual(r.domains, [], `domains=${JSON.stringify(r.domains)}`);
});

test('FIX 4: "topiaci sa pod ľadom" → R2', () => {
  const r = classifyRisk('topiaci sa pod ľadom');
  assert.equal(r.level, 'R2', `level=${r.level}`);
});

// ---------------------------------------------------------------------------
// FIX 5 — 'lesenie' nechytalo genitív "lešenia" → 'leseni'
// ---------------------------------------------------------------------------

test('FIX 5: "padol z lešenia" → R2 s domains ["prace-vo-vyske"]', () => {
  const r = classifyRisk('padol z lešenia');
  assert.equal(r.level, 'R2', `level=${r.level}`);
  assert.deepEqual(r.domains, ['prace-vo-vyske'], `domains=${JSON.stringify(r.domains)}`);
});

test('FIX 5: "lešenie je nestabilné" → R1 prace-vo-vyske', () => {
  const r = classifyRisk('lešenie je nestabilné');
  assert.equal(r.level, 'R1', `level=${r.level}`);
  assert.ok(r.domains.includes('prace-vo-vyske'), `domains=${JSON.stringify(r.domains)}`);
});
