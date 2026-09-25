import { classifyRisk } from '../../src/core/riskDomains.js';

const cases = [
  // 'o pomoc' falošné pozitíva (pi nahlásil):
  ['prosím o pomoc s domácou úlohou', '(FP: o pomoc príliš široké)'],
  ['poprosil o pomoc kamaráta', '(FP: o pomoc príliš široké)'],
  ['prosba o pomoc', '(FP: o pomoc príliš široké)'],
  ['o pomoc pri sťahovaní', '(FP: o pomoc príliš široké)'],
  // topenie masla edge (pi nahlásil):
  ['topí sa maslo', '(FP: topenie masla, nie človek)'],
  ['topiaci sa maslo', '(FP: topenie masla, nie človek)'],
  // kontrola, že fixy stále držia:
  ['volá o pomoc', '(správne R2: volanie o pomoc)'],
  ['topí sa, volajte pomoc!', '(správne R2)'],
  ['človek sa topí pod ľadom', '(správne R2)'],
];

for (const [t, note] of cases) {
  const r = classifyRisk(t);
  console.log(
    String(r.level).padEnd(6),
    '| domains:', JSON.stringify(r.domains),
    '|', t, note,
  );
}
