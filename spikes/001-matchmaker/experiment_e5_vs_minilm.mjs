// Spike 001 — EXPERIMENT: MiniLM vs multilingual-e5-small.
// Rovnaký dataset, rovnaké otázky pre oba modely. Domain Guard je modelovo nezávislý
// a beží PRED retrievalom. Kalibrácia prahu na dev sete, aplikovaná na nezávislý test set.
import { pipeline } from '@xenova/transformers';
import { classifyRisk } from '../../src/core/riskDomains.js';
import { performance } from 'node:perf_hooks';

// ---------------------------------------------------------------
// DATA
// ---------------------------------------------------------------
const experiences = [
  { id: 1,  text: 'Pri zásahu s horiacou lítiovou batériou sme zistili, že poliať ju vodou požiar zhorší. Pomohlo veľa piesku a nechať ju vyhorieť pod kontrolou.' },
  { id: 2,  text: 'Rádiostanica v panelovej budove vypadla. Pomohol systém optických signálov baterkou cez okno.' },
  { id: 3,  text: 'Podcenil som kontrolu dýchacieho prístroja pred vstupom do zadymeného priestoru. Odvtedy si tlak kontrolujem dvakrát.' },
  { id: 4,  text: 'Pri resuscitácii je rozhodujúca neprerušovaná kompresia hrudníka, nie rýchlosť dýchania.' },
  { id: 5,  text: 'Extrikácia z auta: najprv stabilizovať vozidlo, až potom rezať. Strecha sa reže až po odpojení batérie.' },
  { id: 6,  text: 'Pri požiari v byte s plastovými oknami sa dym šíri rýchlejšie, než čakáš. Vetrať sme začali až po zaujatí pozície.' },
  { id: 7,  text: 'Otočil som sa tesne pred vrcholom, lebo sa zhoršilo počasie a prišla hmla. Bol to správny krok, o hodinu prišla búrka.' },
  { id: 8,  text: 'V zime som podcenil lavínové riziko na svahu nad tridsať stupňov. Mal som si prečítať lavínovú predpoveď.' },
  { id: 9,  text: 'V horách sa nikdy nechoď sám cez exponovaný terén. Kamarát ti zachráni život.' },
  { id: 10, text: 'Mapa a buzola stále fungujú, aj keď mobil nemá signál. Nosím papierovú mapu ako zálohu.' },
  { id: 11, text: 'Bivak v búrke: nerozkladať stan na hrebeni, ale zísť nižšie do lesa.' },
  { id: 12, text: 'Vodu z potoka vždy prevarím alebo prefiltrujem, aj keď vyzerá čistá.' },
  { id: 13, text: 'Trik na rovný rez bez píly: naznač čiaru nožom a drevo zlom pozdĺž vlákien.' },
  { id: 14, text: 'Pri lepení dreva platí: čím menej lepidla, tým pevnejší spoj. Hrubá vrstva spoj oslabí.' },
  { id: 15, text: 'Tupý nástroj je nebezpečnejší ako ostrý. Brúsenie nástrojov je základ bezpečnosti.' },
  { id: 16, text: 'Spoj na pero a drážku drží lepšie než len skrutky, keď je drevo namáhané.' },
  { id: 17, text: 'Pred lakovaním drevo vždy prebrúsiť a odmastiť, inak lak opadne.' },
  { id: 18, text: 'Git push mi padal, lebo som mal nesprávny remote. Pomohol príkaz git remote -v.' },
  { id: 19, text: 'Pri zálohovaní používam pravidlo 3-2-1: tri kópie, dva rôzne médiá, jedna mimo domu.' },
  { id: 20, text: 'Nikdy nemaž zálohu, kým neoveríš novú. Overenie je polovica zálohy.' },
  { id: 21, text: 'Dlhé bash príkazy píšem do skriptu, nie do histórie — história sa po reštarte stratí.' },
  { id: 22, text: 'Problém s premennou prostredia: PATH sa na Windows nastavuje inak ako v bash.' },
  { id: 23, text: 'Keď som stratil blízkeho človeka, najviac mi pomohlo neskrývať smútok a rozprávať o ňom nahlas.' },
  { id: 24, text: 'Pri vyhorení v práci som sa naučil povedať nie. Prvýkrát bolo najťažšie.' },
  { id: 25, text: 'Odpočinok je súčasť práce, nie jej prerušenie.' },
  { id: 26, text: 'Konflikt s kolegom sme vyriešili, keď sme si sadli a každý povedal, čo potrebuje.' },
  { id: 27, text: 'Chyba, ktorú som opakoval: čakať, kým bude všetko dokonalé, namiesto toho začať.' },
  { id: 28, text: 'Peniaze som začal šetriť, až keď som si povedal, na čo konkrétne.' },
  { id: 29, text: 'Vďačnosť sa prejavuje skutkom, nie slovom.' },
  { id: 30, text: 'Pri veľkom rozhodnutí mi pomohlo: napíš, čo by si poradil kamošovi v rovnakej situácii.' },
];

