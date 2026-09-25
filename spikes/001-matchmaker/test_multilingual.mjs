// Multilingválna alternatíva — overenie, či výmena modelu opraví Matchmaker.
// Rovnaké dáta ako test.mjs, iný embedding model.

import { pipeline } from '@xenova/transformers';

const THRESHOLD = 0.3;

const experiences = [
  { id: 1,  domain: 'hasici',   verification: 'overene',         daysAgo: 20,  text: 'Pri zásahu s horiacou lítiovou batériou sme zistili, že poliať ju vodou požiar zhorší. Pomohlo veľa piesku a nechať ju vyhorieť pod kontrolou.' },
  { id: 2,  domain: 'hasici',   verification: 'osobna_skusenost', daysAgo: 45, text: 'Rádiostanica v panelovej budove vypadla. Pomohol systém optických signálov baterkou cez okno.' },
  { id: 3,  domain: 'hasici',   verification: 'osobna_skusenost', daysAgo: 10, text: 'Podcenil som kontrolu dýchacieho prístroja pred vstupom do zadymeného priestoru. Odvtedy si tlak kontrolujem dvakrát.' },
  { id: 4,  domain: 'hasici',   verification: 'overene',         daysAgo: 60, text: 'Pri resuscitácii je rozhodujúca neprerušovaná kompresia hrudníka, nie rýchlosť dýchania.' },
  { id: 5,  domain: 'hasici',   verification: 'overene',         daysAgo: 30, text: 'Extrikácia z auta: najprv stabilizovať vozidlo, až potom rezať. Strecha sa reže až po odpojení batérie.' },
  { id: 6,  domain: 'hasici',   verification: 'osobna_skusenost', daysAgo: 90, text: 'Pri požiari v byte s plastovými oknami sa dym šíri rýchlejšie, než čakáš. Vetrať sme začali až po zaujatí pozície.' },
  { id: 7,  domain: 'turistika', verification: 'osobna_skusenost', daysAgo: 15, text: 'Otočil som sa tesne pred vrcholom, lebo sa zhoršilo počasie a prišla hmla. Bol to správny krok, o hodinu prišla búrka.' },
  { id: 8,  domain: 'turistika', verification: 'osobna_skusenost', daysAgo: 5,  text: 'V zime som podcenil lavínové riziko na svahu nad tridsať stupňov. Mal som si prečítať lavínovú predpoveď.' },
  { id: 9,  domain: 'turistika', verification: 'osobna_skusenost', daysAgo: 120, text: 'V horách sa nikdy nechoď sám cez exponovaný terén. Kamarát ti zachráni život.' },
  { id: 10, domain: 'turistika', verification: 'overene',         daysAgo: 40, text: 'Mapa a buzola stále fungujú, aj keď mobil nemá signál. Nosím papierovú mapu ako zálohu.' },
  { id: 11, domain: 'turistika', verification: 'osobna_skusenost', daysAgo: 70, text: 'Bivak v búrke: nerozkladať stan na hrebeni, ale zísť nižšie do lesa.' },
  { id: 12, domain: 'turistika', verification: 'overene',         daysAgo: 100, text: 'Vodu z potoka vždy prevarím alebo prefiltrujem, aj keď vyzerá čistá.' },
  { id: 13, domain: 'remeslo',  verification: 'osobna_skusenost', daysAgo: 200, text: 'Trik na rovný rez bez píly: naznač čiaru nožom a drevo zlom pozdĺž vlákien.' },
  { id: 14, domain: 'remeslo',  verification: 'overene',         daysAgo: 50, text: 'Pri lepení dreva platí: čím menej lepidla, tým pevnejší spoj. Hrubá vrstva spoj oslabí.' },
  { id: 15, domain: 'remeslo',  verification: 'overene',         daysAgo: 80, text: 'Tupý nástroj je nebezpečnejší ako ostrý. Brúsenie nástrojov je základ bezpečnosti.' },
  { id: 16, domain: 'remeslo',  verification: 'overene',         daysAgo: 150, text: 'Spoj na pero a drážku drží lepšie než len skrutky, keď je drevo namáhané.' },
  { id: 17, domain: 'remeslo',  verification: 'osobna_skusenost', daysAgo: 250, text: 'Pred lakovaním drevo vždy prebrúsiť a odmastiť, inak lak opadne.' },
  { id: 18, domain: 'technika', verification: 'osobna_skusenost', daysAgo: 3,  text: 'Git push mi padal, lebo som mal nesprávny remote. Pomohol príkaz git remote -v.' },
  { id: 19, domain: 'technika', verification: 'overene',         daysAgo: 30, text: 'Pri zálohovaní používam pravidlo 3-2-1: tri kópie, dva rôzne médiá, jedna mimo domu.' },
  { id: 20, domain: 'technika', verification: 'osobna_skusenost', daysAgo: 12, text: 'Nikdy nemaž zálohu, kým neoveríš novú. Overenie je polovica zálohy.' },
  { id: 21, domain: 'technika', verification: 'osobna_skusenost', daysAgo: 60, text: 'Dlhé bash príkazy píšem do skriptu, nie do histórie — história sa po reštarte stratí.' },
  { id: 22, domain: 'technika', verification: 'osobna_skusenost', daysAgo: 90, text: 'Problém s premennou prostredia: PATH sa na Windows nastavuje inak ako v bash.' },
  { id: 23, domain: 'zivot',    verification: 'osobna_skusenost', daysAgo: 400, text: 'Keď som stratil blízkeho človeka, najviac mi pomohlo neskrývať smútok a rozprávať o ňom nahlas.' },
  { id: 24, domain: 'zivot',    verification: 'osobna_skusenost', daysAgo: 180, text: 'Pri vyhorení v práci som sa naučil povedať nie. Prvýkrát bolo najťažšie.' },
  { id: 25, domain: 'zivot',    verification: 'osobna_skusenost', daysAgo: 300, text: 'Odpočinok je súčasť práce, nie jej prerušenie.' },
  { id: 26, domain: 'zivot',    verification: 'osobna_skusenost', daysAgo: 220, text: 'Konflikt s kolegom sme vyriešili, keď sme si sadli a každý povedal, čo potrebuje.' },
  { id: 27, domain: 'zivot',    verification: 'osobna_skusenost', daysAgo: 150, text: 'Chyba, ktorú som opakoval: čakať, kým bude všetko dokonalé, namiesto toho začať.' },
  { id: 28, domain: 'zivot',    verification: 'osobna_skusenost', daysAgo: 500, text: 'Peniaze som začal šetriť, až keď som si povedal, na čo konkrétne.' },
  { id: 29, domain: 'zivot',    verification: 'osobna_skusenost', daysAgo: 350, text: 'Vďačnosť sa prejavuje skutkom, nie slovom.' },
  { id: 30, domain: 'zivot',    verification: 'osobna_skusenost', daysAgo: 45, text: 'Pri veľkom rozhodnutí mi pomohlo: napíš, čo by si poradil kamošovi v rovnakej situácii.' },
];

