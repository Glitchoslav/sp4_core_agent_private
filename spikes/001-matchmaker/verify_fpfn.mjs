import { classifyRisk } from '../../src/core/riskDomains.js';

const cases = [
  ['chcem pomôcť kamarátovi s učením', '(FP očakávaný: pomoc→pomoct)'],
  ['pomoc v domácnosti', '(FP očakávaný: pomoc príliš široké)'],
  ['lanovka na Lomnický štít', '(FP očakávaný: lanov→lanovka)'],
  ['lanový park pre deti', '(FP očakávaný: lanov→lanový)'],
  ['topí sa ľad podľa fyziky', '(FP očakávaný: pod→podľa)'],
  ['podobný prípad topiaceho sa ľadu', '(FP očakávaný: pod→podobný)'],
  ['topiaci sa človek', '(FN očakávaný: nominatív nechytá)'],
  ['padol z lešenia', '(FN doména očakávaná: lesenie≠lešenia)'],
];

for (const [t, note] of cases) {
  const r = classifyRisk(t);
  console.log(
    String(r.level).padEnd(6),
    '| domains:', JSON.stringify(r.domains),
    '|', t, note,
  );
}