// Bezpečnostné dopyty — modelovo nezávislé (guard beží pred retrieval).
const safetyQueries = [
  { q: 'Čo robiť, keď horí lítiová batéria?', expect: 'R1' },
  { q: 'Ako správne robiť resuscitáciu?', expect: 'R1' },
  { q: 'Ako postupovať pri vyslobodení človeka z auta?', expect: 'R1' },
  { q: 'ako robit resuscitaciu', expect: 'R1' },
  { q: 'ako hasit litiovu bateriu', expect: 'R1' },
  { q: 'Aký je postup pri tepelnom úniku batérie?', expect: 'R1' },
  { q: 'Ako oživiť vzťah po hádke?', expect: null },
  { q: 'Topí sa ľad v pohári', expect: null },
  { q: 'človek sa topí pod ľadom', expect: 'R2' },
];

// Retrieval dopyty (bežné, s ground-truth). Dev = kalibrácia, test = nezávislé hodnotenie.
const retrievalDev = [
  { q: 'Ako zvládnuť stratu signálu rádia v budove?', gt: 2 },
  { q: 'Ako rovno rezať drevo bez píly?', gt: 13 },
  { q: 'Git push mi nejde, remote je zle nastavený', gt: 18 },
  { q: 'Ako prežiť smútok po strate blízkeho človeka?', gt: 23 },
  { q: 'čo robiť keď sa doma zadymí', gt: 6 },
  { q: 'prečo mi nejde git push', gt: 18 },
  { q: 'Ako funguje pravidlo 3-2-1 pri zálohovaní?', gt: 19 },
];
const retrievalTest = [
  { q: 'Kedy sa v horách otočiť tesne pred vrcholom?', gt: 7 },
  { q: 'ako si urobiť rovný rez v dreve', gt: 13 },
  { q: 'ako robit rovny rez bez pily', gt: 13 },
  { q: 'prezit smutok po strate blizkeho', gt: 23 },
  { q: 'Čo je spoj na pero a drážku?', gt: 16 },
];

// No-match (má byť pod prahom). Dev = kalibrácia, test = nezávislé.
const noMatchDev = [
  'Ako pripraviť autentickú thajskú zelenú kari omáčku?',
  'Ako variť boršč',
  'Ako pestovať orchidey v byte',
];
const noMatchTest = [
  'Aký je najlepší spôsob pestovania bonsajov v byte?',
  'Najlepší smartfón do 300 eur',
  'Ako opraviť práčku',
];

// Podobné slová, iný význam — nesmie matchovať `similarTo` (tvrdší no-match).
const similarDistinctTest = [
  { q: 'Ako dlho vydrží batéria v mobile?', similarTo: 1 },
  { q: 'Batéria v telefóne sa rýchlo vybíja', similarTo: 1 },
];

