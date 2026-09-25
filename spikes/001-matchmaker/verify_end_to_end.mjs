// Spike 001 — End-to-end re-verifikácia: Domain Guard gating + retrieval.
// Otázka: je bezpečnostné zlyhanie (resuscitácia/lítiová → smútok) odstránené
// zapojením Domain Guardu pred retrieval? A aká je zvyšná presnosť retrievalu?

import { pipeline } from '@xenova/transformers';
import { classifyRisk } from '../../src/core/riskDomains.js';

const THRESHOLD = 0.3;

const experiences = [
  { id: 1,  domain: 'hasici',   text: 'Pri zásahu s horiacou lítiovou batériou sme zistili, že poliať ju vodou požiar zhorší. Pomohlo veľa piesku a nechať ju vyhorieť pod kontrolou.' },
  { id: 2,  domain: 'hasici',   text: 'Rádiostanica v panelovej budove vypadla. Pomohol systém optických signálov baterkou cez okno.' },
  { id: 3,  domain: 'hasici',   text: 'Podcenil som kontrolu dýchacieho prístroja pred vstupom do zadymeného priestoru. Odvtedy si tlak kontrolujem dvakrát.' },
  { id: 4,  domain: 'hasici',   text: 'Pri resuscitácii je rozhodujúca neprerušovaná kompresia hrudníka, nie rýchlosť dýchania.' },
  { id: 5,  domain: 'hasici',   text: 'Extrikácia z auta: najprv stabilizovať vozidlo, až potom rezať. Strecha sa reže až po odpojení batérie.' },
  { id: 6,  domain: 'hasici',   text: 'Pri požiari v byte s plastovými oknami sa dym šíri rýchlejšie, než čakáš. Vetrať sme začali až po zaujatí pozície.' },
  { id: 7,  domain: 'turistika', text: 'Otočil som sa tesne pred vrcholom, lebo sa zhoršilo počasie a prišla hmla. Bol to správny krok, o hodinu prišla búrka.' },
  { id: 8,  domain: 'turistika', text: 'V zime som podcenil lavínové riziko na svahu nad tridsať stupňov. Mal som si prečítať lavínovú predpoveď.' },
  { id: 9,  domain: 'turistika', text: 'V horách sa nikdy nechoď sám cez exponovaný terén. Kamarát ti zachráni život.' },
  { id: 10, domain: 'turistika', text: 'Mapa a buzola stále fungujú, aj keď mobil nemá signál. Nosím papierovú mapu ako zálohu.' },
  { id: 11, domain: 'turistika', text: 'Bivak v búrke: nerozkladať stan na hrebeni, ale zísť nižšie do lesa.' },
  { id: 12, domain: 'turistika', text: 'Vodu z potoka vždy prevarím alebo prefiltrujem, aj keď vyzerá čistá.' },
  { id: 13, domain: 'remeslo',  text: 'Trik na rovný rez bez píly: naznač čiaru nožom a drevo zlom pozdĺž vlákien.' },
  { id: 14, domain: 'remeslo',  text: 'Pri lepení dreva platí: čím menej lepidla, tým pevnejší spoj. Hrubá vrstva spoj oslabí.' },
  { id: 15, domain: 'remeslo',  text: 'Tupý nástroj je nebezpečnejší ako ostrý. Brúsenie nástrojov je základ bezpečnosti.' },
  { id: 16, domain: 'remeslo',  text: 'Spoj na pero a drážku drží lepšie než len skrutky, keď je drevo namáhané.' },
  { id: 17, domain: 'remeslo',  text: 'Pred lakovaním drevo vždy prebrúsiť a odmastiť, inak lak opadne.' },
  { id: 18, domain: 'technika', text: 'Git push mi padal, lebo som mal nesprávny remote. Pomohol príkaz git remote -v.' },
  { id: 19, domain: 'technika', text: 'Pri zálohovaní používam pravidlo 3-2-1: tri kópie, dva rôzne médiá, jedna mimo domu.' },
  { id: 20, domain: 'technika', text: 'Nikdy nemaž zálohu, kým neoveríš novú. Overenie je polovica zálohy.' },
  { id: 21, domain: 'technika', text: 'Dlhé bash príkazy píšem do skriptu, nie do histórie — história sa po reštarte stratí.' },
  { id: 22, domain: 'technika', text: 'Problém s premennou prostredia: PATH sa na Windows nastavuje inak ako v bash.' },
  { id: 23, domain: 'zivot',    text: 'Keď som stratil blízkeho človeka, najviac mi pomohlo neskrývať smútok a rozprávať o ňom nahlas.' },
  { id: 24, domain: 'zivot',    text: 'Pri vyhorení v práci som sa naučil povedať nie. Prvýkrát bolo najťažšie.' },
  { id: 25, domain: 'zivot',    text: 'Odpočinok je súčasť práce, nie jej prerušenie.' },
  { id: 26, domain: 'zivot',    text: 'Konflikt s kolegom sme vyriešili, keď sme si sadli a každý povedal, čo potrebuje.' },
  { id:27,  domain: 'zivot',    text: 'Chyba, ktorú som opakoval: čakať, kým bude všetko dokonalé, namiesto toho začať.' },
  { id: 28, domain: 'zivot',    text: 'Peniaze som začal šetriť, až keď som si povedal, na čo konkrétne.' },
  { id: 29, domain: 'zivot',    text: 'Vďačnosť sa prejavuje skutkom, nie slovom.' },
  { id: 30, domain: 'zivot',    text: 'Pri veľkom rozhodnutí mi pomohlo: napíš, čo by si poradil kamošovi v rovnakej situácii.' },
];