const queries = [
  { query: 'Čo robiť, keď horí lítiová batéria?', gt: 1 },
  { query: 'Ako zvládnuť stratu signálu rádia v budove?', gt: 2 },
  { query: 'Kedy sa v horách otočiť tesne pred vrcholom?', gt: 7 },
  { query: 'Ako rovno rezať drevo bez píly?', gt: 13 },
  { query: 'Git push mi nejde, remote je zle nastavený', gt: 18 },
  { query: 'Ako prežiť smútok po strate blízkeho človeka?', gt: 23 },
  { query: 'Ako správne robiť resuscitáciu?', gt: 4 },
  { query: 'Ako postupovať pri vyslobodení človeka z auta?', gt: 5 },
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

console.log('=== MULTILINGVÁLNY MODEL: Xenova/paraphrase-multilingual-MiniLM-L12-v2 ===');
const extractor = await pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2');
const embed = async (t) => Array.from((await extractor(t, { pooling: 'mean', normalize: true })).data);

console.log('Model načítaný. Počítam embeddingy...\n');
const expVecs = [];
for (const e of experiences) expVecs.push(await embed(e.text));

async function search(query, topK = 5) {
  const q = await embed(query);
  const scored = experiences.map((e, i) => ({ id: e.id, score: cosineSimilarity(q, expVecs[i]), ...e }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

console.log('--- TEST 1: presnosť ---');
let top1 = 0, top3 = 0;
for (const { query, gt } of queries) {
  const res = await search(query);
  const top1Id = res[0]?.id;
  const top3Ids = res.slice(0, 3).map(r => r.id);
  top1 += top1Id === gt ? 1 : 0;
  top3 += top3Ids.includes(gt) ? 1 : 0;
  console.log(`${top1Id === gt ? '✅' : '❌'} "${query}" → top-1=#${top1Id} [${(res[0]?.score || 0).toFixed(2)}] | top-3=${top3Ids.map(i => '#' + i).join(',')}`);
}
console.log(`\nPresnosť: top-1 = ${top1}/${queries.length}, top-3 = ${top3}/${queries.length}\n`);

console.log('--- TEST 2: no-match ---');
let noMatchPass = 0;
for (const query of noMatchQueries) {
  const res = await search(query, 1);
  const max = res[0]?.score || 0;
  const below = max < THRESHOLD;
  noMatchPass += below ? 1 : 0;
  console.log(`${below ? '✅' : '❌'} "${query}" → max = ${max.toFixed(3)}`);
}
console.log(`\nNo-match odmietnutý: ${noMatchPass}/${noMatchQueries.length}`);