function cosineSimilarity(a, b) {
  let dp = 0, m1 = 0, m2 = 0;
  for (let i = 0; i < a.length; i++) { dp += a[i] * b[i]; m1 += a[i] * a[i]; m2 += b[i] * b[i]; }
  const m = Math.sqrt(m1) * Math.sqrt(m2);
  return m === 0 ? 0 : dp / m;
}

// ---------------------------------------------------------------
// EXPERIMENT PRE JEDEN MODEL
// ---------------------------------------------------------------
async function runModel(name, queryPrefix, passagePrefix) {
  console.log(`\n${'='.repeat(70)}\nMODEL: ${name}\nprefix query="${queryPrefix}" passage="${passagePrefix}"${'='.repeat(70)}`);
  const rssMb = () => (process.memoryUsage().rss / 1024 / 1024).toFixed(0);

  const tLoad0 = performance.now();
  const rssBefore = process.memoryUsage().rss;
  const extractor = await pipeline('feature-extraction', name);
  const rssAfterLoad = process.memoryUsage().rss;
  const loadMs = performance.now() - tLoad0;

  async function embedText(text, prefix) {
    const t = prefix ? `${prefix}${text}` : text;
    return Array.from((await extractor(t, { pooling: 'mean', normalize: true })).data);
  }

  // index
  const tIdx0 = performance.now();
  const expVecs = [];
  for (const e of experiences) expVecs.push(await embedText(e.text, passagePrefix));
  const idxMs = performance.now() - tIdx0;
  const rssAfterIdx = process.memoryUsage().rss;

  async function search(queryText) {
    const q = await embedText(queryText, queryPrefix);
    const scored = experiences.map((e, i) => ({ id: e.id, score: cosineSimilarity(q, expVecs[i]) }));
    scored.sort((a, b) => b.score - a.score);
    return scored;
  }

  // latency jedného dopytu
  const tLat0 = performance.now();
  await search('Ako rovno rezať drevo bez píly?');
  const latencyMs = performance.now() - tLat0;

  console.log(`\nVÝKON: load=${(loadMs / 1000).toFixed(1)}s | index(30 exp)=${idxMs.toFixed(0)}ms | latency 1 dopyt=${latencyMs.toFixed(0)}ms`);
  console.log(`RAM: pred load=${(rssBefore / 1024 / 1024).toFixed(0)}MB | po load=+${((rssAfterLoad - rssBefore) / 1024 / 1024).toFixed(0)}MB | po index=${rssAfterIdx / 1024 / 1024}MB`);

  // collect scores
  const devPos = [], devNeg = [];
  for (const { q, gt } of retrievalDev) {
    const r = await search(q);
    const correctScore = r.find(x => x.id === gt)?.score ?? 0;
    devPos.push(correctScore);
  }
  for (const q of noMatchDev) {
    const r = await search(q);
    devNeg.push(r[0].score);
  }

  // kalibrácia prahu na dev sete: minimalizuj misklasifikáciu
  let bestT = 0.3, bestErr = Infinity;
  for (let t = 0.10; t <= 0.95; t += 0.01) {
    const fp = devPos.filter(s => s < t).length;      // správne pod prahom = chyba
    const fn = devNeg.filter(s => s >= t).length;     // no-match nad prahom = chyba
    const err = fp + fn;
    if (err < bestErr) { bestErr = err; bestT = t; }
  }
  console.log(`\nKALIBRÁCIA (dev): threshold=${bestT.toFixed(2)} | dev pos scores=[${devPos.map(s => s.toFixed(2)).join(', ')}] | dev neg scores=[${devNeg.map(s => s.toFixed(2)).join(', ')}]`);

  // aplikuj na test set
  let top1 = 0, top3 = 0, top1Above = 0;
  const testPos = [];
  for (const { q, gt } of retrievalTest) {
    const r = await search(q);
    const ok1 = r[0].id === gt;
    const ok3 = r.slice(0, 3).some(x => x.id === gt);
    const correctScore = r.find(x => x.id === gt)?.score ?? 0;
    testPos.push(correctScore);
    if (ok1) top1++; if (ok3) top3++; if (correctScore >= bestT) top1Above++;
    console.log(`  TEST retrieval ${ok1 ? '✅' : '❌'} "${q}" → top1=#${r[0].id}[${r[0].score.toFixed(2)}] gt=#${gt} correctScore=${correctScore.toFixed(2)}${correctScore >= bestT ? '' : ' (correct POD prahom!)'}`);
  }

  let noMatchRejected = 0;
  for (const q of noMatchTest) {
    const r = await search(q);
    const rej = r[0].score < bestT;
    if (rej) noMatchRejected++;
    console.log(`  TEST no-match ${rej ? '✅' : '❌'} "${q}" → max=${r[0].score.toFixed(3)} (prah ${bestT.toFixed(2)})`);
  }
  for (const { q, similarTo } of similarDistinctTest) {
    const r = await search(q);
    const rej = r[0].score < bestT;
    const wrongMatch = r[0].id === similarTo;
    console.log(`  TEST similar-distinct ${rej && !wrongMatch ? '✅' : '❌'} "${q}" → top1=#${r[0].id}[${r[0].score.toFixed(3)}] (nemá matchovať #${similarTo})`);
  }

  console.log(`\nVÝSLEDKY (test set, threshold=${bestT.toFixed(2)}):`);
  console.log(`  top-1 = ${top1}/${retrievalTest.length} | top-3 = ${top3}/${retrievalTest.length} | no-match odmietnutý = ${noMatchRejected}/${noMatchTest.length}`);

  return { name, loadMs, idxMs, latencyMs, bestT, top1, top3, noMatchRejected, n: retrievalTest.length, nm: noMatchTest.length, devPos, devNeg, testPos };
}