// query, ground-truth id, a či je to bezpečnostný dopyt (má byť gated)
const queries = [
  { query: 'Čo robiť, keď horí lítiová batéria?', gt: 1, safety: true },
  { query: 'Ako zvládnuť stratu signálu rádia v budove?', gt: 2, safety: false },
  { query: 'Kedy sa v horách otočiť tesne pred vrcholom?', gt: 7, safety: false },
  { query: 'Ako rovno rezať drevo bez píly?', gt: 13, safety: false },
  { query: 'Git push mi nejde, remote je zle nastavený', gt: 18, safety: false },
  { query: 'Ako prežiť smútok po strate blízkeho človeka?', gt: 23, safety: false },
  { query: 'Ako správne robiť resuscitáciu?', gt: 4, safety: true },
  { query: 'Ako postupovať pri vyslobodení človeka z auta?', gt: 5, safety: false },
];

const noMatchQueries = [
  'Ako pripraviť autentickú thajskú zelenú kari omáčku?',
  'Aký je najlepší spôsob pestovania bonsajov v byte?',
];

function cosineSimilarity(a, b) {
  let dp = 0, m1 = 0, m2 = 0;
  for (let i = 0; i < a.length; i++) { dp += a[i] * b[i]; m1 += a[i] * a[i]; m2 += b[i] * b[i]; }
  const m = Math.sqrt(m1) * Math.sqrt(m2);
  return m === 0 ? 0 : dp / m;
}

console.log('=== END-TO-END: Domain Guard gating + retrieval ===');
const extractor = await pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2');
const embed = async (t) => Array.from((await extractor(t, { pooling: 'mean', normalize: true })).data);
const expVecs = [];
for (const e of experiences) expVecs.push(await embed(e.text));

async function search(query) {
  const q = await embed(query);
  const scored = experiences.map((e, i) => ({ id: e.id, score: cosineSimilarity(q, expVecs[i]) }));
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

console.log('\n--- TEST A: bezpečnostné dopyty (majú byť GATED, nie retrieval) ---');
for (const { query, gt } of queries.filter(q => q.safety)) {
  const risk = classifyRisk(query);
  const raw = await search(query);
  const top = raw[0];
  const gated = risk.level !== null;
  const rawWrong = top.id !== gt;
  console.log(
    `${gated ? '✅ GATED' : '❌ NEGATED'} ${risk.level ?? 'null'} | "${query}"`,
    `→ raw top-1=#${top.id} [${top.score.toFixed(2)}] ${rawWrong ? '(smútok/nepresné)' : '(správne)'}`,
  );
}

console.log('\n--- TEST B: bežné dopyty (retrieval presnosť) ---');
let top1 = 0, normal = 0;
for (const { query, gt } of queries.filter(q => !q.safety)) {
  normal++;
  const raw = await search(query);
  const ok = raw[0].id === gt;
  top1 += ok ? 1 : 0;
  console.log(`${ok ? '✅' : '❌'} "${query}" → top-1=#${raw[0].id} [${raw[0].score.toFixed(2)}]`);
}
console.log(`Presnosť bežných: top-1 = ${top1}/${normal}`);

console.log('\n--- TEST C: no-match (má byť pod prahom) ---');
for (const query of noMatchQueries) {
  const raw = await search(query);
  const max = raw[0].score;
  const below = max < THRESHOLD;
  console.log(`${below ? '✅' : '❌'} "${query}" → max = ${max.toFixed(3)} ${below ? '' : '(fabulácia)'}`);
}

console.log('\n--- TEST D: rozloženie skóre (kalibrácia prahu) ---');
const allScores = [];
for (const { query, gt } of queries) {
  const raw = await search(query);
  const correct = raw.find(r => r.id === gt)?.score;
  const wrong = raw[0].id === gt ? null : raw[0].score;
  if (correct !== undefined) allScores.push({ correct, wrong, query });
}
for (const s of allScores) {
  console.log(`correct=${s.correct.toFixed(2)} wrong_top1=${s.wrong === null ? '-' : s.wrong.toFixed(2)} | ${s.query.slice(0, 40)}`);
}
