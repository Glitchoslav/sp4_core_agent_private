import { CONTAMINATION_PATTERNS } from '../ruleMiner.js';

const mustMatch = [
  'SP4OC je aktívny token',
  'SP4OC je už aktívny komunitný token.',
  'SP4OC už funguje',
  'SP4OC má cenu 5 €',
  'SP4OC sa obchoduje na burze',
  'SP4OC je na blockchaine',
  'SP4OC garantuje výnos',
  'SP4OC sa reálne ťaží',
  'SP4OT je tokenizovaný governance',
];

const mustNotMatch = [
  'SP4OC zatiaľ nie je aktívny token',
  'SP4OC dnes nie je aktívny token.',
  'SP4OC je plánovaný koncept',
  'SP4OC zatiaľ nemá žiadnu cenu.',
  'SP4OC sa dnes neobchoduje',
  'SP4OC nemá potvrdenú cenu',
  'SP4OC nie je na blockchaine',
  'SP4OC sa ešte reálne neťaží',
  'SP4OC negarantuje výnos',
  'SP4OC sa v budúcnosti môže ťažiť len ako herná metafora',
  'V budúcnosti by SP4OC mohlo byť odmenou.',
];

function isContaminated(text) {
  return CONTAMINATION_PATTERNS.some((pattern) => pattern.test(text));
}

let failed = 0;

for (const text of mustMatch) {
  const matched = isContaminated(text);
  console.log(`${matched ? 'PASS' : 'FAIL'} must match: ${text}`);
  if (!matched) failed++;
}

for (const text of mustNotMatch) {
  const matched = isContaminated(text);
  console.log(`${!matched ? 'PASS' : 'FAIL'} must not match: ${text}`);
  if (matched) failed++;
}

console.log(`SP4OC contamination patterns: ${mustMatch.length + mustNotMatch.length - failed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;