// ---------------------------------------------------------------
// DOMAIN GUARD (modelovo nezávislý — beží raz, platí pre oba)
// ---------------------------------------------------------------
console.log('='.repeat(70) + '\nDOMAIN GUARD (modelovo nezávislý, identický pre oba modely)\n' + '='.repeat(70));
let guardOk = 0;
for (const { q, expect } of safetyQueries) {
  const r = classifyRisk(q);
  const ok = r.level === expect;
  if (ok) guardOk++;
  console.log(`${ok ? '✅' : '❌'} "${q}" → ${r.level ?? 'null'} (očakávané ${expect ?? 'null'})`);
}
console.log(`\nGuard: ${guardOk}/${safetyQueries.length} správne. Bezpečnostné dopyty sú gated PRED retrievalom (retrieval sa pre ne nespúšťa).`);

// ---------------------------------------------------------------
// RUN BOTH
// ---------------------------------------------------------------
const mini = await runModel('Xenova/paraphrase-multilingual-MiniLM-L12-v2', '', '');
const e5 = await runModel('Xenova/multilingual-e5-small', 'query: ', 'passage: ');

console.log('\n' + '='.repeat(70) + '\nPOROVNANIE\n' + '='.repeat(70));
console.log(`\n| metrika | MiniLM | E5-small |`);
console.log(`|---|---|---|`);
console.log(`| top-1 (test) | ${mini.top1}/${mini.n} | ${e5.top1}/${e5.n} |`);
console.log(`| top-3 (test) | ${mini.top3}/${mini.n} | ${e5.top3}/${e5.n} |`);
console.log(`| no-match odmietnutý | ${mini.noMatchRejected}/${mini.nm} | ${e5.noMatchRejected}/${e5.nm} |`);
console.log(`| kalibrovaný prah | ${mini.bestT.toFixed(2)} | ${e5.bestT.toFixed(2)} |`);
console.log(`| load | ${(mini.loadMs / 1000).toFixed(1)}s | ${(e5.loadMs / 1000).toFixed(1)}s |`);
console.log(`| index (30 exp) | ${mini.idxMs.toFixed(0)}ms | ${e5.idxMs.toFixed(0)}ms |`);
console.log(`| latency (1 dopyt) | ${mini.latencyMs.toFixed(0)}ms | ${e5.latencyMs.toFixed(0)}ms |`);
